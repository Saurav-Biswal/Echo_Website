'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  detectFormIntent,
  findKnowledge,
  findNavigation,
  isFounderQuestion,
  hasSpeechRecognition,
  isNavigationRequest,
  isPrivacyRequestIntent,
  isSafeGuideMessage,
  isSubmissionRequest,
  localGuideUnavailableMessage,
  mapGuideFormField,
  redactPersonalData,
  resolveContactSubject,
} from '@/lib/echo-guide-knowledge.mjs';
import type { GuideFormKind, GuideFormValues } from '@/components/echo-guide-context';
import { EchoSpeechSession } from '@/lib/echo-guide-speech.mjs';

type Props = {
  onClose: () => void;
  onNavigate: (path: string) => void;
  onFillForm: (path: string, kind: GuideFormKind, values: GuideFormValues) => void;
  onReviewForm: (path: string, kind: GuideFormKind) => void;
};

type GuideMessage = { id: number; from: 'guide' | 'visitor'; text: string; href?: string; source?: string; mode?: 'local' | 'ai'; review?: { path: string; kind: GuideFormKind } };
type FormFlow = { kind: GuideFormKind; path: string; subject: string | null; step: 'email' | 'subject' | 'message' };
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechConstructor = new () => BrowserSpeechRecognition;
type SpeechWindow = Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };

const suggestions = ['What is Echo?', 'Is the app available now?', 'What happens when I join early access?'];

function makeMessage(from: GuideMessage['from'], text: string, extra: Pick<GuideMessage, 'href' | 'source' | 'review' | 'mode'> = {}): GuideMessage {
  return { id: Date.now() + Math.random(), from, text, ...extra };
}

async function requestAiReply(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch('/api/echo-guide', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-echo-guide-request': 'same-origin' },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || !('text' in result) || typeof result.text !== 'string') return null;
    return result.text.slice(0, 1_800);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function subjectPrompt() {
  return 'What is this about: a general question, product feedback, a bug report, partnership, or a business inquiry?';
}

export default function EchoGuidePanel({ onClose, onNavigate, onFillForm, onReviewForm }: Props) {
  const [messages, setMessages] = useState<GuideMessage[]>([
    makeMessage('guide', 'Hi, I’m Echo Guide. I can explain what this website says, point you to a page, or help fill an existing form. My answers are limited to the published site information.'),
  ]);
  const [draft, setDraft] = useState('');
  const [speechPhase, setSpeechPhase] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [aiOptIn, setAiOptIn] = useState(false);
  const [flow, setFlow] = useState<FormFlow | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const speechSessionRef = useRef<EchoSpeechSession | null>(null);
  const workingRef = useRef(false);
  const consentRequestRef = useRef<Promise<void> | null>(null);
  const previousMessageCountRef = useRef(messages.length);

  const closeGuide = useCallback(() => {
    speechSessionRef.current?.abort();
    speechSessionRef.current = null;
    setSpeechPhase('idle');
    void (async () => {
      try { await consentRequestRef.current; } catch { /* A failed opt-in has no cookie to revoke. */ }
      await fetch('/api/echo-guide/consent', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'x-echo-guide-request': 'same-origin' },
        cache: 'no-store',
      }).catch(() => {});
    })();
    setAiOptIn(false);
    onClose();
  }, [onClose]);

  async function changeAiOptIn(checked: boolean) {
    setError('');
    if (!checked) {
      setAiOptIn(false);
      void (async () => {
        try { await consentRequestRef.current; } catch { /* A failed opt-in has no cookie to revoke. */ }
        await fetch('/api/echo-guide/consent', {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'x-echo-guide-request': 'same-origin' },
          cache: 'no-store',
        }).catch(() => {});
      })();
      return;
    }
    const pending = (async () => {
      const response = await fetch('/api/echo-guide/consent', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'x-echo-guide-consent': 'accepted', 'x-echo-guide-request': 'same-origin' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Consent was not recorded');
    })();
    consentRequestRef.current = pending;
    try {
      await pending;
      setAiOptIn(true);
    } catch {
      setAiOptIn(false);
      setError('AI opt-in could not be recorded. Local website answers are still available.');
    } finally {
      if (consentRequestRef.current === pending) consentRequestRef.current = null;
    }
  }

  const addGuide = useCallback((text: string, extra: Pick<GuideMessage, 'href' | 'source' | 'review' | 'mode'> = {}) => {
    setMessages((current) => [...current, makeMessage('guide', text, extra)].slice(-30));
  }, []);

  useEffect(() => {
    setSpeechSupported(hasSpeechRecognition(window as SpeechWindow));
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeGuide();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea:not([disabled]), summary, input:not([disabled])')]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      speechSessionRef.current?.abort();
      speechSessionRef.current = null;
    };
  }, [closeGuide]);

  useEffect(() => {
    if (messages.length === previousMessageCountRef.current) return;
    previousMessageCountRef.current = messages.length;
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: 'auto' });
  }, [messages.length]);

  const processFlowMessage = useCallback((text: string, activeFlow: FormFlow) => {
    if (activeFlow.step === 'email') {
      const values = mapGuideFormField('email', text);
      if (!values) {
        addGuide('I did not find a valid email address. Please enter the email you want to use.');
        return;
      }
      if (activeFlow.kind === 'waitlist') {
        onFillForm(activeFlow.path, activeFlow.kind, values);
        setFlow(null);
        addGuide('I filled the email field in the existing early-access form. Please review it, provide consent yourself if you choose, and press “Join the list” when you are ready. I have not submitted anything.', { review: { path: activeFlow.path, kind: activeFlow.kind } });
      } else if (activeFlow.subject) {
        setFlow({ ...activeFlow, step: 'message' });
        onFillForm(activeFlow.path, activeFlow.kind, { ...values, subject: activeFlow.subject });
        addGuide('What message would you like to send? Please include only the details needed for the request; do not include passwords, codes, identity documents, or sensitive personal information.');
      } else {
        setFlow({ ...activeFlow, step: 'subject' });
        onFillForm(activeFlow.path, activeFlow.kind, values);
        addGuide(subjectPrompt());
      }
      return;
    }

    if (activeFlow.step === 'subject') {
      const subject = resolveContactSubject(text);
      if (!subject) {
        addGuide(subjectPrompt());
        return;
      }
      const values = mapGuideFormField('subject', text);
      if (!values) return;
      setFlow({ ...activeFlow, subject, step: 'message' });
      onFillForm(activeFlow.path, activeFlow.kind, values);
      if (subject.startsWith('Privacy')) {
        addGuide('This form records a privacy request for operator follow-up. It does not verify identity or automatically retrieve or delete data. What brief message would you like to include? Please avoid sensitive details.');
      } else {
        addGuide('What message would you like to send? Please keep it brief and avoid passwords, sign-in codes, or sensitive personal details.');
      }
      return;
    }

    const values = mapGuideFormField('message', text);
    if (!values) {
      addGuide('Please provide a brief message of up to 3,000 characters, with only the details needed for your request.');
      return;
    }
    onFillForm(activeFlow.path, activeFlow.kind, values);
    setFlow(null);
    addGuide('I filled the message in the existing contact form. Please review every field, provide consent yourself if you choose, and press the form’s send button when ready. I have not submitted anything.', { review: { path: activeFlow.path, kind: activeFlow.kind } });
  }, [addGuide, onFillForm]);

  const sendMessage = useCallback(async (rawText: string) => {
    speechSessionRef.current?.abort();
    speechSessionRef.current = null;
    setSpeechPhase('idle');
    const text = rawText.trim();
    if (!isSafeGuideMessage(text)) {
      setError(text.length > 2000 ? 'Please keep a message under 2,000 characters.' : 'Type a question or use one of the suggestions.');
      return;
    }
    if (workingRef.current) return;
    workingRef.current = true;
    setWorking(true);
    setError('');
    setVoiceStatus('');
    setDraft('');

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      if (isSubmissionRequest(text)) {
        setMessages((current) => [...current, makeMessage('visitor', 'Asked to submit a form.')].slice(-30));
        addGuide('I will not submit a form from chat. Please review the existing form and press its submit button yourself.');
        return;
      }
      if (flow) {
        processFlowMessage(text, flow);
        return;
      }

      const navigation = findNavigation(text);
      if (isNavigationRequest(text)) {
        if (!navigation) {
          setMessages((current) => [...current, makeMessage('visitor', 'Asked to navigate to a page.')].slice(-30));
          addGuide('Which page should I open? I can take you to the homepage, product, features, how it works, pricing, about, contact, early access, FAQ, journal, privacy policy, privacy notice, privacy requests, terms, cookies, security, or account deletion.');
          return;
        }
        setMessages((current) => [...current, makeMessage('visitor', `Asked to open the ${navigation.label}.`)].slice(-30));
        onNavigate(navigation.path);
        addGuide(`Opening the ${navigation.label}.`, { href: navigation.path, source: 'Open this page' });
        return;
      }

      const formIntent = detectFormIntent(text);
      if (formIntent) {
        setMessages((current) => [...current, makeMessage('visitor', `Asked for help filling the ${formIntent.kind === 'waitlist' ? 'early-access' : formIntent.privacy ? 'privacy request' : 'contact'} form.`)].slice(-30));
        const formKind: GuideFormKind = formIntent.kind === 'waitlist' ? 'waitlist' : 'contact';
        setFlow({ kind: formKind, path: formIntent.path, subject: formIntent.subject, step: 'email' });
        if (formIntent.privacy) {
          addGuide('I can help fill the privacy request form. It records a message for operator follow-up; it does not verify identity or automatically delete data. What email should the form use?');
        } else {
          addGuide(formIntent.kind === 'waitlist' ? 'I can fill the existing early-access form. What email should it use?' : 'I can fill the existing contact form. What email should it use?');
        }
        if (formIntent.path !== window.location.pathname) onNavigate(formIntent.path);
        return;
      }

      if (isPrivacyRequestIntent(text)) {
        setMessages((current) => [...current, makeMessage('visitor', 'Asked about a privacy request.')].slice(-30));
        addGuide('I can help with privacy requests locally. Use the privacy request page to send a message for operator follow-up; Echo Guide will not send this request to Groq.', { href: '/privacy-requests', source: 'Open privacy requests' });
        return;
      }

      const history = messages.slice(-8).flatMap((message) => {
        if (message.from === 'visitor' && /^Asked (?:for help filling|about a privacy request|to open|to submit)/.test(message.text)) return [];
        return [{
          role: message.from === 'visitor' ? 'user' as const : 'assistant' as const,
          content: redactPersonalData(message.text),
        }];
      });
      const safeText = redactPersonalData(text);
      setMessages((current) => [...current, makeMessage('visitor', safeText)].slice(-30));

      if (aiOptIn) {
        const answer = await requestAiReply(safeText, history);
        if (answer) {
          addGuide(answer, {
            ...(isFounderQuestion(text) ? { href: '/about', source: 'Read: Echo founders and origin' } : {}),
            mode: 'ai',
          });
          return;
        }
        const local = findKnowledge(text);
        addGuide(`Groq AI is unavailable right now, so this answer comes from the local website guide. ${local?.answer ?? localGuideUnavailableMessage()}`, {
          ...(local ? { href: local.href, source: `Read: ${local.title}` } : { href: '/faq', source: 'Browse the FAQ' }),
          mode: 'local',
        });
        return;
      }

      const knowledge = findKnowledge(text);
      if (knowledge) {
        addGuide(knowledge.answer, { href: knowledge.href, source: `Read: ${knowledge.title}`, mode: 'local' });
        return;
      }

      addGuide(localGuideUnavailableMessage(), { href: '/faq', source: 'Browse the FAQ', mode: 'local' });
    } catch {
      addGuide('Echo Guide could not complete that action. Your form has not been submitted. Please try again or use the page directly.');
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  }, [addGuide, aiOptIn, flow, messages, onNavigate, processFlowMessage]);

  function startListening() {
    if (!speechSupported || speechPhase !== 'idle' || speechSessionRef.current) return;
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechSupported(false);
      setVoiceStatus('Speech recognition is not available here. You can type your question instead.');
      return;
    }
    const session = new EchoSpeechSession(Recognition, {
      language: 'en-IN',
      initialTranscript: draft,
      onTranscript: (transcript) => setDraft(transcript),
      onError: (diagnostic) => setVoiceStatus(`Speech error (${diagnostic.category}): ${diagnostic.message} Text input remains available.`),
      onStatus: (phase, transcript) => {
        if (phase === 'listening') {
          setSpeechPhase('listening');
          setVoiceStatus('Listening. Speak at your own pace; you can review or edit the words before sending.');
          return;
        }
        if (phase === 'processing') {
          setSpeechPhase('processing');
          setVoiceStatus('Finishing the current speech segment…');
          return;
        }
        if (speechSessionRef.current === session) speechSessionRef.current = null;
        setSpeechPhase('idle');
        setVoiceStatus(phase === 'exhausted'
          ? 'Speech recognition kept ending, so listening has stopped. Review the transcript or use text input.'
          : transcript ? 'Transcription ready. Review or edit it before sending.' : 'Listening stopped. You can try again or type your question.');
      },
    });
    speechSessionRef.current = session;
    session.start();
  }

  function stopListening() {
    speechSessionRef.current?.stop();
  }

  return <div className="echo-guide-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeGuide(); }}>
    <section id="echo-guide-dialog" className="echo-guide-panel" role="dialog" aria-modal="true" aria-labelledby="echo-guide-title" ref={panelRef}>
      <header className="echo-guide-header">
        <div className="echo-guide-title-wrap"><span className="echo-guide-avatar" aria-hidden="true">✳</span><div><h2 id="echo-guide-title">Echo Guide</h2><p>Answers from this website</p></div></div>
        <button className="echo-guide-close" type="button" onClick={closeGuide} aria-label="Close Echo Guide">×</button>
      </header>
      <div className="echo-guide-scroll" ref={conversationRef}>
        <div className="echo-guide-disclosure">
          <strong>Voice is optional.</strong> If you use the microphone, your browser may send speech to its speech service for recognition. Echo does not record or store raw audio. Type instead whenever you prefer.
        </div>
        <details className="echo-guide-ai-optin">
          <summary><strong id="echo-guide-ai-title">Optional AI replies</strong><span>Review privacy details and opt in</span></summary>
          <div className="echo-guide-ai-details" role="group" aria-labelledby="echo-guide-ai-title">
            <p>If enabled, your chat message and recent chat context are sent to Groq. Groq says it always collects usage metadata and may temporarily retain inputs and outputs for reliability or abuse investigations for up to 30 days; retained data is in US GCP buckets. Echo’s Groq retention settings have not been verified. Avoid passwords, payment details, account credentials, and unnecessary sensitive information. Redaction is best-effort.</p>
            <p><a href="https://console.groq.com/docs/your-data" target="_blank" rel="noreferrer">Groq data-handling policy</a></p>
            <p>Your choice is kept in a signed, essential cookie for up to 15 minutes; Echo tries to clear it when you close the guide.</p>
            <label><input type="checkbox" checked={aiOptIn} onChange={(event) => { void changeAiOptIn(event.target.checked); }} /> Send my chat messages to Groq for AI replies</label>
          </div>
        </details>
        <div className="echo-guide-messages" role="log" aria-label="Echo Guide conversation" aria-live="polite" aria-relevant="additions" aria-busy={working}>
          {messages.map((message) => <article key={message.id} className={`echo-guide-message ${message.from}`}>
            {message.mode && <small className={`echo-guide-mode ${message.mode}`}>{message.mode === 'ai' ? 'AI reply via Groq' : 'Local website guide'}</small>}
            <p>{message.text}</p>
            {message.href && message.source && <Link href={message.href} onClick={closeGuide}>{message.source} <span aria-hidden="true">↗</span></Link>}
            {message.review && <button type="button" className="echo-guide-review" onClick={() => onReviewForm(message.review!.path, message.review!.kind)}>Review prefilled form</button>}
          </article>)}
          {working && <p className="echo-guide-working" role="status">Preparing a reply…</p>}
        </div>
      </div>
      <div className="echo-guide-footer-panel">
        <div className="echo-guide-suggestions" aria-label="Suggested questions">
          {suggestions.map((suggestion) => <button type="button" key={suggestion} disabled={working} onClick={() => sendMessage(suggestion)}>{suggestion}</button>)}
        </div>
        <form className="echo-guide-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(draft); }}>
          <label className="sr-only" htmlFor="echo-guide-input">Ask Echo Guide a question</label>
          <textarea ref={inputRef} id="echo-guide-input" rows={2} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about Echo or tell me where to take you…" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(draft); } }} />
          <div className="echo-guide-actions">
            <button type="button" className="echo-guide-mic" onClick={speechPhase === 'listening' ? stopListening : startListening} disabled={!speechSupported || speechPhase === 'processing'} aria-label={speechPhase === 'listening' ? 'Stop listening' : speechPhase === 'processing' ? 'Finishing speech' : speechSupported ? 'Start speech recognition' : 'Speech recognition unavailable'} title={speechPhase === 'listening' ? 'Stop listening' : speechSupported ? 'Speak a question' : 'Speech recognition unavailable'}>{speechPhase === 'listening' ? '■' : '🎙'}<span>{speechPhase === 'listening' ? 'Stop listening' : speechPhase === 'processing' ? 'Finishing…' : 'Speak'}</span></button>
            <button className="echo-guide-send" type="submit" disabled={!draft.trim() || working}>Send <span aria-hidden="true">↗</span></button>
          </div>
        </form>
        <p className="echo-guide-status" role="status" aria-live="polite">{error || voiceStatus || (!speechSupported ? 'Speech recognition is not supported by this browser. Text chat is available.' : '')}</p>
        <p className="echo-guide-footer">Please don’t share passwords, sign-in codes, or sensitive personal information. Chat stays in this page session and is cleared when you close the guide.</p>
      </div>
    </section>
  </div>;
}
