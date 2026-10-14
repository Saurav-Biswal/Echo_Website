import Link from 'next/link';
import { FounderOrbitScene } from '@/components/founder-orbit-scene';
import { EchoGuideHomeTrigger } from '@/components/echo-guide-home-trigger';
import { verifiedFounderFacts } from '@/lib/echo-guide-knowledge.mjs';

export function AboutFounderExperience() {
  return <>
    <header className="about-hero"><div className="about-hero-inner"><span className="kicker">OUR REASON FOR BUILDING</span><h1>Two founders. One idea: remember what matters.</h1><p>{verifiedFounderFacts.product}</p></div></header>
    <div className="content-wrap route-about">
      <section className="founder-hero" aria-labelledby="founder-hero-title">
        <div className="founder-hero-copy"><span className="about-story-index">TWO MINDS. ONE IDEA.</span><h2 id="founder-hero-title">Good things deserve a way back.</h2><p>We all collect little sparks worth keeping. Echo began with a question: what if they could find their way back to us?</p><a className="founder-hero-jump" href="#founder-story">Follow the thread <span aria-hidden="true">↓</span></a></div>
        <div className="founder-hero-facts">{verifiedFounderFacts.founders.map((person) => <span key={person.name}><strong>{person.name}</strong> {person.role} · {person.age}</span>)}<span><strong>{verifiedFounderFacts.founded}</strong> Echo founded</span></div>
      </section>
      <div className="founder-storyline" id="founder-story">
        <section className="story-beat story-problem" aria-labelledby="story-problem-title"><span className="story-number">01 <i></i> THE PROBLEM</span><div><h2 id="story-problem-title">Saved somewhere. Lost everywhere.</h2><p>A video in one app. A place in a chat. An idea in a screenshot. We keep the things that move us, then forget where they went.</p></div><div className="story-saved-scatter" aria-label="A video, a place, an idea, and a recipe" role="img"><span>▶ &nbsp; watch later</span><span>⌖ &nbsp; someday here</span><span>✳ &nbsp; remember this</span><span>◌ &nbsp; make it</span></div></section>
        <section className="story-beat story-idea" aria-labelledby="story-idea-title"><span className="story-number">02 <i></i> THE QUESTION</span><div><h2 id="story-idea-title">What if what mattered could find its way back?</h2><p>That question became Echo. {verifiedFounderFacts.product}</p></div><div className="idea-thread" aria-hidden="true"><span>notice</span><i></i><span>keep</span><i></i><b>return</b></div></section>
        <section className="story-beat story-founders" aria-labelledby="story-founders-title"><span className="story-number">03 <i></i> THE PEOPLE</span><div><h2 id="story-founders-title">Two perspectives, meeting in one idea.</h2><p>Echo was founded in {verifiedFounderFacts.founded} by:</p></div><div className="founder-pair">{verifiedFounderFacts.founders.map((person, index) => <article key={person.name}><span className={`founder-initials${index ? ' founder-initials-alt' : ''}`} aria-hidden="true">{person.name.split(' ').map((part) => part[0]).join('')}</span><div><span>{person.role.toUpperCase()}</span><h3>{person.name}</h3><p>Age {person.age}</p></div><b>0{index + 1}</b></article>)}</div></section>
        <section className="ask-echo-story" aria-labelledby="ask-echo-title"><span className="about-story-index">A QUESTION FOR ECHO?</span><div><h2 id="ask-echo-title">Curious about what we’re building?</h2><p>Ask Echo Guide about the product, its story, or what is still taking shape.</p></div><EchoGuideHomeTrigger /></section>
        <section className="story-beat story-portal" aria-labelledby="story-portal-title"><span className="story-number">04 <i></i> THE MEMORY PORTAL</span><div><h2 id="story-portal-title">Scattered discoveries, finding their way home.</h2><p>Echo’s vision is to bring useful videos, places, ideas, and recipes together so they can be rediscovered when the moment calls for them.</p></div><FounderOrbitScene /></section>
        <section className="story-beat story-mission" aria-labelledby="story-mission-title"><span className="story-number">05 <i></i> THE MISSION</span><div><h2 id="story-mission-title">Make the good things easier to return to.</h2><p>We’re building toward a calmer way to rediscover the ideas, places, and moments people choose to keep. Echo is still in development; this is the mission, not a claim that every capability is live today.</p></div><div className="mission-orbit" aria-hidden="true"><span>find</span><i></i><b>remember</b></div></section>
        <section className="story-next" aria-labelledby="story-next-title"><span className="about-story-index">06 · THE NEXT CHAPTER</span><h2 id="story-next-title">There’s room for one more good idea.</h2><p>Follow Echo as it takes shape.</p><Link href="/early-access" className="button">Join early access <span aria-hidden="true">↗</span></Link><span className="next-date">ECHO · FOUNDED OCTOBER 2026</span></section>
      </div>
      <p className="about-entity-note">The Echo product is in development. This story shares its confirmed founders and mission; it makes no claims about company registration, investment, or launch timing.</p>
    </div>
  </>;
}
