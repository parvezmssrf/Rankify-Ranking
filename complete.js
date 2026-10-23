import {authenticated,sendError,requirePost} from '../../lib/core.js';
export default async function handler(req,res){
 if(!requirePost(req,res))return;
 try{
  const {admin,user}=await authenticated(req);
  const ticket=String(req.body?.ticket||'');
  const outcome=req.body?.outcome==='failed'?'failed':'completed';
  if(!/^[a-f\d-]{36}$/i.test(ticket))return res.status(400).json({error:'Invalid export ticket'});
  const {data,error}=await admin.rpc('finalise_rankify_export',{p_user_id:user.id,p_export_id:ticket,p_outcome:outcome});
  if(error)throw Object.assign(new Error(error.message),{status:403});
  if(!data)return res.status(409).json({error:'Export ticket expired or already completed'});
  res.status(200).json({ok:true});
 }catch(e){sendError(res,e)}
}
