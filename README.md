# Echo website

An isolated website project for Echo. It does not include or modify the Android app or its backend.

## Project status

The founder-provided logo is used in the website chrome, favicon and social preview. Website copy is deliberately conservative: Android capabilities, cloud operation, data flows, billing and launch status remain unverified. A separate local Android source checkout was inspected read-only for the DPDP readiness review; it does not prove that its backend is deployed or supported. Proposed prices appear only as planned and no purchase flow is present. The product preview is an illustrative concept. See [docs/DPDP_READINESS_CHECKLIST.md](docs/DPDP_READINESS_CHECKLIST.md) for verified source facts and launch blockers.

## Run locally

Requirements: Node.js 20.9+ and npm.

```powershell
npm ci --cache .npm-cache
Copy-Item .env.example .env.local
npm run dev
```

The project-local npm cache is ignored by Git. It can be omitted on machines where the default npm cache is writable.

Open http://localhost:3000. The marketing site runs without Firebase or Supabase. Forms show a configuration error until Supabase service credentials are configured. Authentication pages explain setup until a Firebase web app is configured.

## Checks

```powershell
npm test
npm run lint
npm run build
```

The unit tests check route coverage, centralized proposed pricing, placeholder-only environment examples and form input validation. They do not prove live Firebase or Supabase integration. The project does not include browser automation; manually check desktop/mobile navigation, forms and accessibility with real configured services before launch.

## Echo Guide

The public pages include a lazy-loaded Echo Guide with local, website-grounded answers, allowlisted navigation, optional browser speech recognition, and prefill support for the existing forms. Visitors can separately opt in to Groq AI for ordinary chat; form values and deterministic navigation/form flows stay local. Groq needs a server-only `GROQ_API_KEY`, and chat can fall back to local answers when the provider is unavailable. See [docs/ECHO_GUIDE.md](docs/ECHO_GUIDE.md) for limits, privacy behavior, deployment setup and required verification. Review and approve the provider's handling and the draft public disclosure before configuring a production key.

## Firebase web authentication

Use the existing Firebase project ID `com-example-signal-d63fc`; do not create or substitute a different project.

1. In Firebase Console, select project `com-example-signal-d63fc` and confirm the Project ID in **Project settings → General**. Under **Your apps**, select its existing Web app; register one only if none exists. This does not require replacing or modifying the Android app.
2. Copy `apiKey`, `authDomain`, `projectId` and `appId` from its Firebase web config into `.env.local` as `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_APP_ID`. The web API key is designed to be public; protect credentials for other services and apply Firebase restrictions as appropriate.
3. Open **Authentication → Sign-in method**, enable **Email/Password**, and save. The website uses email/password only.
4. Open **Authentication → Settings → Authorized domains** and add `localhost` for local testing if it is absent. Add the final production hostname only after choosing the host/domain. Firebase projects created after April 28, 2025 may not include `localhost` by default.
5. Open **Authentication → Templates** and review the **Email address verification** and **Password reset** templates used by this site. Set the sender name/reply-to and readable subjects/body. Keep the Firebase default action handler: this website does not implement a custom email-action handler. Test delivery to an account you control.
6. Store the four values in the ignored `.env.local`; configure the same four names in the production host's environment settings. Restart the local server after changes.
7. With the configured project, test sign-up, verification email, login, password reset, logout and session persistence in a browser. Test account deletion separately and confirm the app's data deletion behavior. No live Firebase test has been completed from this workspace.

Firebase sign-in is independent of Supabase. Account deletion removes only the Firebase Auth identity; cloud memories or stored images require their own verified deletion path. Recent sign-in may be required by Firebase.

## Supabase website forms

Use the existing website Supabase project reference `bickqlcqnitnhokrntvc`, as specified for this task. The website migration is separate from any mobile cloud-foundation migration; do not reapply mobile migrations.

1. In Supabase Dashboard, open the project whose reference is `bickqlcqnitnhokrntvc` and verify **Project Settings → General** shows that exact reference. Inspect both website migrations. Check migration history first; if `202610090001_website_forms.sql` is pending, apply it and then `202610090002_website_forms_access_lockdown.sql`. If migration 001 is already applied, confirm the two tables exist and apply only migration 002 if it is pending. Do not run a mobile cloud-foundation migration.
2. Migration 001 creates `public.waitlist_signups` with a unique email constraint and `public.contact_messages`; both have RLS enabled. Migration 002 removes all table privileges from `PUBLIC`, `anon`, `authenticated`, and `service_role`, then grants only `INSERT` to `service_role`. No row policies are defined, so RLS denies direct API access; public visitors must not be able to select/list rows. The service role bypasses RLS, so keep its key only on the server.
3. After applying or confirming the migrations, verify the two tables, waitlist email uniqueness, RLS state, table grants and absence of `anon`/`authenticated` policies. Test direct reads with a publishable/anon key and expect permission-denied; do not run a successful SELECT through a service key as the security test.
4. Set `NEXT_PUBLIC_SUPABASE_URL` to `https://bickqlcqnitnhokrntvc.supabase.co` and the Supabase server secret as `SUPABASE_SECRET_KEY` in `.env.local` and the production host's secret store. `SUPABASE_SERVICE_ROLE_KEY` is supported only as a legacy fallback when `SUPABASE_SECRET_KEY` is unset. The server-only key must never use a `NEXT_PUBLIC_` name. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is currently unused by these endpoints.
5. `WAITLIST_TABLE` and `CONTACT_TABLE` are optional; defaults are `waitlist_signups` and `contact_messages`. Configure backup, retention and deletion procedures before accepting public submissions.

Use these read-only SQL checks in the target project's SQL Editor after migration. Expected: both tables have RLS enabled; `waitlist_signups.email` has a UNIQUE constraint; no anon/authenticated grants or policies; only `service_role` has INSERT among these API roles.

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('waitlist_signups', 'contact_messages');

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in ('public.waitlist_signups'::regclass, 'public.contact_messages'::regclass);

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('waitlist_signups', 'contact_messages')
order by table_name, grantee, privilege_type;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('waitlist_signups', 'contact_messages');
```

The API validates fields, checks request size and uses a hidden honeypot. On Netlify, `netlify/edge-functions/forms-rate-limit.ts` applies a platform rate limit of five `POST /api/forms` requests per client IP and site domain per 60-second window, then passes allowed requests to the existing handler. The limiter does not trust request-supplied forwarding headers and is enforced before the Next.js serverless function. It is not active under plain `next dev`/`next start` or on another host. Netlify can take up to 10 seconds to begin blocking after a threshold is crossed, so some additional requests may reach the app; the limit is per IP and does not stop distributed abuse or clients that rotate IPs. Netlify may process client IPs for enforcement and its own security logs; Echo does not store IP in its form tables, and host log retention/access remain unverified. Verify the rule in the Netlify deploy log's post-processing stage after the next deployment, and safely confirm a 429 on that deployment before relying on it. Privacy-rights, grievance and privacy/account-deletion messages trigger a limited Gmail SMTP alert only after the contact row is successfully inserted; alerts omit the submitter's email and message. Notification failure does not undo the saved request or repeat the insert. Duplicate waitlist records receive the same generic confirmation to avoid disclosing whether an email is already listed. Test genuine submissions, duplicate handling, invalid input, outage behavior, rate limiting and unauthorized reads against the configured service before launch. No live Supabase test or migration has been performed from this workspace.

## Configuration

Copy `.env.example` to `.env.local` for local development and set `NEXT_PUBLIC_SITE_URL` for canonical metadata, sitemap and robots. `NEXT_PUBLIC_SUPPORT_EMAIL` is the public support/privacy contact and is set to `echo_with_ss@gmail.com` in the example configuration. Configure the same value in the production host’s public environment variables and ensure the inbox is monitored before launch. This direct contact does not by itself provide request tracking or data deletion. Privacy alerts use the server-only `SMTP_*` variables and are routed only to `PRIVACY_NOTIFICATION_TO=echowithss@gmail.com`; never use a `NEXT_PUBLIC_` prefix for SMTP credentials. An SMTP acceptance response does not establish inbox delivery, human review, or completion. No real credentials belong in the repository. Analytics are not configured and remain disabled.

### Gmail SMTP setup

1. Sign in to the `echowithss@gmail.com` Google Account and enable 2-Step Verification. Google requires 2-Step Verification to create an App Password; some account types or security configurations may not offer that option ([Google App Password help](https://support.google.com/accounts/answer/185833?hl=en)).
2. In Google Account Security, create a separate App Password for this website if the option is available. Configure the generated value only as `SMTP_APP_PASSWORD` in local `.env.local` and the production host's server-only secret settings. Never use the normal Google account password or paste the App Password into chat, source code, browser configuration or logs.
3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, and `SMTP_USER=echowithss@gmail.com`. Set `PRIVACY_NOTIFICATION_TO=echowithss@gmail.com`; the server rejects any different recipient. Do not change the sender or recipient in submitted form data.
4. For a local end-to-end test, submit a clearly identified privacy-rights test request or grievance after configuring all six variables. Confirm that the request was saved and the brief alert arrives at the fixed Gmail inbox. Check server logs for safe SMTP error category/code if the email fails. The alert contains only the request type, database row ID, submission time and privacy-request link; it excludes the requester's address and message.
5. The site reports success for the form even if SMTP fails, because the database request is already saved; it tells the user to follow up by email. When SMTP accepts the recipient, the UI says it was accepted by the email server, not that it reached the inbox or was reviewed. No case tracking or automatic action is implemented.

## Deploy

1. Choose and register a domain and confirm ownership. No domain has been purchased by this project.
2. Configure the production environment variables in Vercel or another Node.js host: set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin and `NEXT_PUBLIC_SUPPORT_EMAIL=echo_with_ss@gmail.com`. Store `SUPABASE_SECRET_KEY` as a server-only environment variable; use `SUPABASE_SERVICE_ROLE_KEY` only if retaining legacy configuration. Never expose Supabase secret keys through `NEXT_PUBLIC_` variables.
3. Add the production host to Firebase authorized domains and set the verified Firebase web config.
4. Apply the Supabase migration and set the server-only `SUPABASE_SECRET_KEY` in the host secret store (or the legacy fallback if needed).
5. Point DNS records to the selected host, enable HTTPS, and verify canonical URLs, sitemap, robots, headers, form error states and account recovery.
6. Run `npm ci`, `npm test`, `npm run lint` and `npm run build`; deploy only after founder/legal review of policies and verified product claims.

No external deployment, domain purchase or external account setup has been performed.

## Content and release readiness

- Replace the draft privacy and terms copy after reviewing the actual Android, Firebase, Supabase and AI-provider data flows with the founders and qualified counsel.
- The privacy request page writes through the existing contact endpoint and submits limited Gmail SMTP alerts for privacy-related subjects only after a confirmed database insert. It still does not verify a requester, create or track a case, perform deletion, or guarantee human review. Configure the Gmail App Password, assign a reviewer, and establish identity-verification, retention and escalation procedures before relying on it.
- Read [docs/DPDP_READINESS_CHECKLIST.md](docs/DPDP_READINESS_CHECKLIST.md) for the staged commencement dates, evidence inventory, founder decisions and technical remediation list.
- Verify supported platforms, offline processing, search, location, cloud sync, current availability and signup/account requirements against the Android product.
- Confirm Play Billing products, trial and prices. Current Premium figures are proposed and cannot be purchased from the website.
- Confirm that the supplied Echo logo is the approved brand asset. Provide any required transparent/light/dark variants and verified Android screenshots. See [public/brand-assets/README.md](public/brand-assets/README.md).
- Confirm legal entity, founders/roles, contact address, an assigned and monitored privacy/grievance owner, trademark/name status and registration details before publishing claims. The public support email is `echo_with_ss@gmail.com`; it is not evidence of an assigned rights-response workflow.
- Keep `blog` empty until genuine articles are ready.

## Routes

`/`, `/product`, `/features`, `/how-it-works`, `/pricing`, `/about`, `/contact`, `/early-access`, `/faq`, `/blog`, `/privacy`, `/privacy-notice`, `/privacy-requests`, `/terms`, `/cookies`, `/security`, `/delete-account`, `/login`, `/signup`, `/forgot-password`, `/account`.
