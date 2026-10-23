import {authenticated,getAccount,getStripe,PRICE_INFO,origin,requirePost,requireReady,sendError} from '../lib/core.js';
export default async function handler(req,res) {
  if(!requirePost(req,res))return;
  try {
    requireReady();
    const {admin,user}=await authenticated(req);
    const plan=String(req.body?.plan||'').toLowerCase();
    if(!['creator','pro','studio'].includes(plan))return res.status(400).json({error:'Unknown plan'});
    const account=await getAccount(admin,user.id);
    if(account && ['trialing','active'].includes(account.status))
      return res.status(409).json({error:'You already have an active subscription. Use Manage Billing.'});
    const stripe=getStripe();
    const customer=account?.stripe_customer_id || (await stripe.customers.create({email:user.email,metadata:{user_id:user.id,app:'rankify-ranking'}})).id;
    const hasUsedTrial=!!account?.has_used_trial;
    if(!account?.stripe_customer_id) {
      const {error}=await admin.from('billing_accounts').upsert({user_id:user.id,stripe_customer_id:customer,has_used_trial:hasUsedTrial},{onConflict:'user_id'});
      if(error)throw error;
    }
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',
      customer,
      client_reference_id:user.id,
      line_items:[{price:PRICE_INFO[plan].price,quantity:1}],
      payment_method_collection:'always',
      consent_collection:{terms_of_service:'required'},
      billing_address_collection:'required',
      ...(process.env.STRIPE_AUTOMATIC_TAX==='true'?{automatic_tax:{enabled:true}}:{}),
      metadata:{user_id:user.id,plan,app:'rankify-ranking'},
      subscription_data:{metadata:{user_id:user.id,plan,app:'rankify-ranking'}, ...((plan==='creator'&&!hasUsedTrial)?{trial_period_days:7}:{})},
      success_url:`${origin()}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${origin()}/?checkout=canceled`,
    });
    res.status(200).json({url:session.url});
  }catch(e){sendError(res,e)}
}
