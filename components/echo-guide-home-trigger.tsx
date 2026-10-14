'use client';

import { useEchoGuideForm } from '@/components/echo-guide-context';

export function EchoGuideHomeTrigger() {
  const guide = useEchoGuideForm();
  if (!guide) return null;
  return <button type="button" className="echo-guide-launcher echo-guide-home-trigger" aria-haspopup="dialog" aria-controls="echo-guide-dialog" onClick={guide.openGuide}>
    <span className="echo-guide-mark" aria-hidden="true">✳</span><span>Ask Echo</span>
  </button>;
}
