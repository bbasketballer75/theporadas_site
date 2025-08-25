import { useEffect, useState } from 'react';

interface HashState {
  hash: string;
}

export function useHashNavigation(focus = true): HashState {
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#/, ''));
  useEffect(() => {
    function apply(targetHash: string) {
      setHash(targetHash);
      if (!targetHash) return;
      const el = document.getElementById(targetHash);
      if (el) {
        if (typeof (el as HTMLElement).scrollIntoView === 'function') {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (focus) {
          const prevTabIndex = (el as HTMLElement).getAttribute('tabindex');
          (el as HTMLElement).setAttribute('tabindex', '-1');
          (el as HTMLElement).focus({ preventScroll: true });
          setTimeout(() => {
            if (prevTabIndex === null) (el as HTMLElement).removeAttribute('tabindex');
            else (el as HTMLElement).setAttribute('tabindex', prevTabIndex);
          }, 100);
        }
      }
    }
    function onHashChange() {
      apply(window.location.hash.replace(/^#/, ''));
    }
    window.addEventListener('hashchange', onHashChange);
    if (window.location.hash) apply(window.location.hash.replace(/^#/, ''));
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [focus]);
  return { hash };
}
