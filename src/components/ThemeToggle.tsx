import React, { useEffect, useState } from 'react';

const THEME_KEY = 'siteTheme'; // values: 'light' | 'dark'

function getInitialTheme(): 'light' | 'dark' {
  console.log('ThemeToggle: getInitialTheme called');
  try {
    const stored = localStorage.getItem(THEME_KEY);
    console.log('ThemeToggle: stored theme from localStorage:', stored);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      console.log('ThemeToggle: prefers light theme');
      return 'light';
    }
  } catch {
    /* ignore */
  }
  console.log('ThemeToggle: defaulting to dark theme');
  return 'dark';
}

export function ThemeToggle() {
  console.log('ThemeToggle: component mounted');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme());

  useEffect(() => {
    console.log('ThemeToggle: useEffect triggered, theme:', theme);
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
    console.log('ThemeToggle: toggle function called, current theme:', theme);
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
      data-testid="theme-toggle"
    >
      {label}
    </button>
  );
}
