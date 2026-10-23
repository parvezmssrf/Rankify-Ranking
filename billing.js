/* Rankify billing bridge. All card details are handled on Stripe-hosted Checkout. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 let client=null, config=null, pendingPlan=null, session=null, status=null;
 const isLocal=location.protocol==='file:';
 const show=(message)=>{
   const target=$('accountMessage');
   if(target){target.textContent=message;target.hidden=false;}
 };
 const clear=()=>{if($('accountMessage'))$('accountMessage').hidden=true};
 const setAuthUI=()=>{
  $('accountButton').textContent=session?.user?`Account: ${session.user.email.split('@')[0]}`:'Sign in / Sign up';
  $('billingManage').hidden=!status?.hasBilling;
  $('logoutBtn').hidden=!session;
  const eligible=status?.status==='trialing'||status?.status==='active';
  $('billingStatus').textContent=!config?.authReady?'Secure account connection is being prepared':eligible?`${status.plan.toUpperCase()} · ${status.exportsLeft}/${status.quotaLimit} exports left`:(session?'No active subscription':'Subscribe to export');
 };
 const token=async()=>{
  if(!client)throw Error('Account service is not configured yet');
  const {data,error}=await client.auth.getSession();
  if(error||!data?.session?.access_token)throw Error('Sign in to your account first');
  session=data.session;
  return session.access_token;
 };
 const request=async(path,body)=>{
  const auth=await token();
  const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${auth}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||`Request failed (${response.status})`);
  return data;
 };
 async function refresh(){
   if(!session){status=null;setAuthUI();return}
   try{status=await request('/api/status')}catch(e){status=null;show(e.message)}
   setAuthUI();
 }
 function openAuth(){ $('authOverlay').hidden=false;$('authEmail').focus(); }
 function closeAuth(){ $('authOverlay').hidden=true;clear(); }
 $('authClose').onclick=closeAuth;
 $('authOverlay').addEventListener('click',e=>{if(e.target===$('authOverlay'))closeAuth()});
 $('accountButton').onclick=()=>openAuth();
 $('logoutBtn').onclick=async()=>{if(client)await client.auth.signOut();session=null;status=null;setAuthUI();closeAuth()};
 $('authSignIn').onclick=async()=>{
  clear();if(!client)return show('Account sign-in is not configured yet.');
  const email=$('authEmail').value.trim(),password=$('authPassword').value;
  if(!email||!password)return show('Email and password are required');
  try{
   const result=await client.auth.signInWithPassword({email,password});
   if(result.error)throw result.error;
   session=result.data.session;
   await refresh();closeAuth();
   if(pendingPlan){const p=pendingPlan;pendingPlan=null;await startCheckout(p)}
  }catch(e){show(e.message)}
 };
 $('authSignUp').onclick=async()=>{
  clear();if(!client)return show('Account registration is not configured yet.');
  const email=$('authEmail').value.trim(),password=$('authPassword').value;
  if(!email||password.length<8)return show('Enter your email and a password at least 8 characters long');
  try{
   const result=await client.auth.signUp({email,password});
   if(result.error)throw result.error;
   session=result.data.session;
   if(session){await refresh();closeAuth();if(pendingPlan){const p=pendingPlan;pendingPlan=null;await startCheckout(p)}}
   else show('Account created. Confirm your email using the message Supabase sent, then sign in.');
  }catch(e){show(e.message)}
 };
 $('billingManage').onclick=async()=>{
  try{const {url}=await request('/api/portal',{});location.assign(url)}
  catch(e){show(e.message);openAuth()}
 };
 async function startCheckout(choice){
   const plan=choice==='trial'?'creator':choice;
   if(!session){pendingPlan=plan;openAuth();return}
   if(!config?.paymentsReady)return showBillingNotice(`Your ${plan==='creator'?'Creator':plan==='pro'?'Pro':'Studio'} plan is selected. Your account is ready; secure Stripe Checkout will open after the final billing and cancellation tests. No card will be charged at this stage.`);
   try{
    const data=await request('/api/checkout',{plan});
    if(!data?.url||!data.url.startsWith('https://'))throw Error('Checkout URL missing');
    location.assign(data.url);
   }catch(e){showBillingNotice(e.message)}
 }
 function showBillingNotice(message){
   $('modalTitle').textContent='Payment setup';$('modalDetails').textContent=message;
   $('checkoutModal').hidden=false;
 }
 for(const btn of document.querySelectorAll('.trial-action')){
  btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();startCheckout(btn.dataset.plan)},true);
 }
 // Only a completed MP4 export should be charged against the allowance.
 window.rankifyBilling={
  async reserve(){
   if(isLocal){return null} // offline demo; never treated as a paid deployment
   const data=await request('/api/export/start',{});
   if(!data.ticket)throw Error('No exports remaining');
   return data.ticket;
  },
  async finish(ticket,outcome='completed'){
   if(!ticket)return;
   await request('/api/export/complete',{ticket,outcome});
   await refresh();
  }
 };
 (async()=>{
  try{
   const response=await fetch('/api/public-config',{cache:'no-store'});
   if(!response.ok)throw Error('Server not configured');
   config=await response.json();
   if(config.authReady){
    if(!window.supabase?.createClient)throw Error('Supabase browser SDK could not load');
    client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);
    const {data}=await client.auth.getSession();session=data?.session||null;
    client.auth.onAuthStateChange((_event,newSession)=>{session=newSession;refresh()});
    await refresh();
   } else { $('billingStatus').textContent='Secure account connection is being prepared'; }
  }catch(_e){$('billingStatus').textContent='Secure account connection is being prepared'}
  if(new URLSearchParams(location.search).has('checkout')){
   if(new URLSearchParams(location.search).get('checkout')==='success')
      showBillingNotice('Checkout was completed. Subscription access appears when Stripe confirms it through the secure webhook. Refresh your account status if it takes a moment.');
  }
  setAuthUI();
 })();
})();
