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
  verifiedFounderFacts,
} from '../lib/echo-guide-knowledge.mjs';

const root = new URL('../', import.meta.url);

test('navigation commands resolve only to the explicit internal route allowlist', () => {
  assert.deepEqual(findNavigation('Take me to the features page.'), { path: '/features', label: 'features page' });
  assert.deepEqual(findNavigation('Open early access.'), { path: '/early-access', label: 'early-access page' });
  assert.deepEqual(findNavigation('Show me the About page.'), { path: '/about', label: 'about page' });
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

test('founder questions return direct verified answers and a safe About destination', () => {
  assert.equal(verifiedFounderFacts.founded, 'October 2026');
  for (const question of ['Who founded Echo?', 'Who is the founder?', 'Who is Echo’s co-founder?', 'Who started Echo?', 'When was Echo founded?', 'How old are Shivam and Saurav?', 'Tell me about Echo’s founders']) {
    const answer = findKnowledge(question);
    assert.equal(answer.id, 'founders', question);
    assert.equal(answer.href, '/about', question);
    assert.match(answer.answer, /Shivam Chouthe|Saurav Biswal|October 2026/, question);
    assert.doesNotMatch(answer.answer, /university|degree|award|funding|registered|met at/i, question);
  }
  assert.match(findKnowledge('Who is the founder?').answer, /Shivam Chouthe.*Saurav Biswal.*both founders, age 20/i);
  assert.match(findKnowledge('Is Saurav Biswal a founder?').answer, /Saurav Biswal.*both founders, age 20/i);
  assert.match(findKnowledge('Who is Echo’s co-founder?').answer, /Saurav Biswal.*both founders, age 20/i);
  assert.match(findKnowledge('When was Echo founded?').answer, /October 2026/);
  assert.match(findKnowledge('How old are Shivam and Saurav?').answer, /Shivam Chouthe and Saurav Biswal are both Echo founders, age 20/);
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

test('Ask Echo click opens the guide and sends typed questions with a local fallback', async () => {
  const trigger = await readFile(new URL('components/echo-guide-home-trigger.tsx', root), 'utf8');
  const wrapper = await readFile(new URL('components/echo-guide.tsx', root), 'utf8');
  const panel = await readFile(new URL('components/echo-guide-panel.tsx', root), 'utf8');
  const api = await readFile(new URL('app/api/echo-guide/route.ts', root), 'utf8');
  assert.match(trigger, /<button type="button"[^>]*aria-haspopup="dialog"[^>]*aria-controls="echo-guide-dialog" onClick=\{guide\.openGuide\}/);
  assert.match(wrapper, /value=\{\{ registerForm, fillExistingForm, reviewExistingForm, openGuide \}\}/);
  assert.match(wrapper, /showGuide && open && <EchoGuidePanel/);
  assert.match(panel, /<textarea[^>]*id="echo-guide-input"[^>]*onChange=/);
  assert.match(panel, /onSubmit=\{\(event\) => \{ event\.preventDefault\(\); sendMessage\(draft\); \}\}/);
  assert.match(panel, /event\.key === 'Enter' && !event\.shiftKey/);
  assert.match(panel, /onClick=\{\(\) => sendMessage\(suggestion\)\}/);
  assert.match(panel, /if \(aiOptIn\) \{[\s\S]*?requestAiReply\(safeText, history\)/);
  assert.match(panel, /const local = findKnowledge\(text\);[\s\S]*?mode: 'local'/);
  assert.match(api, /isSameOriginGuideRequest/);
  assert.match(api, /verifyConsentToken/);
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
  assert.match(panel, /speechSessionRef\.current\) return/);
  assert.match(panel, /speechSessionRef\.current\?\.abort\(\)/);
  assert.match(panel, /Stop listening/);
  const speech = await readFile(new URL('lib/echo-guide-speech.mjs', root), 'utf8');
  assert.match(speech, /recognition\.continuous = true/);
  assert.match(speech, /recognition\.interimResults = true/);
  assert.match(speech, /this\.restartCount >= this\.maxRestarts/);
  assert.match(panel, /Transcription ready\. Review or edit it before sending/);
  assert.match(panel, /speechWindow\.SpeechRecognition \|\| speechWindow\.webkitSpeechRecognition/);
  assert.match(panel, /const sendMessage = useCallback\(async \(rawText: string\) => \{\s*speechSessionRef\.current\?\.abort\(\)/);
  assert.match(speech, /recognition\.lang = this\.language/);
  assert.match(panel, /Speech error \(\$\{diagnostic\.category\}\)/);
  assert.match(speech, /classifySpeechRecognitionError\(event\.error\)/);
  assert.match(speech, /\.slice\(0, 2000\)/);
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
  assert.match(css, /@media \(max-width: 360px\)[\s\S]*?\.echo-guide-launcher:not\(\.echo-guide-home-trigger\) \{ width: 52px/);
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
