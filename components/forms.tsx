'use client';

import Link from 'next/link';
import { useState } from 'react';

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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

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
      setMessage(result.message);
      setError(false);
      form.reset();
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

  return <form className="form-card" onSubmit={submit}>
    <div className="collection-notice" id="form-data-notice">
      <strong>Before you send this</strong>
      <p>{isWaitlist
        ? 'Email is required; name and use case are optional. Echo uses these details to record and respond to your early-access request. This form does not subscribe you to a separate newsletter.'
        : 'Email, topic and message are used to record and respond to this enquiry. Name is optional.'}</p>
      <p>Submissions are sent to Echo’s configured form database. Privacy-rights, grievance and account-deletion topics also trigger a limited server-side email alert after the database confirms the save; the alert omits your message and does not mean a person has reviewed or completed your request. Read the <Link href="/privacy-notice">collection notice</Link> and <Link href="/privacy-requests">privacy request options</Link>.</p>
    </div>

    <label>Email address<input required type="email" name="email" autoComplete="email" maxLength={254} /></label>
    <label>Name <span className="optional-label">optional</span><input name="name" autoComplete="name" maxLength={100} /></label>
    {isWaitlist ? <label>What would you want Echo to help you remember? <span className="optional-label">optional</span><textarea name="useCase" maxLength={600} /></label> : <>
      <label>What is this about?<select name="subject" defaultValue={defaultSubject ?? ''} required>
        <option value="">Choose a topic</option>
        {contactSubjects.map(subject => <option key={subject}>{subject}</option>)}
      </select></label>
      <label>Message<textarea required name="message" maxLength={3000} /></label>
    </>}
    <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="checkbox"><input type="checkbox" required name="consent" value="yes" />
      <span>{isWaitlist
        ? 'I agree that Echo may use these details to record and respond to my early-access request.'
        : 'I agree that Echo may use these details to record and respond to this enquiry.'}</span>
    </label>
    <button className="button" type="submit" disabled={busy}>{busy ? 'Sending…' : isWaitlist ? 'Join the list' : 'Send message'} <span aria-hidden="true">↗</span></button>
    {message && <p role={error ? 'alert' : 'status'} className={`form-message ${error ? 'error' : 'success'}`}>{message}</p>}
    <p className="help-copy">We do not publicly list submissions. Avoid passwords, sign-in codes, identity documents, or sensitive personal details. See the <Link href="/privacy">privacy policy draft</Link>.</p>
  </form>;
}
