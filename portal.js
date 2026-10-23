import {authenticated,getAccount,getStripe,origin,requirePost,sendError} from '../lib/core.js';
export default async function handler(req,res) {
 if(!requirePost(req,res))return;
 try {
  const {admin,user}=await authenticated(req);
  const account=await getAccount(admin,user.id);
  if(!account?.stripe_customer_id)return res.status(404).json({error:'No billing profile found'});
  const s=await getStripe().billingPortal.sessions.create({
    customer:account.stripe_customer_id,
    configuration:process.env.STRIPE_PORTAL_CONFIG_ID || undefined,
    return_url:`${origin()}/#pricing`
  });
  res.status(200).json({url:s.url});
 }catch(e){sendError(res,e)}
}
