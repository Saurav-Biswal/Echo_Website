'use client';

import { useEffect, useRef } from 'react';

export function FounderOrbitScene() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      scene.dataset.active = String(entry.isIntersecting);
    }, { threshold: 0.15 });
    observer.observe(scene);

    const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const move = (event: PointerEvent) => {
      const bounds = scene.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      scene.style.setProperty('--pointer-x', `${x * 3}deg`);
      scene.style.setProperty('--pointer-y', `${y * -3}deg`);
    };
    if (desktopPointer.matches) scene.addEventListener('pointermove', move, { passive: true });
    return () => {
      observer.disconnect();
      scene.removeEventListener('pointermove', move);
      scene.style.removeProperty('--pointer-x');
      scene.style.removeProperty('--pointer-y');
    };
  }, []);

  return <div className="memory-portal" ref={sceneRef} data-active="false" role="img" aria-label="An emerald memory portal gathers scattered cards for a video, place, idea, and recipe into an organized collection">
    <div className="portal-halo" aria-hidden="true" />
    <div className="portal-orbit portal-orbit-back" aria-hidden="true" />
    <div className="portal-stage" aria-hidden="true">
      <div className="portal-shadow" />
      <div className="portal-ring portal-ring-outer"><div className="portal-ring portal-ring-inner"><div className="portal-aperture"><span className="portal-wordmark">echo</span><span className="portal-pulse" /></div></div></div>
      <div className="portal-card portal-card-video"><span>▶</span><small>VIDEO</small><b>One to revisit</b></div>
      <div className="portal-card portal-card-place"><span>⌖</span><small>PLACE</small><b>Save for later</b></div>
      <div className="portal-card portal-card-idea"><span>✳</span><small>IDEA</small><b>Worth keeping</b></div>
      <div className="portal-card portal-card-recipe"><span>◌</span><small>RECIPE</small><b>Try someday</b></div>
      <div className="portal-glint portal-glint-one" /><div className="portal-glint portal-glint-two" />
    </div>
    <div className="portal-caption"><span>COLLECT THE MOMENT</span><i>↓</i><b>FIND IT WHEN IT MATTERS</b></div>
  </div>;
}
