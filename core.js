import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const required = name => {
  const value = process.env[name];
  if (!value || value.includes('REPLACE') || value.includes('YOUR-')) throw new Error(`${name} is not configured`);
  return value;
};
export const PRICE_INFO = {
  creator: { price: process.env.STRIPE_CREATOR_PRICE_ID, quota: 30 },
  pro: { price: process.env.STRIPE_PRO_PRICE_ID, quota: 100 },
  studio: { price: process.env.STRIPE_STUDIO_PRICE_ID, quota: 300 }
};
export function planForPrice(priceId) {
  return Object.keys(PRICE_INFO).find(plan => PRICE_INFO[plan].price && PRICE_INFO[plan].price === priceId) || null;
}
export function getStripe() { return new Stripe(required('STRIPE_SECRET_KEY')); }
export function getAdmin() {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
export async function authenticated(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Please sign in first'), { status: 401 });
  const admin = getAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw Object.assign(new Error('Your login expired; sign in again'), { status: 401 });
  return { admin, user: data.user };
}
export function origin() {
  const url = required('PUBLIC_SITE_URL');
  if (!url.startsWith('https://') && !url.startsWith('http://localhost:')) throw new Error('PUBLIC_SITE_URL must use HTTPS');
  return url.replace(/\/$/, '');
}
export function sendError(res, err) {
  // Do not leak keys or database details in production errors.
  if (process.env.NODE_ENV !== 'production') console.error(err);
  return res.status(err.status || 500).json({ error: err.status ? err.message : 'Server configuration or request failed' });
}
export function requirePost(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return false; }
  return true;
}
export function requireReady() {
  if (process.env.CHECKOUT_ENABLED !== 'true' || process.env.LEGAL_REVIEWED !== 'true')
    throw Object.assign(new Error('Payments are not open yet'), { status: 503 });
  required('SUPPORT_EMAIL'); origin(); required('STRIPE_WEBHOOK_SECRET');
}
export function stripeDate(ts) { return ts ? new Date(ts * 1000).toISOString() : null; }
export async function getAccount(admin, userId) {
  const { data, error } = await admin.from('billing_accounts').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}
