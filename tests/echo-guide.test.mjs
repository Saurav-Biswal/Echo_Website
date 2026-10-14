import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  detectFormIntent,
  findKnowledge,
  findNavigation,
  guideRoutes,
  hasSpeechRecognition,
  classifySpeechRecognitionError,
  isNavigationRequest,
  isPrivacyRequestIntent,
  isSafeGuideMessage,
  isSubmissionRequest,
  localGuideUnavailableMessage,
  mapGuideFormField,
  redactPersonalData,
} from '../lib/echo-guide-knowledge.mjs';

const root = new URL('../', import.meta.url);

test('navigation commands resolve only to the explicit internal route allowlist', () => {
  assert.deepEqual(findNavigation('Take me to the features page.'), { path: '/features', label: 'features page' });
  assert.deepEqual(findNavigation('Open early access.'), { path: '/early-access', label: 'early-access page' });
  assert.deepEqual(findNavigation('Open the privacy policy.'), { path: '/privacy', label: 'privacy policy draft' });
  assert.deepEqual(findNavigation('Go back to the homepage.'), { path: '/', label: 'homepage' });
  assert.equal(findNavigation('Open https://attacker.example/'), null);
  assert.equal(findNavigation('Show privacy policy and contact'), null);
  assert.equal(isNavigationRequest('Open https://attacker.example/'), true);
  assert.equal(findNavigation('Could you explain account deletion?'), null);
  for (const route of [findNavigation('Show me the FAQ page.'), findNavigation('Take me to contact')]) {
    assert.ok(Object.hasOwn(guideRoutes, route.path));
  }
});

test('website answers use explicit grounded entries and unknown questions fall back safely', () => {
  const answer = findKnowledge('What is Echo?');
  assert.equal(answer.id, 'what-is-echo');
  assert.equal(answer.href, '/product');
  assert.match(answer.answer, /being built/);
  assert.equal(findKnowledge('What happens when I join early access?').id, 'early-access');
  assert.match(localGuideUnavailableMessage(), /could not find a reliable answer/i);
  assert.equal(findKnowledge('What is the weather on Mars tomorrow?'), null);
});

test('form intent mapping collects required fields and never maps consent', () => {
  assert.deepEqual(detectFormIntent('Help me join early access.'), { kind: 'waitlist', path: '/early-access', subject: null });
  assert.deepEqual(mapGuideFormField('email', 'Use ada@example.com please'), { email: 'ada@example.com' });
  assert.deepEqual(mapGuideFormField('subject', 'privacy grievance'), { subject: 'Privacy grievance' });
  assert.deepEqual(mapGuideFormField('message', 'Please review my request'), { message: 'Please review my request' });
  assert.equal(mapGuideFormField('email', 'not an email'), null);
  assert.equal(mapGuideFormField('message', 'x'.repeat(3001)), null);
  assert.equal(mapGuideFormField('consent', 'yes'), null);
  assert.deepEqual(detectFormIntent('Help me file a privacy grievance.'), { kind: 'contact', path: '/privacy-requests', subject: 'Privacy grievance', privacy: true });
  assert.equal(detectFormIntent('What happens when I join early access?'), null);
});

test('privacy requests stay local even when the visitor does not start an assisted form flow', async () => {
  assert.equal(isPrivacyRequestIntent('I need access to my personal data'), true);
  assert.equal(isPrivacyRequestIntent('Please remove my account data'), true);
  assert.equal(isPrivacyRequestIntent('What is Echo?'), false);
  const panel = await readFile(new URL('components/echo-guide-panel.tsx', root), 'utf8');
  assert.ok(panel.indexOf('if (isPrivacyRequestIntent(text))') < panel.indexOf('if (aiOptIn)'));
  assert.match(panel, /will not send this request to Groq/);
});

test('guide never submits forms or bypasses React state and consent', async () => {
  const panel = await readFile(new URL('components/echo-guide-panel.tsx', root), 'utf8');
  const forms = await readFile(new URL('components/forms.tsx', root), 'utf8');
  const context = await readFile(new URL('components/echo-guide-context.tsx', root), 'utf8');
  assert.match(panel, /I will not submit a form from chat/);
  assert.equal(isSubmissionRequest('Submit the form now'), true);
  assert.doesNotMatch(panel, /\.submit\s*\(/);
  assert.match(panel, /fetch\('\/api\/echo-guide'/);
  assert.match(forms, /value=\{values\.email\}/);
  assert.match(forms, /reportValidity\(\)/);
  assert.match(forms, /name="consent" value="yes"/);
  assert.doesNotMatch(context, /consent/);
  assert.doesNotMatch(panel, /type=["']password|name=["']password/i);
});

test('speech has an unsupported-browser fallback and requires explicit activation', async () => {
  assert.equal(hasSpeechRecognition({}), false);
  assert.equal(hasSpeechRecognition({ SpeechRecognition: function SpeechRecognition() {} }), true);
  assert.equal(hasSpeechRecognition({ webkitSpeechRecognition: function SpeechRecognition() {} }), true);
  const panel = await readFile(new URL('components/echo-guide-panel.tsx', root), 'utf8');
  assert.match(panel, /Speech recognition is not supported by this browser/);
  assert.match(panel, /onClick=\{speechPhase === 'listening' \? stopListening : startListening\}/);
  assert.match(panel, /recognitionRef\.current\) return/);
  assert.match(panel, /recognition\.onresult = null/);
  assert.match(panel, /recognition\.continuous = false/);
  assert.match(panel, /Processing speech/);
  assert.match(panel, /Transcription ready\. Review or edit it before sending/);
  assert.match(panel, /classifySpeechRecognitionError\(event\.error\)/);
  assert.match(panel, /speechWindow\.SpeechRecognition \|\| speechWindow\.webkitSpeechRecognition/);
  assert.match(panel, /recognition\.lang = 'en-IN'/);
  assert.match(panel, /Speech error \(\$\{diagnostic\.category\}\)/);
  assert.match(panel, /activeRecognition\.abort\(\)/);
  assert.match(panel, /setDraft\(transcript\.slice/);
  assert.doesNotMatch(panel, /sendMessage\(transcript/);
  assert.equal(classifySpeechRecognitionError('not-allowed').category, 'not-allowed');
  assert.match(classifySpeechRecognitionError('not-allowed').message, /permission was denied/i);
  for (const category of ['service-not-allowed', 'audio-capture', 'network', 'no-speech', 'language-not-supported']) {
    assert.equal(classifySpeechRecognitionError(category).category, category);
    assert.ok(classifySpeechRecognitionError(category).message.length > 0);
  }
  assert.deepEqual(classifySpeechRecognitionError('unexpected-private-data'), {
    category: 'other',
    message: 'Speech recognition failed for another reason. You can try again or type your question.',
  });
  const config = await readFile(new URL('next.config.ts', root), 'utf8');
  assert.match(config, /microphone=\(self\)/);
  assert.match(config, /camera=\(\).*geolocation=\(\)/);
});

test('chat layout keeps one scrollable conversation and a responsive fixed composer footer', async () => {
  const panel = await readFile(new URL('components/echo-guide-panel.tsx', root), 'utf8');
  const css = await readFile(new URL('app/globals.css', root), 'utf8');
  assert.ok(panel.indexOf('className="echo-guide-header"') < panel.indexOf('className="echo-guide-messages"'));
  assert.ok(panel.indexOf('className="echo-guide-messages"') < panel.indexOf('className="echo-guide-footer-panel"'));
  assert.match(panel, /<details className="echo-guide-ai-optin">/);
  assert.match(panel, /checked=\{aiOptIn\}/);
  assert.match(panel, /className="echo-guide-suggestions"/);
  assert.match(css, /\.echo-guide-scroll \{[^}]*overflow-y: auto/s);
  assert.match(css, /\.echo-guide-suggestions \{[^}]*flex-wrap: wrap/s);
  assert.match(css, /100dvh/);
  assert.match(css, /@media \(max-height: 600px\)/);
  assert.match(css, /\.echo-guide-panel :is\(button, a, summary, textarea, input\):focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('chat input is bounded, personal identifiers are redacted, and unavailable answers remain local', async () => {
  assert.equal(isSafeGuideMessage('hello'), true);
  assert.equal(isSafeGuideMessage('x'.repeat(2001)), false);
  assert.match(redactPersonalData('Email ada@example.com or call 123-456-7890'), /\[email hidden\].*\[number hidden\]/);
  assert.match(localGuideUnavailableMessage(), /published website information/);
  const panel = await readFile(new URL('components/echo-guide-panel.tsx', root), 'utf8');
  assert.match(panel, /Echo Guide could not complete that action/);
  assert.match(panel, /Your form has not been submitted/);
});
