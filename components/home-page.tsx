import Link from 'next/link';
import { OrbitVisual } from '@/components/orbit-visual';
import { capabilityStatus } from '@/config/site';
import { site } from '@/config/site';
import { EchoGuideHomeTrigger } from '@/components/echo-guide-home-trigger';
import { verifiedFounderFacts } from '@/lib/echo-guide-knowledge.mjs';
import { MemoryStory } from '@/components/memory-story';

export function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">YOUR PERSONAL MEMORY ASSISTANT</div>
            <h1>Good things deserve to be <em>remembered.</em></h1>
            <p>Save the things that catch your attention. Echo helps you organize, rediscover and remember them when they matter.</p>
            <div className="hero-actions">
              {site.androidDownloadUrl && <a className="button button-download" href={site.androidDownloadUrl} aria-label="Download Echo for Android">Download Echo for Android <span aria-hidden="true">↓</span></a>}
              <a className="button" href="#memory-story">Explore Echo <span>↓</span></a>
            </div>
            <div className="tiny-note">A new way to keep what catches your attention.</div>
            <Link className="home-story-link" href="/about">Meet the people building Echo <span aria-hidden="true">↗</span></Link>
            <EchoGuideHomeTrigger floating />
          </div>
          <OrbitVisual />
        </div>
      </section>

      <div className="trust-strip"><div className="trust-inner">
        <span className="trust-label">BUILT AROUND REAL LIFE</span>
        {['Videos worth revisiting','Screenshots with context','Places you want to remember'].map((item) => <span className="trust-item" key={item}><i aria-hidden="true">✳</i>{item}</span>)}
      </div></div>

      <MemoryStory />

      <section className="section dark-section"><div className="section-inner product-story">
        <div className="product-story-mark"><div className="product-story-orbit"><span>e</span></div><small>THE ECHO IDEA</small></div>
        <div className="feature-copy"><div className="kicker">MADE FOR THE THINGS YOU KEEP</div><h2>Your attention deserves a memory.</h2><p>Echo is being built around a simple loop: save a useful discovery, keep it with context, and return when you need it.</p><div className="feature-list"><div><span>01</span> Save a discovery for later <small>CAPTURE</small></div><div><span>02</span> Keep useful context together <small>ORGANIZE</small></div><div><span>03</span> Return when you need it <small>REDISCOVER</small></div></div><p className="status-note">{capabilityStatus} Verified app screenshots are not included in this website repository yet.</p><Link href="/features" className="text-link">Explore the product idea <span>→</span></Link></div>
      </div></section>

      <section className="home-founders"><div className="home-founders-inner"><div><div className="kicker">THE PEOPLE BEHIND ECHO</div><h2>Built around a simple question.</h2><p>Echo was founded in {verifiedFounderFacts.founded} by {verifiedFounderFacts.founders.map((person) => person.name).join(' and ')}. Meet the founders and read the story behind the idea.</p><Link className="text-link" href="/about">Meet Echo founders <span aria-hidden="true">→</span></Link></div><div className="home-founder-names" aria-label="Echo founders">{verifiedFounderFacts.founders.map((person) => <span key={person.name}>{person.name}<small>{person.role}</small></span>)}</div></div></section>
      <section className="cta-band"><div className="cta-inner"><div><div className="kicker">BE THERE FROM THE BEGINNING</div><h2>Keep the good things close.</h2><p>Tell us what you’d want Echo to help you remember.</p></div><div className="cta-actions">{site.androidDownloadUrl && <a className="button button-download" href={site.androidDownloadUrl} aria-label="Download Echo for Android">Download Echo for Android <span aria-hidden="true">↓</span></a>}<Link className="button" href="/early-access">Get early access <span>↗</span></Link></div></div></section>
    </>
  );
}
