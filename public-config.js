export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).end();
  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_URL.includes('YOUR-'));
  res.status(200).json({
    authReady:configured,
    paymentsReady:configured && process.env.CHECKOUT_ENABLED==='true' && process.env.LEGAL_REVIEWED==='true' && Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPPORT_EMAIL),
    supabaseUrl:configured?process.env.SUPABASE_URL:null,
    supabaseAnonKey:configured?process.env.SUPABASE_ANON_KEY:null
  });
}
