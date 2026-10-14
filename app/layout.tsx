import type { Metadata } from 'next';
import './globals.css';
import { site } from '@/config/site';
import { Header, Footer } from '@/components/chrome';
import { EchoGuide } from '@/components/echo-guide';

export const metadata: Metadata = {
  metadataBase: new URL(site.url), title: { default: 'Echo — Keep the good things you find', template: '%s — Echo' },
  description: site.description, alternates:{canonical:'/'}, applicationName: 'Echo', openGraph: { type: 'website', siteName: 'Echo', title: 'Echo — Keep the good things you find', description: site.description },
  twitter: { card: 'summary_large_image', title: 'Echo — Keep the good things you find', description: site.description },
  icons: { icon: '/echo-logo.png', apple: '/echo-logo.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><EchoGuide><Header/><main id="main">{children}</main><Footer/></EchoGuide></body></html>;
}
