"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Spud = {
  id: number;
  dx: number;
  peak: number;
  fall: number;
  rotation: number;
  scale: number;
  delay: number;
};

type Burst = {
  key: number;
  x: number;
  y: number;
  spuds: Spud[];
};

const COUNT = 18;
const LIFETIME_MS = 1500;

/**
 * Click the potato, get fireworks.
 *
 * Two details this needs to get right, both learned the hard way:
 *
 *   * It renders through a portal on the document body rather than inline. The
 *     sidebar card it lives in has overflow:hidden, which would otherwise trap
 *     every spud inside a 20rem box.
 *   * The launch is a pop-and-rain, not a rocket. The title sits a few dozen
 *     pixels from the top of the window, so anything with real upward velocity
 *     leaves the viewport before you can see it.
 */
export function PotatoBurst() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [mounted, setMounted] = useState(false);
  const seq = useRef(0);

  // Portals need a DOM to target, and this component is prerendered at build
  // time by the static export.
  useEffect(() => setMounted(true), []);

  const burst = useCallback(() => {
    // Honour a stated preference for less motion — an easter egg is never worth
    // making someone feel ill.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const key = seq.current++;
    const spuds: Spud[] = Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      // Spread wide sideways; gravity does the rest.
      dx: (Math.random() - 0.5) * 2 * (70 + Math.random() * 190),
      // Barely a hop. The title sits about 40px from the top of the window, so
      // anything more clips against the top edge at the apex.
      peak: -(4 + Math.random() * 14),
      fall: 260 + Math.random() * 260,
      rotation: (Math.random() - 0.5) * 900,
      scale: 0.7 + Math.random() * 0.9,
      delay: Math.random() * 90,
    }));

    setBursts((current) => [
      ...current,
      { key, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, spuds },
    ]);

    window.setTimeout(
      () => setBursts((current) => current.filter((b) => b.key !== key)),
      LIFETIME_MS + 200,
    );
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={burst}
        aria-label="Potato"
        title="Go on, click it"
        className="cursor-pointer text-3xl leading-none transition-transform active:scale-90"
      >
        🥔
      </button>

      {mounted &&
        bursts.length > 0 &&
        createPortal(
          <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
            {bursts.map((b) => (
              <div
                key={b.key}
                className="absolute size-0"
                style={{ left: b.x, top: b.y }}
              >
                {b.spuds.map((spud) => (
                  <span
                    key={spud.id}
                    className="potato-burst-x"
                    style={
                      {
                        "--dx": `${spud.dx}px`,
                        "--delay": `${spud.delay}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className="potato-burst-y"
                      style={
                        {
                          "--peak": `${spud.peak}px`,
                          "--fall": `${spud.fall}px`,
                          "--rot": `${spud.rotation}deg`,
                          "--scale": spud.scale,
                          "--delay": `${spud.delay}ms`,
                        } as React.CSSProperties
                      }
                    >
                      🥔
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
