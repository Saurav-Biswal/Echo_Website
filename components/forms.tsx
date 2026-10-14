'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEchoGuideForm } from '@/components/echo-guide-context';

const contactSubjects = [
  'General',
  'Product feedback',
  'Bug report',
  'Partnership',
  'Business / accelerator inquiry',
  'Privacy / account deletion',
  'Privacy rights request',
  'Privacy grievance',
];

export function LeadForm({ kind, defaultSubject }: { kind: 'waitlist' | 'contact'; defaultSubject?: string }) {
  const pathname = usePathname();
  const guideForm = useEchoGuideForm();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [values, setValues] = useState({ email: '', name: '', useCase: '', subject: defaultSubject ?? '', message: '' });

  const fill = useCallback((incoming: Partial<typeof values>) => {
    setValues((current) => ({
      ...current,
      ...(typeof incoming.email === 'string' ? { email: incoming.email.slice(0, 254) } : {}),
      ...(kind === 'contact' && typeof incoming.subject === 'string' ? { subject: incoming.subject } : {}),
      ...(kind === 'contact' && typeof incoming.message === 'string' ? { message: incoming.message.slice(0, 3000) } : {}),
    }));
  }, [kind]);

  const validate = useCallback(() => formRef.current?.reportValidity() ?? false, []);

  useEffect(() => {
    if (!guideForm) return;
    return guideForm.registerForm({ kind, path: pathname, fill, validate });
  }, [fill, guideForm, kind, pathname, validate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, kind }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The service could not accept this request.');
      setMessage(isWaitlist
        ? 'Thanks for your interest. Your email is on Echo’s early-access list so the team can follow up. This does not guarantee an invitation or confirm a launch date.'
        : result.message);
      setError(false);
      form.reset();
      setValues({ email: '', name: '', useCase: '', subject: defaultSubject ?? '', message: '' });
    } catch (submitError) {
      setMessage(submitError instanceof Error && submitError.name === 'AbortError'
        ? 'The request took too long. Please try again.'
        : submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.');
      setError(true);
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  const isWaitlist = kind === 'waitlist';

  return <form ref={formRef} className="form-card" onSubmit={submit}>
    {guideForm && <button type="button" className="echo-guide-form-trigger" onClick={guideForm.openGuide} aria-haspopup="dialog">
      <span>Need help filling this form?</span><span className="echo-guide-form-trigger-action">Ask Echo <span aria-hidden="true">↗</span></span>
    </button>}
    <div className="collection-notice" id="form-data-notice">
      <strong>Before you send this</strong>
      <p>{isWaitlist
        ? 'Email is required; name and use case are optional. Echo uses these details to record and respond to your early-access request. This form does not subscribe you to a separate newsletter.'
        : 'Email, topic and message are used to record and respond to this enquiry. Name is optional.'}</p>
      <p>Submissions are sent to Echo’s configured form database. Privacy-rights, grievance and account-deletion topics also trigger a limited server-side email alert after the database confirms the save; the alert omits your message and does not mean a person has reviewed or completed your request. Read the <Link href="/privacy-notice">collection notice</Link> and <Link href="/privacy-requests">privacy request options</Link>.</p>
    </div>

    <label>Email address<input required type="email" name="email" autoComplete="email" maxLength={254} value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} /></label>
    <label>Name <span className="optional-label">optional</span><input name="name" autoComplete="name" maxLength={100} value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} /></label>
    {isWaitlist ? <label>What would you want Echo to help you remember? <span className="optional-label">optional</span><textarea name="useCase" maxLength={600} value={values.useCase} onChange={(event) => setValues((current) => ({ ...current, useCase: event.target.value }))} /></label> : <>
      <label>What is this about?<select name="subject" value={values.subject} onChange={(event) => setValues((current) => ({ ...current, subject: event.target.value }))} required>
        <option value="">Choose a topic</option>
        {contactSubjects.map(subject => <option key={subject}>{subject}</option>)}
      </select></label>
      <label>Message<textarea required name="message" maxLength={3000} value={values.message} onChange={(event) => setValues((current) => ({ ...current, message: event.target.value }))} /></label>
    </>}
    <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="checkbox"><input type="checkbox" required name="consent" value="yes" />
      <span>{isWaitlist
        ? 'I agree that Echo may use these details to record and respond to my early-access request.'
        : 'I agree that Echo may use these details to record and respond to this enquiry.'}</span>
    </label>
    <button className="button" type="submit" disabled={busy}>{busy ? 'Sending…' : isWaitlist ? 'Join the list' : 'Send message'} <span aria-hidden="true">↗</span></button>
    {message && <div role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'} className={`form-message ${error ? 'error' : 'success'}`}><strong>{error ? 'We could not complete that request' : isWaitlist ? 'You’re on the list' : 'Request received'}</strong><p>{message}</p></div>}
    <p className="help-copy">We do not publicly list submissions. Avoid passwords, sign-in codes, identity documents, or sensitive personal details. See the <Link href="/privacy">privacy policy draft</Link>.</p>
  </form>;
}
