'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { EchoGuideFormContext, type GuideFormBridge, type GuideFormKind, type GuideFormValues } from '@/components/echo-guide-context';

const EchoGuidePanel = dynamic(() => import('@/components/echo-guide-panel'), { ssr: false, loading: () => null });

const privateRoutes = new Set(['/login', '/signup', '/forgot-password', '/account']);

export function EchoGuide({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<GuideFormBridge | null>(null);
  const pendingFillRef = useRef<{ path: string; kind: GuideFormKind; values: GuideFormValues } | null>(null);
  const [open, setOpen] = useState(false);
  const openGuide = useCallback(() => setOpen(true), []);

  const registerForm = useCallback((bridge: GuideFormBridge) => {
    formRef.current = bridge;
    const pending = pendingFillRef.current;
    if (pending?.path === bridge.path && pending.kind === bridge.kind) {
      bridge.fill(pending.values);
      pendingFillRef.current = null;
    }
    return () => {
      if (formRef.current === bridge) formRef.current = null;
    };
  }, []);

  const fillExistingForm = useCallback((path: string, kind: GuideFormKind, values: GuideFormValues) => {
    const current = formRef.current;
    if (current?.path === path && current.kind === kind) {
      current.fill(values);
      return;
    }
    pendingFillRef.current = { path, kind, values };
    if (pathname !== path) router.push(path);
  }, [pathname, router]);

  const reviewExistingForm = useCallback((path: string, kind: GuideFormKind) => {
    setOpen(false);
    requestAnimationFrame(() => {
      const form = formRef.current;
      if (form?.path === path && form.kind === kind) form.validate();
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => (launcherRef.current ?? document.querySelector<HTMLButtonElement>('.echo-guide-form-trigger, .echo-guide-home-trigger'))?.focus());
  }, []);

  const showGuide = !privateRoutes.has(pathname);
  const formRoute = ['/contact', '/early-access', '/privacy-requests'].includes(pathname);
  const homeRoute = pathname === '/';

  return <EchoGuideFormContext.Provider value={{ registerForm, fillExistingForm, reviewExistingForm, openGuide }}>
    {children}
    {showGuide && !formRoute && !homeRoute && <button ref={launcherRef} className="echo-guide-launcher" type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="echo-guide-dialog" onClick={openGuide}>
        <span className="echo-guide-mark" aria-hidden="true">✳</span><span>Ask Echo</span>
      </button>}
    {showGuide && open && <EchoGuidePanel onClose={close} onNavigate={(path) => router.push(path)} onFillForm={fillExistingForm} onReviewForm={reviewExistingForm} />}
  </EchoGuideFormContext.Provider>;
}
