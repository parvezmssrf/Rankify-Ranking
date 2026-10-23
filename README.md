# Rankify Ranking v3 – Hosted editor and subscription integration

- Logo embedded in website and policy pages; also included as assets/rankify-logo.png.
- Supabase Auth live via Vercel environment variables (public project URL/key).
- Stripe subscription plans already exist in live catalogue. Checkout remains gated.
- Public billing status reads only each user\'s own row via RLS.
- Secure Stripe Checkout / webhook / export API handlers included but require server-only secrets set directly in Vercel.
- Publishable keys are safe in browser; NEVER put Stripe secret or Supabase secret in source.
- Test signup, editor and plan buttons. Do not enable CHECKOUT_ENABLED before all payments/security tests.

Vercel project: rankify-ranking, Supabase: mrwzzvndyuncsrwsuhkq.
