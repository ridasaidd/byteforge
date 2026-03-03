import { useEffect, useState } from 'react';

const DESKTOP_FALLBACK_WIDTH = 1024;
const RESIZE_DEBOUNCE_MS = 100;

function getViewportWidth(): number {
  if (typeof window === 'undefined') return DESKTOP_FALLBACK_WIDTH;

  const candidates = [
    window.innerWidth,
    window.visualViewport?.width,
    document.documentElement?.clientWidth,
    document.body?.clientWidth,
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);

  return candidates.length > 0 ? Math.round(Math.min(...candidates)) : DESKTOP_FALLBACK_WIDTH;
}

export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => getViewportWidth());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const scheduleUpdate = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setWidth(getViewportWidth());
      }, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('resize', scheduleUpdate);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => scheduleUpdate());
      if (document.documentElement) {
        resizeObserver.observe(document.documentElement);
      }
      if (document.body) {
        resizeObserver.observe(document.body);
      }
    }

    scheduleUpdate();

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      resizeObserver?.disconnect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return width;
}
