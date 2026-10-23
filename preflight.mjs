import { readFileSync, existsSync } from 'node:fs';
const required=['index.html','assets/billing.js','assets/rankify-logo.png','api/checkout.js','api/webhook.js','api/portal.js','api/export/start.js','api/export/complete.js','legal/privacy.html','legal/terms.html','legal/refunds.html','legal/cancellation.html'];
let fail=false;
for(const p of required){if(!existsSync(p)){console.error('MISSING:',p);fail=true}}
const gitignore=readFileSync('.gitignore','utf8');
for(const p of ['.env','node_modules']) if(!gitignore.includes(p)){console.error('gitignore missing:',p);fail=true}
const html=readFileSync('index.html','utf8');
if(!html.includes('Font') || !html.includes('font')){console.error('Review font studio integration');fail=true}
if(fail)process.exit(1);
console.log('Static preflight passed. NOT a substitute for end-to-end auth, billing and video export testing.');
