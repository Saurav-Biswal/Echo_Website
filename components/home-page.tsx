import Link from 'next/link';
import { OrbitVisual } from '@/components/orbit-visual';
import { PhonePreview } from '@/components/visuals';
import { capabilityStatus } from '@/config/site';

export function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">YOUR PERSONAL MEMORY ASSISTANT</div>
            <h1>Good things shouldn’t disappear into your <em>saved folder.</em></h1>
            <p>Save the videos, ideas, places, and discoveries you come across. Echo is being built to turn scattered saves into personal memories you can find again.</p>
            <div className="hero-actions">
              <Link className="button" href="/early-access">Get early access <span>↗</span></Link>
              <Link className="text-link" href="/how-it-works">See how it works <span>→</span></Link>
            </div>
            <div className="tiny-note">A new way to keep what catches your attention.</div>
          </div>
          <OrbitVisual />
        </div>
      </section>

      <div className="trust-strip"><div className="trust-inner">
        <span className="trust-label">BUILT AROUND REAL LIFE</span>
        {['Videos worth revisiting','Screenshots with context','Places you want to remember'].map((item) => <span className="trust-item" key={item}><i aria-hidden="true">✳</i>{item}</span>)}
      </div></div>

      <section className="section"><div className="section-inner">
        <div className="section-heading"><div><div className="kicker">THE SAVE-FOR-LATER PROBLEM</div><h2>Saved is not the same as remembered.</h2></div><p>Inspiration slips into a dozen folders and apps. Echo’s idea is simple: give the things you save a little context, so they’re easier to find when they matter.</p></div>
        <div className="story-grid">
          <article className="story-card"><div className="kicker">01 / THE SCATTER</div><h3>“I know I saved that somewhere.”</h3><p>Recipes, reels, screenshots and links pile up in different places. The moment passes. The useful bit gets harder to find.</p><div className="file-stack"><div>Saved posts <b>17 things</b></div><div>Screenshots <b>Maybe this one?</b></div><div>Browser tabs <b>Still open somewhere</b></div></div></article>
          <article className="story-card dark"><div className="kicker">02 / THE IDEA</div><h3>A personal library with a memory for context.</h3><p>Echo aims to bring saved discoveries together with the details that help you rediscover them.</p><div className="memory-note"><small>MEMORY · IDEA</small><b>Sunday pasta idea</b><span>Recipe · from a video · saved last week</span></div></article>
        </div>
      </div></section>

      <section className="section"><div className="section-inner">
        <div className="section-heading"><div><div className="kicker">A SIMPLE LOOP</div><h2>From “that’s useful” to “there it is.”</h2></div><p>Echo’s intended flow is built around a small habit: save what catches your attention, then come back to it with more context.</p></div>
        <div className="steps-grid">{[['01','Discover','Find something useful, interesting, or worth doing later.','◉'],['02','Save','Share a supported link with Echo or add an image.','↗'],['03','Understand','Available processing can help organize saved information.','✳'],['04','Rediscover','Return to your library and use supported ways to find it.','⌕']].map(([number,title,copy,icon]) => <article className="step" key={number}><div className="step-num">{number} /</div><div className="step-art">{icon}</div><h3>{title}</h3><p>{copy}</p></article>)}</div>
        <p className="status-note">{capabilityStatus}</p>
      </div></section>

      <section className="section dark-section"><div className="section-inner feature-layout">
        <PhonePreview />
        <div className="feature-copy"><div className="kicker">MADE FOR THE THINGS YOU KEEP</div><h2>A little more context changes everything.</h2><p>Echo is designed to bring saved links and images into a personal library. The supplied product brief describes AI-assisted summaries, OCR, categories and location details where supported.</p><div className="feature-list"><div><span>01</span> Save social videos and web links <small>VERIFY STATUS</small></div><div><span>02</span> Turn screenshots into searchable notes <small>VERIFY STATUS</small></div><div><span>03</span> Find a saved idea later <small>VERIFY STATUS</small></div></div><p className="status-note">The preview is an illustrative concept, not a screenshot of a verified live app.</p><Link href="/features" className="text-link">Explore features <span>→</span></Link></div>
      </div></section>

      <section className="cta-band"><div className="cta-inner"><div><div className="kicker">BE THERE FROM THE BEGINNING</div><h2>Keep the good things close.</h2><p>Tell us what you’d want Echo to help you remember.</p></div><Link className="button" href="/early-access">Get early access <span>↗</span></Link></div></section>
    </>
  );
}
