# Echo Guide

## Local and optional AI behavior

Echo Guide is lazy-loaded when opened. It retains a small source-grounded answer set in `lib/echo-guide-knowledge.mjs`. Visitors can use those local answers without enabling AI. Navigation and form assistance remain deterministic and run before any provider call. The model has no tools and cannot navigate or submit forms.

If the visitor checks **Send my chat messages to Groq for AI replies**, the browser sends an explicit same-origin opt-in request to `/api/echo-guide/consent`. The server sets a signed, HttpOnly, SameSite=Strict cookie scoped to `/api/echo-guide`, with a 15-minute expiry. It contains only a disclosure version and issue/expiry times, no message or personal data. The AI route verifies the HMAC signature and expiry; a JSON `consent: true` field has no authority. The panel attempts to clear the cookie when AI is unchecked or the panel closes. A rejected or missing proof leaves local answers available. Form-flow answers, emails, contact messages, privacy requests, grievances, account-deletion details, and navigation commands are handled before any model request and are not included in its payload. Up to eight recent ordinary conversational turns are included; generic deterministic form/navigation markers are filtered out. Responses are rendered as React text, never HTML.

Both opt-in and AI requests require an exact `Origin` matching the request URL, a same-origin custom request header, and reject `Sec-Fetch-Site: cross-site`. This is a practical browser CSRF defense and does not rely on `X-Forwarded-For`. It cannot establish that an unauthenticated person actually read or understood the disclosure: a direct HTTP client can supply its own Origin/header and request a cookie. The signed proof shows only that the server issued a short-lived token after the opt-in endpoint checks. An authenticated identity or trusted user-verification mechanism would be needed for stronger attribution; neither exists here.

## Provider, configuration and limits

The route calls Groq's official OpenAI-compatible Chat Completions HTTP endpoint using server-only `GROQ_API_KEY`. No SDK dependency is added. `GROQ_MODEL` configures the model; default is `openai/gpt-oss-20b`. Keep the API key in server-side secret settings; never add it to `NEXT_PUBLIC_*`, source control, client props, browser code, logs, or error messages.

The opt-in proof uses a separate server-only `ECHO_GUIDE_CONSENT_SECRET` (at least 32 random bytes). Configure it in the deployment environment before enabling AI; if absent or too short, opt-in issuance fails closed with 503. Rotate it to invalidate existing consent cookies. `.env.example` contains blank placeholders only.

The route accepts at most 12 KB, a 2,000-character current message, eight history entries capped at 1,200 characters each, and emits at most 1,800 characters/240 completion tokens. The Groq request timeout is 7.5 seconds; the route is configured for a 9-second maximum. It makes one provider request and does not retry. Emails, phone-like numbers, payment-number patterns and obvious credential/token patterns are redacted best-effort. Redaction is incomplete and is not a guarantee. Request bodies, prompts, provider responses, consent tokens and chat text are not logged by the application code.

Local fallback answers call only the local knowledge set and do not call Groq. Missing provider configuration, timeouts, network/provider errors and HTTP 429 all fail safely; the UI uses a local answer when an AI request fails. Successful model answers are labeled **AI reply via Groq** and fallback responses **Local website guide**.

### Netlify abuse control

Netlify has a code-based Edge Function rule for `/api/echo-guide` and its nested paths: 10 POST requests per IP and site domain per 60 seconds. It covers the AI and consent-issuance endpoints. It is separate from the existing `/api/forms` rule and does not use visitor-supplied forwarding headers. Netlify documents code-based function and Edge Function rules on all plans and full Next.js App Router route-handler support through the OpenNext adapter. After a deployment, check the deploy log under post-processing for the rule and safely validate a 429. Enforcement may take up to 10 seconds to catch up.

### Cost and abuse limits

The Netlify rule is per-IP/per-domain, not a global spending ceiling: distributed or rotating IPs can multiply the allowance, and one valid opt-in proof can be replayed until expiry. In-memory counters are unreliable across Netlify function instances and cold starts. A durable global counter needs shared storage or another provider, which this project does not have; no storage/service or schema was added.

For a strict ₹0 provider bill, keep the Groq organization on its Free tier and do not add a payment method or upgrade to a paid tier. Groq's free model quotas cap throughput and return 429 when exceeded, but are not a site-specific budget and may be shared with other keys/apps in the organization. Current Groq documentation lists 30 RPM, 1K RPD and 8K TPM for `openai/gpt-oss-20b`; confirm live limits in the account console. Groq paid-plan spend limits require a paid tier and owner permissions, so they do not meet a ₹0 constraint. Request-size limits, the 240-token output cap, timeout and no-retry behavior reduce per-request exposure but do not create a global cap.

### Groq data handling

Groq says it always collects usage metadata. It says inference inputs and outputs may be temporarily retained for reliability or abuse investigation for up to 30 days, and retained data is stored in US GCP buckets. Organization administrators can enable Zero Data Retention in Groq Data Controls. Echo's account-level settings, provider agreement, configured region and ZDR status are not verified. The site privacy notice and DPDP readiness checklist should remain drafts until operator and legal review.

References: [Groq Chat Completions API](https://console.groq.com/docs/api-reference), [Groq models](https://console.groq.com/docs/models), [Groq data handling](https://console.groq.com/docs/your-data), [Groq rate limits](https://console.groq.com/docs/rate-limits), [Groq spend limits](https://console.groq.com/docs/spend-limits), [Netlify rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/), [Netlify Next.js adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

## Voice and form handling

Browser SpeechRecognition is optional and begins only after a deliberate Speak click. The transcription stays editable before sending. Audio is not uploaded by Echo to Groq and is not stored by the feature; the browser may use its own speech service. Unsupported, denied, silent and network-failure states offer text input.

Form prefilling selects an allowlisted existing form, asks for fields, fills controlled React state, leaves consent unchecked, calls native validation for review, and never submits. Existing validation, honeypot, form endpoint, duplicate handling, server persistence and notification handling are preserved. Netlify's existing `/api/forms` Edge Function rule remains five POSTs per IP and site domain per 60 seconds. Neither rule is an absolute global budget cap.

## Deployment checklist

- Set `GROQ_API_KEY` and a separately generated 32+ random-byte `ECHO_GUIDE_CONSENT_SECRET` in Netlify's server-side environment variable settings. Do not enter either value in chat or commit them.
- Optionally set `GROQ_MODEL`; if omitted, the route uses `openai/gpt-oss-20b`.
- Keep Groq on Free tier with no payment method for the ₹0 provider-budget safeguard; verify model/organization quotas in the account console. Review Data Controls and decide whether ZDR can be enabled. No hard site-wide call ceiling exists in code.
- Review and approve the public privacy wording and provider transfer/retention decision before enabling the credential.
- Check the Netlify deployment's post-processing log for both `/api/forms` and `/api/echo-guide` rate rules; validate expected 429 responses on a safe preview.
- Check logs and provider usage without sending real personal or form data. Do not use production forms or data for load testing.

No deployment, production setting, migration or database object was changed for this review. Real provider requests, deployment rule validation, Groq account settings, and physical/browser microphone permission were not tested.
