import {authenticated,sendError,requirePost} from '../../lib/core.js';
export default async function handler(req,res){
 if(!requirePost(req,res))return;
 try{
  const {admin,user}=await authenticated(req);
  const {data,error}=await admin.rpc('reserve_rankify_export',{p_user_id:user.id});
  if(error)throw Object.assign(new Error(error.message),{status:403});
  if(!data)throw Object.assign(new Error('An active subscription with remaining exports is required'),{status:403});
  res.status(200).json({ticket:data});
 }catch(e){sendError(res,e)}
}
