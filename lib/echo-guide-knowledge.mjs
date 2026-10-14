// Verified website guidance. Keep claims aligned with the public pages and
// include a source route so the assistant can send visitors to the detail.
export const guideKnowledge = [
  {
    id: 'what-is-echo',
    title: 'What Echo is',
    href: '/product',
    keywords: ['what', 'echo', 'product', 'memory', 'save', 'discoveries', 'ideas', 'remember'],
    answer: 'Echo is being built as a personal memory companion for saving useful digital discoveries and finding them again later. The website describes the product direction; it does not confirm that every capability is available today.',
  },
  {
    id: 'how-it-works',
    title: 'How Echo is intended to work',
    href: '/how-it-works',
    keywords: ['how', 'work', 'works', 'save', 'context', 'find', 'later', 'capture', 'process'],
    answer: 'The idea is to save a discovery, keep helpful context with it, and return to it later. Supported capture methods and retrieval tools are still being confirmed, so this is an illustrative description rather than a verified app walkthrough.',
  },
  {
    id: 'features',
    title: 'Features and availability',
    href: '/features',
    keywords: ['features', 'available', 'availability', 'app', 'launch', 'ocr', 'offline', 'search', 'supported'],
    answer: 'The site presents saving discoveries, keeping context, and finding them again as Echo’s product direction. The cards are not a promise of currently available app features. Release status, supported sources, search, OCR, AI processing, and offline behavior need confirmation with the Echo team.',
  },
  {
    id: 'early-access',
    title: 'Early access',
    href: '/early-access',
    keywords: ['early', 'access', 'waitlist', 'join', 'invite', 'invitation', 'updates', 'signup'],
    answer: 'The early-access form records your email so the team can follow up about Echo. It does not guarantee an invitation, app access, or a launch date. The form does not subscribe you to a separate newsletter.',
  },
  {
    id: 'pricing',
    title: 'Pricing',
    href: '/pricing',
    keywords: ['price', 'pricing', 'cost', 'premium', 'free', 'subscription', 'trial', 'rupees'],
    answer: 'Echo pricing and paid plans are being confirmed. The Premium prices and trial shown on the website are proposals, not an offer or checkout; no purchase flow is enabled.',
  },
  {
    id: 'privacy',
    title: 'Privacy and information use',
    href: '/privacy-notice',
    keywords: ['privacy', 'data', 'information', 'collect', 'store', 'secure', 'personal', 'notice'],
    answer: 'The website privacy pages are drafts. Website forms send submitted details to the configured Supabase service, and privacy-related topics can trigger a limited server-side email alert after the save. The full provider, retention, and operational details still need review. Please do not share sensitive information here.',
  },
  {
    id: 'account-deletion',
    title: 'Account deletion and privacy requests',
    href: '/privacy-requests',
    keywords: ['delete', 'deletion', 'erase', 'account', 'rights', 'grievance', 'request', 'remove'],
    answer: 'The website can request deletion of a website Firebase sign-in account from its account page, but that does not erase form submissions or Android data. The privacy request form records a message for operator follow-up; it does not verify identity or automatically complete a deletion. See the deletion page for details.',
  },
  {
    id: 'contact',
    title: 'Contact Echo',
    href: '/contact',
    keywords: ['contact', 'support', 'email', 'help', 'team', 'reach', 'question'],
    answer: 'You can contact Echo at echo_with_ss@gmail.com or use the contact form. A successful form response confirms the message was saved; it does not guarantee that a person has reviewed it.',
  },
  {
    id: 'faq',
    title: 'Frequently asked questions',
    href: '/faq',
    keywords: ['faq', 'questions', 'answers', 'frequently', 'common'],
    answer: 'The FAQ covers Echo’s product direction, app availability, early access, supported content, privacy, AI/cloud status, deletion, and contacting the team.',
  },
];

export const guideRoutes = {
  '/': { label: 'homepage', aliases: ['home', 'homepage', 'start page', 'main page'] },
  '/product': { label: 'product page', aliases: ['product', 'product overview'] },
  '/features': { label: 'features page', aliases: ['features', 'feature page'] },
  '/how-it-works': { label: 'how it works page', aliases: ['how it works', 'how echo works', 'how echo works page'] },
  '/pricing': { label: 'pricing page', aliases: ['pricing', 'prices', 'plans'] },
  '/about': { label: 'about page', aliases: ['about', 'about echo'] },
  '/contact': { label: 'contact page', aliases: ['contact', 'support'] },
  '/early-access': { label: 'early-access page', aliases: ['early access', 'waitlist', 'join early access'] },
  '/faq': { label: 'FAQ page', aliases: ['faq', 'frequently asked questions'] },
  '/blog': { label: 'journal page', aliases: ['blog', 'journal'] },
  '/privacy': { label: 'privacy policy draft', aliases: ['privacy policy', 'privacy policy draft'] },
  '/privacy-notice': { label: 'privacy notice', aliases: ['privacy notice', 'collection notice'] },
  '/privacy-requests': { label: 'privacy requests page', aliases: ['privacy requests', 'privacy request', 'data rights'] },
  '/terms': { label: 'terms draft', aliases: ['terms', 'terms of service', 'terms draft'] },
  '/cookies': { label: 'cookies page', aliases: ['cookies', 'cookie policy'] },
  '/security': { label: 'security page', aliases: ['security', 'security practices'] },
  '/delete-account': { label: 'account deletion page', aliases: ['delete account', 'account deletion'] },
};

const stopWords = new Set(['a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'please', 'the', 'to', 'what', 'where', 'with', 'you', 'your']);

function words(value) {
  return String(value).toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => !stopWords.has(word)) ?? [];
}

export function isNavigationRequest(text) {
  return /\b(go|take|bring|open|show|navigate|send|back)\b/i.test(String(text));
}

export function findNavigation(text) {
  const normalized = String(text).toLowerCase().replace(/[’']/g, '').trim();
  if (!isNavigationRequest(normalized)) return null;
  const matches = Object.entries(guideRoutes).filter(([, route]) => route.aliases.some((alias) => normalized.includes(alias)));
  if (matches.length !== 1) return null;
  const [path, route] = matches[0];
  return { path, label: route.label };
}

export function findKnowledge(text) {
  const queryWords = new Set(words(text));
  if (!queryWords.size) return null;
  const ranked = guideKnowledge.map((item) => ({
    item,
    score: item.keywords.reduce((score, keyword) => score + (queryWords.has(keyword) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= 1 ? ranked[0].item : null;
}

export function detectFormIntent(text) {
  const normalized = String(text).toLowerCase();
  if (/^\s*(?:please\s+)?(?:help me (?:join|sign up for|fill)|i want to (?:join|sign up for)|i(?:'d| would) like to (?:join|sign up for)|let me (?:join|sign up for)|join (?:early access|the waitlist|waitlist)|sign up for early access|sign me up|add me to (?:early access|the waitlist)|fill (?:in )?(?:the )?early-access form)\b/.test(normalized)) {
    return { kind: 'waitlist', path: '/early-access', subject: null };
  }
  const startsRequest = /\b(help|start|fill|make|submit|send|file|begin|create)\b/.test(normalized);
  if (startsRequest && /\b(grievance|complaint)\b/.test(normalized)) {
    return { kind: 'contact', path: '/privacy-requests', subject: 'Privacy grievance', privacy: true };
  }
  if (startsRequest && /\b(delete|deletion|erase|erasure)\b/.test(normalized) && /\b(account|data|information|my)\b/.test(normalized)) {
    return { kind: 'contact', path: '/privacy-requests', subject: 'Privacy / account deletion', privacy: true };
  }
  if (startsRequest && /\b(privacy|data rights|access to my data|correct my data)\b/.test(normalized)) {
    return { kind: 'contact', path: '/privacy-requests', subject: 'Privacy rights request', privacy: true };
  }
  if (startsRequest && /\b(contact|message|question|write to|email the team)\b/.test(normalized)) {
    return { kind: 'contact', path: '/contact', subject: null };
  }
  return null;
}

export function isPrivacyRequestIntent(text) {
  return /\b(?:privacy (?:rights? )?request|privacy grievance|grievance|complaint|(?:delete|erase|remove|access|correct|update|withdraw).{0,40}\b(?:my|personal|account|privacy|consent|data|info|information)\b|(?:my|personal)\s+(?:data|info|information)\b.{0,40}\b(?:delete|erase|access|correct|update|remove)\b)\b/i.test(String(text));
}

export function extractEmail(text) {
  return String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.slice(0, 254) ?? '';
}

export function isValidGuideEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function resolveContactSubject(text) {
  const normalized = String(text).toLowerCase();
  if (/\b(grievance|complaint)\b/.test(normalized)) return 'Privacy grievance';
  if (/\b(delete|deletion|erase|erasure)\b/.test(normalized)) return 'Privacy / account deletion';
  if (/\bprivacy|data rights|access to my data|correct my data\b/.test(normalized)) return 'Privacy rights request';
  if (/\bbug|broken|error\b/.test(normalized)) return 'Bug report';
  if (/\bfeedback|suggestion\b/.test(normalized)) return 'Product feedback';
  if (/\bpartner|partnership\b/.test(normalized)) return 'Partnership';
  if (/\bbusiness|accelerator\b/.test(normalized)) return 'Business / accelerator inquiry';
  if (/\bgeneral|question\b/.test(normalized)) return 'General';
  return null;
}

export function mapGuideFormField(field, text) {
  if (field === 'email') {
    const email = extractEmail(text);
    return isValidGuideEmail(email) ? { email } : null;
  }
  if (field === 'subject') {
    const subject = resolveContactSubject(text);
    return subject ? { subject } : null;
  }
  if (field === 'message') {
    const message = String(text).trim();
    return message.length > 0 && message.length <= 3000 ? { message } : null;
  }
  return null;
}

export function isSubmissionRequest(text) {
  return /\b(submit|send it|send the form|finish the form)\b/i.test(text);
}

export function localGuideUnavailableMessage() {
  return 'I can only answer from Echo’s published website information. I could not find a reliable answer for that. Try the FAQ or contact Echo for help.';
}

export function redactPersonalData(text) {
  return String(text)
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g, '[credential hidden]')
    .replace(/\b(password|passcode|passphrase|otp|one[- ]time (?:password|code|pin)|verification code|api key|access token|secret|bearer token)\b(?:\s*(?:is|:|=)\s*|[\s-]+)[^\s,;]+/gi, '[credential hidden]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email hidden]')
    .replace(/(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g, '[payment number hidden]')
    .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, '[number hidden]');
}

export function isSafeGuideMessage(text) {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= 2000;
}

export function hasSpeechRecognition(browserWindow) {
  return Boolean(browserWindow?.SpeechRecognition || browserWindow?.webkitSpeechRecognition);
}

export function classifySpeechRecognitionError(error) {
  const messages = {
    'not-allowed': 'Microphone permission was denied by the browser or site policy. Review this site’s microphone permission, then try again.',
    'service-not-allowed': 'The browser blocked its speech recognition service. Text input is still available.',
    'audio-capture': 'The browser could not capture audio. Check that a microphone is connected and available.',
    network: 'The browser speech service reported a network error. Check your connection or use text input.',
    'no-speech': 'No speech was detected. Try again or type your question.',
    'language-not-supported': 'The browser speech service does not support the selected language (English, India).',
    aborted: 'Speech recognition was stopped before it finished. You can try again or type your question.',
  };
  const category = typeof error === 'string' && Object.hasOwn(messages, error) ? error : 'other';
  return {
    category,
    message: messages[category] ?? 'Speech recognition failed for another reason. You can try again or type your question.',
  };
}
