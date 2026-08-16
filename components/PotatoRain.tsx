"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Drop = {
  id: number;
  left: number;
  drift: number;
  rotation: number;
  scale: number;
  duration: number;
  delay: number;
};

type Shower = { key: number; drops: Drop[] };

const COUNT = 34;
const MAX_DURATION_MS = 3400;
const MAX_DELAY_MS = 1300;

/**
 * Click the potato and it rains potatoes down the whole page.
 *
 * Rendered through a portal on document.body: the sidebar card this lives in
 * has overflow:hidden, which would otherwise trap the whole shower inside a
 * 20rem box. Each drop spans the full viewport height, so it is positioned
 * against the window rather than the button.
 */
export function PotatoRain() {
  const [showers, setShowers] = useState<Shower[]>([]);
  const [mounted, setMounted] = useState(false);
  const seq = useRef(0);

  // Portals need a DOM to target, and this page is prerendered at build time.
  useEffect(() => setMounted(true), []);

  const rain = useCallback(() => {
    // Honour a stated preference for less motion — an easter egg is never worth
    // making someone feel ill.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const key = seq.current++;
    const drops: Drop[] = Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      // Spread across the width, nudged off a perfect grid so it does not
      // read as a row of falling icons.
      left: (i / COUNT) * 100 + (Math.random() - 0.5) * (100 / COUNT) * 1.6,
      drift: (Math.random() - 0.5) * 120,
      rotation: (Math.random() - 0.5) * 720,
      scale: 0.6 + Math.random() * 1.1,
      // Varied speed is what sells depth; identical timing looks mechanical.
      duration: 1900 + Math.random() * (MAX_DURATION_MS - 1900),
      delay: Math.random() * MAX_DELAY_MS,
    }));

    setShowers((current) => [...current, { key, drops }]);

    window.setTimeout(
      () => setShowers((current) => current.filter((s) => s.key !== key)),
      MAX_DURATION_MS + MAX_DELAY_MS + 200,
    );
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={rain}
        aria-label="Potato"
        title="Go on, click it"
        className="cursor-pointer text-3xl leading-none transition-transform active:scale-90"
      >
        🥔
      </button>

      {mounted &&
        showers.length > 0 &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          >
            {showers.map((shower) =>
              shower.drops.map((drop) => (
                <span
                  key={`${shower.key}-${drop.id}`}
                  className="potato-drop"
                  style={
                    {
                      left: `${drop.left}%`,
                      "--drift": `${drop.drift}px`,
                      "--rot": `${drop.rotation}deg`,
                      "--scale": drop.scale,
                      animationDuration: `${drop.duration}ms`,
                      animationDelay: `${drop.delay}ms`,
                    } as React.CSSProperties
                  }
                >
                  🥔
                </span>
              )),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
