'use client';

import { useEffect, useRef, useState } from 'react';

const memories = [
  { label: 'A recipe to try', kind: 'RECIPE', icon: '✳', className: 'memory-recipe' },
  { label: 'A place for later', kind: 'PLACE', icon: '⌖', className: 'memory-place' },
  { label: 'A little inspiration', kind: 'IDEA', icon: '✦', className: 'memory-idea' },
  { label: 'A video worth keeping', kind: 'VIDEO', icon: '▷', className: 'memory-video' },
  { label: 'A day to remember', kind: 'MOMENT', icon: '◷', className: 'memory-moment' },
];

export function OrbitVisual() {
  const scene = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = scene.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function move(event: React.MouseEvent<HTMLDivElement>) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    event.currentTarget.style.setProperty('--pointer-x', String(x) + 'px');
    event.currentTarget.style.setProperty('--pointer-y', String(y) + 'px');
  }

  function reset() {
    scene.current?.style.setProperty('--pointer-x', '0px');
    scene.current?.style.setProperty('--pointer-y', '0px');
  }

  return (
    <div ref={scene} className="orbit-scene" data-active={active} onMouseMove={move} onMouseLeave={reset} role="img" aria-label="Five saved memories orbit a glowing Echo-inspired green sphere">
      <div className="orbit-glow" />
      <div className="orbit-world">
        <svg className="orbit-lines" viewBox="0 0 620 520" aria-hidden="true">
          <ellipse cx="310" cy="260" rx="252" ry="106" transform="rotate(-24 310 260)" />
          <ellipse cx="310" cy="260" rx="210" ry="162" transform="rotate(36 310 260)" />
          <ellipse cx="310" cy="260" rx="263" ry="188" transform="rotate(-2 310 260)" />
        </svg>
        <div className="orbit-core"><span className="core-orbit">e</span><span className="core-spark">✦</span></div>
        {memories.map((item, index) => (
          <div className={'memory-object ' + item.className} key={item.kind} style={{ '--memory-index': index } as React.CSSProperties}>
            <span className="memory-icon" aria-hidden="true">{item.icon}</span>
            <span className="memory-copy"><small>{item.kind}</small><b>{item.label}</b></span>
            <span className="memory-dot" aria-hidden="true" />
          </div>
        ))}
        <div className="orbit-caption"><span /> YOUR IDEAS, IN ORBIT</div>
      </div>
    </div>
  );
}
