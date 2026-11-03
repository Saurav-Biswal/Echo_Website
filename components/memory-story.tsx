'use client';

import { useEffect, useRef, useState } from 'react';

const categories = ['All', 'Videos', 'Places', 'Recipes', 'Events', 'Ideas'] as const;
type Category = (typeof categories)[number];

const memories = [
  { category: 'Recipes', title: 'One-pan lemon pasta', detail: 'A recipe worth coming back to', icon: '✳', className: 'story-memory-recipe' },
  { category: 'Places', title: 'A little place by the water', detail: 'Somewhere to go someday', icon: '⌖', className: 'story-memory-place' },
  { category: 'Ideas', title: 'A thought to keep close', detail: 'An idea that stayed with you', icon: '✦', className: 'story-memory-idea' },
  { category: 'Videos', title: 'A clip worth another look', detail: 'A video you want to remember', icon: '▷', className: 'story-memory-video' },
  { category: 'Events', title: 'A date for later', detail: 'A moment to make room for', icon: '◷', className: 'story-memory-event' },
] as const;

const scenes = [
  { id: 'capture', number: '01', label: 'CAPTURE', title: 'Something caught your attention.', copy: 'A recipe, a place, a passing idea. Those little sparks are worth keeping.', action: 'Notice what you want to remember' },
  { id: 'save', number: '02', label: 'SAVE', title: 'Save it before it slips away.', copy: 'Give the things you find a place to land, with the context that made them matter.', action: 'Bring the moments together' },
  { id: 'organize', number: '03', label: 'ORGANIZE', title: 'Scattered finds become a collection.', copy: 'See your saved things by the way you think about them: places, videos, recipes, events, and ideas.', action: 'Find a thread through your saves' },
  { id: 'rediscover', number: '04', label: 'REDISCOVER', title: 'Find it again when it matters.', copy: 'Return to a useful discovery when the right moment arrives.', action: 'Let the useful things find their way back' },
] as const;

export function MemoryStory() {
  const [activeScene, setActiveScene] = useState<string>('capture');
  const [category, setCategory] = useState<Category>('All');
  const [selected, setSelected] = useState<string | null>(null);
  const beatsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = beatsRef.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveScene(visible.target.getAttribute('data-scene') ?? 'capture');
    }, { threshold: [0.2, 0.45, 0.7], rootMargin: '-18% 0px -28% 0px' });
    root.querySelectorAll<HTMLElement>('[data-scene]').forEach((beat) => observer.observe(beat));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="memory-story" id="memory-story" aria-labelledby="memory-story-title">
      <div className="memory-story-heading">
        <div><span className="kicker">A LITTLE MORE THAN SAVED</span><h2 id="memory-story-title">Never lose something that caught your attention.</h2></div>
        <p>Echo is a place for useful discoveries to gather context, find their shape, and make their way back to you.</p>
      </div>
      <div className="memory-story-layout">
        <div className="memory-stage-wrap">
          <div className="memory-stage" data-scene={activeScene} data-category={category.toLowerCase()}>
            <div className="memory-stage-halo" />
            <div className="memory-stage-orbit memory-stage-orbit-a" />
            <div className="memory-stage-orbit memory-stage-orbit-b" />
            <div className="memory-stage-core"><span>e</span><small>YOUR ECHO</small></div>
            {memories.map((memory) => {
              const highlighted = category === 'All' || category === memory.category;
              const expanded = selected === memory.category;
              return <button className={`story-memory ${memory.className}`} data-highlighted={highlighted} data-expanded={expanded} key={memory.category} type="button" aria-label={`${memory.category}: ${memory.title}`} aria-expanded={expanded} onClick={() => setSelected(expanded ? null : memory.category)}>
                <span className="story-memory-icon" aria-hidden="true">{memory.icon}</span><span className="story-memory-text"><small>{memory.category.toUpperCase()}</small><b>{memory.title}</b><i>{expanded ? memory.detail : 'Tap to explore'}</i></span>
              </button>;
            })}
            <div className="memory-stage-caption"><span /> {scenes.find((scene) => scene.id === activeScene)?.action}</div>
          </div>
          <div className="memory-category-controls" aria-label="Highlight memory categories">
            {categories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <p className="memory-stage-hint">Select a category or a floating card to explore the story.</p>
        </div>
        <div className="memory-story-beats" ref={beatsRef}>
          {scenes.map((scene) => <article className="memory-story-beat" data-scene={scene.id} key={scene.id}>
            <span className="memory-story-index">{scene.number}<i />{scene.label}</span>
            <div><h3>{scene.title}</h3><p>{scene.copy}</p></div>
          </article>)}
        </div>
      </div>
    </section>
  );
}
