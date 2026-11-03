'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEchoGuideForm } from '@/components/echo-guide-context';

export function EchoGuideHomeTrigger({ floating = false }: { floating?: boolean }) {
  const guide = useEchoGuideForm();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!guide) return null;

  const button = <button type="button" className="echo-guide-launcher echo-guide-home-trigger" aria-haspopup="dialog" aria-controls="echo-guide-dialog" onClick={guide.openGuide}>
    <span className="echo-guide-mark" aria-hidden="true">✳</span><span>Ask Echo</span>
  </button>;

  if (floating) return mounted ? createPortal(button, document.body) : null;
  return button;
}
