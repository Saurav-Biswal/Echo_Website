import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { validateLeadPayload } from '../lib/lead-validation.mjs';
import { verifiedFounderFacts } from '../lib/echo-guide-knowledge.mjs';
import { getAndroidDownloadUrl } from '../lib/android-download.mjs';

const root = new URL('../', import.meta.url);
test('Android download URL is trimmed when configured and safely empty when missing', () => {
  const releaseUrl = 'https://github.com/Saurav-Biswal/Echo_Website/releases/download/v1.0.0/app-release.apk';
  assert.equal(getAndroidDownloadUrl(` ${releaseUrl} `), releaseUrl);
  assert.equal(getAndroidDownloadUrl(releaseUrl), releaseUrl);
  assert.equal(getAndroidDownloadUrl(''), '');
  assert.equal(getAndroidDownloadUrl('   '), '');
  assert.equal(getAndroidDownloadUrl(undefined), '');
});
test('homepage and main navigation render an accessible direct Android download when configured', async () => {
  const config = await readFile(new URL('config/site.ts', root), 'utf8');
  const home = await readFile(new URL('components/home-page.tsx', root), 'utf8');
  const chrome = await readFile(new URL('components/chrome.tsx', root), 'utf8');
  assert.match(config, /getAndroidDownloadUrl\(process\.env\.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL\)/);
  assert.match(home, /site\.androidDownloadUrl\s*&&\s*<a[^>]*href=\{site\.androidDownloadUrl\}[^>]*aria-label="Download Echo for Android"[^>]*>Download Echo for Android/s);
  assert.match(chrome, /site\.androidDownloadUrl\s*&&\s*<a[^>]*href=\{site\.androidDownloadUrl\}[^>]*aria-label="Download Echo for Android"[^>]*>Download Echo for Android/s);
});
test('all required public page route slugs are present', async()=>{
  const file=await readFile(new URL('components/site-pages.tsx',root),'utf8');
  for(const slug of ['product','features','how-it-works','pricing','about','contact','early-access','faq','blog','privacy','privacy-notice','privacy-requests','terms','cookies','security','delete-account'])assert.match(file,new RegExp(`['"]?${slug.replaceAll('-','\\-')}['"]?:\\{`));
});
test('homepage layouts collapse safely across tablet and phone widths', async () => {
  const css = await readFile(new URL('app/globals.css', root), 'utf8');
  assert.match(css, /@media \(min-width: 761px\) and \(max-width: 900px\) \{[\s\S]*?\.menu-toggle \{ display: inline-flex/);
  assert.match(css, /\.home-founders-inner \{[^}]*grid-template-columns: 1fr/s);
  assert.match(css, /\.hero-actions \{[^}]*flex-direction: column/s);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('founder story is directly routable and discoverable from homepage and navigation', async () => {
  const routes = await readFile(new URL('app/[slug]/page.tsx', root), 'utf8');
  const pages = await readFile(new URL('components/site-pages.tsx', root), 'utf8');
  const chrome = await readFile(new URL('components/chrome.tsx', root), 'utf8');
  const home = await readFile(new URL('components/home-page.tsx', root), 'utf8');
  assert.match(routes, /generateStaticParams\(\)\s*\{\s*return pageKeys\(\)/);
  assert.match(pages, /if\(slug==='about'\)return <AboutFounderExperience\/>/);
  assert.match(chrome, /\['Founders','\/about'\]/);
  assert.match(home, /href="\/about"/);
  assert.match(home, /className="home-founders"/);
});
test('About tells the founder story with confirmed facts and the animated CSS/SVG scene',async()=>{
  const pages=await readFile(new URL('components/about-founder-experience.tsx',root),'utf8');
  assert.match(pages,/Two founders\. One idea: remember what matters\./);
  assert.match(pages,/Saved somewhere\. Lost everywhere\./);
  assert.match(pages,/What if what mattered could find its way back/);
  assert.match(pages,/verifiedFounderFacts\.founders\.map/);
  assert.match(pages,/verifiedFounderFacts\.founded/);
  assert.equal(verifiedFounderFacts.founders[0].name,'Shivam Chouthe');
  assert.equal(verifiedFounderFacts.founders[0].role,'Founder');
  assert.equal(verifiedFounderFacts.founders[0].age,20);
  assert.equal(verifiedFounderFacts.founders[1].name,'Saurav Biswal');
  assert.equal(verifiedFounderFacts.founders[1].role,'Founder');
  assert.equal(verifiedFounderFacts.founders[1].age,20);
  assert.equal(verifiedFounderFacts.founded,'October 2026');
  assert.match(pages,/Join early access/);
  assert.ok(pages.indexOf('story-founders') < pages.indexOf('ask-echo-story'));
  assert.ok(pages.indexOf('ask-echo-story') < pages.indexOf('story-portal'));
  assert.match(pages,/EchoGuideHomeTrigger/);
  assert.match(pages,/not a claim that every capability is live today/);
  assert.doesNotMatch(pages,/Choudhary|university|investor|registered company/i);
  const scene=await readFile(new URL('components/founder-orbit-scene.tsx',root),'utf8');
  assert.match(scene,/IntersectionObserver/);assert.match(scene,/data-active="false"/);assert.match(scene,/aria-label=/);
  assert.match(scene,/portal-ring-outer/);assert.match(scene,/portal-card-video/);assert.match(scene,/pointermove/);
  const css=await readFile(new URL('app/globals.css',root),'utf8');
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/@keyframes portal-breathe/);assert.match(css,/@keyframes portal-float-a/);
  assert.match(css,/@media \(max-width: 380px\)/);
  assert.match(css,/@media \(max-width: 680px\)/);
  const home=await readFile(new URL('components/home-page.tsx',root),'utf8');
  assert.match(home,/href="\/about">Meet the people building Echo/);
});
test('collection notice and privacy request paths are linked to forms and auth',async()=>{
  const forms=await readFile(new URL('components/forms.tsx',root),'utf8');
  assert.match(forms,/collection-notice/);assert.match(forms,/privacy-notice/);assert.match(forms,/privacy-requests/);
  const pages=await readFile(new URL('components/site-pages.tsx',root),'utf8');
  assert.match(pages,/defaultSubject="Privacy rights request"/);assert.match(pages,/auth-legal-links/);
  const chrome=await readFile(new URL('components/chrome.tsx',root),'utf8');assert.match(chrome,/Privacy requests.*\/privacy-requests/);
});
test('legal pages remain drafts and use the configured support contact safely',async()=>{
  const legal=await readFile(new URL('components/legal-pages.tsx',root),'utf8');
  assert.match(legal,/DRAFT/);assert.match(legal,/not.*automatically/i);assert.match(legal,/mailto:\$\{site\.supportEmail\}/);
  const config=await readFile(new URL('config/site.ts',root),'utf8');assert.match(config,/NEXT_PUBLIC_SUPPORT_EMAIL\?\.trim\(\) \|\| 'echowithss@gmail\.com'/);
  assert.doesNotMatch(config,/example\.invalid/);
  const example=await readFile(new URL('.env.example',root),'utf8');assert.match(example,/^NEXT_PUBLIC_SUPPORT_EMAIL=echowithss@gmail\.com$/m);
  const knowledge=await readFile(new URL('lib/echo-guide-knowledge.mjs',root),'utf8');
  const ai=await readFile(new URL('lib/echo-guide-ai.mjs',root),'utf8');
  assert.match(knowledge,/echowithss@gmail\.com/);assert.match(ai,/echowithss@gmail\.com/);
  assert.doesNotMatch([config,example,knowledge,ai,legal].join('\n'),new RegExp(['echo','_with_ss@gmail.com'].join('')));
  const chrome=await readFile(new URL('components/chrome.tsx',root),'utf8');assert.match(chrome,/mailto:\$\{site\.supportEmail\}/);
  const pages=await readFile(new URL('components/site-pages.tsx',root),'utf8');assert.match(pages,/Email Echo directly at/);
});
test('pricing is centralized and marked proposed',async()=>{
  const config=await readFile(new URL('config/site.ts',root),'utf8');
  assert.match(config,/₹99 \/ month/);assert.match(config,/Proposed pricing/);
  const page=await readFile(new URL('components/site-pages.tsx',root),'utf8');assert.match(page,/plans\.premium\.monthly/);assert.match(page,/coming soon/i);
});
test('no real environment file or secret is included',async()=>{
  const example=await readFile(new URL('.env.example',root),'utf8');
  assert.match(example,/SUPABASE_SECRET_KEY=/);assert.match(example,/SUPABASE_SERVICE_ROLE_KEY=/);assert.match(example,/NEXT_PUBLIC_FIREBASE_API_KEY=/);
  for(const key of ['NEXT_PUBLIC_FIREBASE_API_KEY','NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN','NEXT_PUBLIC_FIREBASE_APP_ID','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY'])assert.match(example,new RegExp(`^${key}=$`,'m'));
});
test('Supabase write client is server-only and prefers the new secret variable',async()=>{
  const client=await readFile(new URL('lib/supabase-server.ts',root),'utf8');
  assert.match(client,/import 'server-only'/);assert.match(client,/SUPABASE_SECRET_KEY \|\| process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(client,/NEXT_PUBLIC_SUPABASE_(SECRET|SERVICE_ROLE)_KEY/);
});
test('provided logo asset is used in the site chrome, favicon and social preview',async()=>{
  const image=await stat(new URL('public/echo-logo.png',root));assert.ok(image.size>1000);
  const chrome=await readFile(new URL('components/chrome.tsx',root),'utf8');assert.equal((chrome.match(/\/echo-logo\.png/g)||[]).length,2);
  const layout=await readFile(new URL('app/layout.tsx',root),'utf8');assert.match(layout,/icons: \{ icon: '\/echo-logo\.png', apple: '\/echo-logo\.png' \}/);
  const social=await readFile(new URL('app/opengraph-image.tsx',root),'utf8');assert.match(social,/echo-logo\.png/);
});
test('waitlist validation normalizes email and limits optional fields',()=>{
  const result=validateLeadPayload({kind:'waitlist',email:' Person@Example.COM ',name:'  Ada  ',useCase:'x'.repeat(700),consent:'yes'},'2026-10-09T00:00:00.000Z');
  assert.equal(result.ok,true);if(result.ok){assert.equal(result.email,'person@example.com');assert.equal(result.record.name,'Ada');assert.equal(result.record.use_case.length,600);assert.equal(result.record.consent_at,'2026-10-09T00:00:00.000Z')}
});
test('form validation rejects malformed email, missing consent and incomplete contact requests',()=>{
  assert.equal(validateLeadPayload({kind:'waitlist',email:'nope',consent:'yes'},'now').ok,false);
  assert.equal(validateLeadPayload({kind:'waitlist',email:'person@example.com'},'now').ok,false);
  assert.equal(validateLeadPayload({kind:'contact',email:'person@example.com',consent:'yes',subject:'General',message:' '},'now').ok,false);
});
