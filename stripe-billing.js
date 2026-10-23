import {getStripe,getAdmin,PRICE_INFO,planForPrice,stripeDate} from './core.js';

export async function syncSubscription(subscription, hintedUserId = null) {
  const admin = getAdmin();
  const stripe = getStripe();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (!customerId) throw new Error('Subscription customer missing');
  let userId = hintedUserId || subscription.metadata?.user_id;
  if (!userId) {
    const {data,error} = await admin.from('billing_accounts').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
    if (error) throw error;
    userId = data?.user_id;
  }
  if (!userId) throw new Error('Cannot match Stripe subscription to a Rankify user');
  const stripePrice = subscription.items?.data?.[0]?.price;
  const priceId = typeof stripePrice === 'string' ? stripePrice : stripePrice?.id;
  const plan = planForPrice(priceId);
  if (!plan) throw new Error('Unknown Stripe subscription price');
  const existingResult = await admin.from('billing_accounts').select('*').eq('user_id',userId).maybeSingle();
  if (existingResult.error) throw existingResult.error;
  const existing = existingResult.data;
  const periodStartUnix = subscription.items?.data?.[0]?.current_period_start ?? subscription.current_period_start;
  const periodEndUnix = subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end;
  const periodStart = stripeDate(periodStartUnix) || stripeDate(subscription.trial_start) || new Date().toISOString();
  const periodEnd = stripeDate(periodEndUnix) || stripeDate(subscription.trial_end);
  const status = subscription.status;
  const allowed = ['trialing','active'].includes(status);
  const quotaLimit = !allowed ? 0 : status==='trialing' ? 10 : PRICE_INFO[plan].quota;
  // New billing period or first transition from trial to active -> new monthly allowance.
  const newPeriod = !existing || existing.period_start !== periodStart || (existing.status==='trialing' && status==='active') || (existing.stripe_subscription_id!==subscription.id);
  const payload = {
    user_id:userId,
    stripe_customer_id:customerId,
    stripe_subscription_id:subscription.id,
    plan,
    status,
    trial_end:stripeDate(subscription.trial_end),
    period_start:periodStart,
    period_end:periodEnd,
    access_ends_at:periodEnd,
    quota_limit:quotaLimit,
    quota_used:newPeriod ? 0 : (existing?.quota_used || 0),
    has_used_trial:existing?.has_used_trial || status==='trialing' || Boolean(subscription.trial_start),
    cancel_at_period_end:!!subscription.cancel_at_period_end,
    updated_at:new Date().toISOString()
  };
  const {error}=await admin.from('billing_accounts').upsert(payload,{onConflict:'user_id'});
  if(error)throw error;
  return payload;
}

export async function syncFromStripe(subscriptionId, hintedUserId=null) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId,{expand:['items.data.price']});
  return syncSubscription(subscription,hintedUserId);
}
