'use client';

import { createContext, useContext } from 'react';

export type GuideFormKind = 'waitlist' | 'contact';
export type GuideFormValues = Partial<Record<'email' | 'subject' | 'message', string>>;

export type GuideFormBridge = {
  kind: GuideFormKind;
  path: string;
  fill: (values: GuideFormValues) => void;
  validate: () => boolean;
};

type EchoGuideFormContextValue = {
  registerForm: (bridge: GuideFormBridge) => () => void;
  fillExistingForm: (path: string, kind: GuideFormKind, values: GuideFormValues) => void;
  reviewExistingForm: (path: string, kind: GuideFormKind) => void;
  openGuide: () => void;
};

export const EchoGuideFormContext = createContext<EchoGuideFormContextValue | null>(null);

export function useEchoGuideForm() {
  return useContext(EchoGuideFormContext);
}
