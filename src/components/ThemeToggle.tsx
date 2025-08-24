import React, { useEffect, useState } from 'react';

const THEME_KEY = 'siteTheme'; // values: 'light' | 'dark'

function getInitialTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('theme-light');
    else root.classList.remove('theme-light');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  function toggle() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }

  const label = theme === 'light' ? 'Theme: Light' : 'Theme: Dark';
  const next = theme === 'light' ? 'Switch to Dark' : 'Switch to Light';

  return (
    <button
      type="button"
      className="btn btn-outline theme-toggle"
      aria-pressed={theme === 'light'}
      aria-label={next}
      onClick={toggle}
    >
      {label}
    </button>
  );
}
