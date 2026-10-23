import {getStripe,getAdmin,sendError} from '../lib/core.js';
import {syncFromStripe} from '../lib/stripe-billing.js';
// Vercel serverless request handling: disable automatic body parsing to verify the raw Stripe signature.
export const config={api:{bodyParser:false}};
async function rawBody(req){const chunks=[];for await (const chunk of req)chunks.push(typeof chunk==='string'?Buffer.from(chunk):chunk);return Buffer.concat(chunks)}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).end();
 let event;
 try{const stripe=getStripe();const body=await rawBody(req);event=stripe.webhooks.constructEvent(body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET)}
 catch(e){return res.status(400).json({error:'Invalid webhook signature'})}
 try{
  const admin=getAdmin();
  const {data:seen,error:seenError}=await admin.from('stripe_events').select('id').eq('id',event.id).maybeSingle();
  if(seenError)throw seenError;
  if(seen)return res.json({received:true,duplicate:true});
  const obj=event.data.object;
  if(event.type==='checkout.session.completed'&&obj.mode==='subscription'&&obj.subscription){
    await syncFromStripe(typeof obj.subscription==='string'?obj.subscription:obj.subscription.id,obj.client_reference_id||obj.metadata?.user_id);
  }
  if(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
    await syncFromStripe(obj.id);
  }
  if(['invoice.paid','invoice.payment_failed'].includes(event.type)){
    const sub=obj.subscription || obj.parent?.subscription_details?.subscription;
    if(sub)await syncFromStripe(typeof sub==='string'?sub:sub.id);
  }
  const {error}=await admin.from('stripe_events').insert({id:event.id,type:event.type});
  if(error && error.code!=='23505')throw error;
  return res.status(200).json({received:true});
 }catch(e){console.error('Rankify Stripe webhook processing failed',event.type,e);return res.status(500).json({error:'Webhook processing failed; Stripe should retry'})}
}
