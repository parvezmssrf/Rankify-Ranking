# Rankify Ranking — Production launch gates

## Accounts & deployment
- [ ] Create PRIVATE repository under your GitHub account (do not copy similarly named public projects).
- [ ] Push project files, keeping `.env` and all private keys out of Git.
- [ ] Grant Vercel access to the Rankify team and connect GitHub `main` to Vercel.
- [ ] Confirm live production root, logo, mobile layout, and all legal pages.

## Payments and identity
- [ ] Configure Supabase Auth redirect URLs, email verification, and account recovery.
- [ ] Store Stripe secret, webhook secret and Supabase service-role secret in Vercel only.
- [ ] Configure webhook endpoint `/api/webhook` (this is the implemented path; not `/api/stripe-webhook`).
- [ ] Test checkout, first trial, trial abuse prevention, upgrades, cancellations, renewal, declined card and duplicate/out-of-order webhooks.
- [ ] Confirm Stripe tax, Australian business details, business email and consumer-law-compliant refund/renewal language.
- [ ] Test server-side quotas, concurrency, abandoned exports, and failed exports.
- [ ] Leave `CHECKOUT_ENABLED=false` and `LEGAL_REVIEWED=false` until tests and review pass.

## Product
- [ ] Test real MP4 output with multiple clips, audio, long durations, font variants and resolution options on mobile and desktop.
- [ ] Test link embeds separately; an embedded social video is not necessarily downloadable/exportable.
- [ ] Verify text controls, project save/reload, errors, accessibility and user feedback.
- [ ] Add analytics, monitoring, support workflow and data retention/deletion processes.

## Viblo.ai comparison (publicly advertised features; not implemented by this checklist)
- Video ranking: Rankify core priority.
- Auto captions, AI voiceover, automatic highlights, commentary editor, split-screen and templates: candidate future releases.
- Brand kits, batch export and project timeline: high-value expansion.
- AI video/image generation: expensive and nonessential for first paid launch.

Do not claim these competitor features exist in Rankify until built and tested.
