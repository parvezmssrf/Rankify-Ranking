import {createClient} from '@supabase/supabase-js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).end();
 try{
  const jwt=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!jwt)return res.status(401).json({error:'Sign in first'});
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_ANON_KEY)return res.status(503).json({error:'Account service unavailable'});
  const auth=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${jwt}`}}});
  const {data:{user},error}=await auth.auth.getUser(jwt);
  if(error||!user)return res.status(401).json({error:'Please sign in again'});
  const {data:row,error:readError}=await auth.from('billing_accounts').select('*').eq('user_id',user.id).maybeSingle();
  if(readError)throw readError;
  res.status(200).json({email:user.email,plan:row?.plan||'none',status:row?.status||'inactive',
  exportsLeft:Math.max(0,(row?.quota_limit||0)-(row?.quota_used||0)),quotaLimit:row?.quota_limit||0,quotaUsed:row?.quota_used||0,
  trialEnd:row?.trial_end||null,periodEnd:row?.period_end||null,cancelAtPeriodEnd:!!row?.cancel_at_period_end,hasBilling:!!row?.stripe_customer_id});
 }catch(e){console.error('Rankify auth status error:',e?.message);res.status(500).json({error:'Could not retrieve account status'})}
}
