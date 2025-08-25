import React from 'react';

import { HeroVideo } from './components/HeroVideo';
import { MotionToggle } from './components/MotionToggle';
import { SiteNav } from './components/SiteNav';
import { ThemeToggle } from './components/ThemeToggle';
import { VideoPlayer } from './components/VideoPlayer/VideoPlayer';
import { getNonHeroSections } from './content/loader';
import { useHashNavigation } from './hooks/useHashNavigation';
import { listVideos } from './video/registry';
import './designSystem.css';

export default function App() {
  const sections = getNonHeroSections();
  const { hash } = useHashNavigation();
  return (
    <div id="appShell" role="main" tabIndex={-1}>
      <section className="snap-section hero" aria-label="Welcome">
        <HeroVideo caption="Poradas Wedding Feature">
          <div className="stack" style={{ textAlign: 'center' }}>
            <h1 className="display">
              <span className="hero-accent">The Poradas Wedding Videos</span>
            </h1>
            <p>
              A celebration in sage & blush. This is an evolving immersive experience—sections will
              appear here as they are completed.
            </p>
            <div className="stack" style={{ alignItems: 'center' }}>
              <SiteNav active={hash} />
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <MotionToggle />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </HeroVideo>
      </section>
      <section className="snap-section" aria-label="Video Feature">
        <div className="card stack">
          <h2>Feature Video</h2>
          {(() => {
            const [hero] = listVideos();
            if (!hero) return <p>No video available.</p>;
            return (
              <VideoPlayer
                qualitySources={hero.quality}
                caption={hero.caption}
                placeholderLabel={hero.placeholderLabel}
              />
            );
          })()}
        </div>
      </section>
      {sections.map((s) => {
        const headingId = `${s.frontmatter.slug}-heading`;
        // Inject id into first h2 occurrence for aria-labelledby reference
        const html = s.html.replace('<h2', `<h2 id="${headingId}"`);
        return (
          <section
            key={s.frontmatter.slug}
            id={s.frontmatter.slug}
            className="snap-section"
            role="region"
            aria-labelledby={headingId}
          >
            <div className="card stack" dangerouslySetInnerHTML={{ __html: html }} />
          </section>
        );
      })}
    </div>
  );
}
