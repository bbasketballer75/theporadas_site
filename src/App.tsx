import { BackgroundAudio } from './components/BackgroundAudio';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Gallery } from './components/Gallery';
import './components/gallery.css';
import { GuestMessages } from './components/GuestMessages';
import { Head } from './components/Head';
import { HeroVideo } from './components/HeroVideo';
import { IntroVideo } from './components/IntroVideo';
import { MotionToggle } from './components/MotionToggle';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { SiteNav } from './components/SiteNav';
import { ThemeToggle } from './components/ThemeToggle';
import { VideoPlayer } from './components/VideoPlayer/VideoPlayer';
import { getNonHeroSections } from './content/loader';
import './designSystem.css';
import { useHashNavigation } from './hooks/useHashNavigation';
import { useRoutePerformance } from './hooks/usePerformanceMonitor';
import { listVideos } from './video/registry';

import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense } from 'react';

// Lazy load heavy components
const LazyFamilyTree = React.lazy(() =>
  import('./components/FamilyTree').then((module) => ({ default: module.FamilyTree })),
);
const LazyMap = React.lazy(() => import('./components/Map'));

// Loading fallback component
const LoadingFallback = ({ component }: { component: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
    <div>Loading {component}...</div>
  </div>
);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Initialize route performance monitoring
  useRoutePerformance();

  // Exclude the markdown 'gallery' section because we now have a dedicated
  // interactive Gallery component. Rendering both creates duplicate
  // landmarks with the same accessible name triggering axe landmark-unique.
  const sections = getNonHeroSections().filter((s) => s.frontmatter.slug !== 'gallery');
  const { hash } = useHashNavigation();

  return (
    <QueryClientProvider client={queryClient}>
      <main id="appShell" tabIndex={-1}>
        <Head />
        <IntroVideo>
          <section className="snap-section hero" aria-label="Welcome">
            <HeroVideo caption="Poradas Wedding Feature">
              <div className="stack" style={{ textAlign: 'center' }}>
                <h1 className="display">
                  <span className="hero-accent">The Poradas Wedding Videos</span>
                </h1>
                <p>
                  A celebration in sage & blush. This is an evolving immersive experience—sections
                  will appear here as they are completed.
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
        </IntroVideo>
        <section className="snap-section" aria-label="Video Feature">
          <div className="card stack">
            <h2>Feature Video</h2>
            {(() => {
              const [hero] = listVideos();
              if (!hero) return <p>No video available.</p>;
              return (
                <ErrorBoundary>
                  <VideoPlayer
                    qualitySources={hero.quality}
                    caption={hero.caption}
                    placeholderLabel={hero.placeholderLabel}
                  />
                </ErrorBoundary>
              );
            })()}
          </div>
        </section>
        <section id="gallery" className="snap-section" aria-label="Gallery">
          <div className="card stack">
            <h2 id="gallery-heading">Gallery</h2>
            <ErrorBoundary>
              <Gallery headingId="gallery-heading" />
            </ErrorBoundary>
          </div>
        </section>
        <section id="family-tree" className="snap-section" aria-label="Family Tree">
          <div className="card stack">
            <h2 id="family-tree-heading">Family Tree</h2>
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback component="Family Tree" />}>
                <LazyFamilyTree width={800} height={600} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </section>
        <section id="guest-messages" className="snap-section" aria-label="Guest Messages">
          <div className="card stack">
            <h2 id="guest-messages-heading">Guest Messages</h2>
            <ErrorBoundary>
              <GuestMessages />
            </ErrorBoundary>
          </div>
        </section>
        <section id="location" className="snap-section" aria-label="Location">
          <div className="card stack">
            <h2 id="location-heading">Location</h2>
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback component="Map" />}>
                <LazyMap />
              </Suspense>
            </ErrorBoundary>
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
              aria-labelledby={headingId}
            >
              <div className="card stack" dangerouslySetInnerHTML={{ __html: html }} />
            </section>
          );
        })}
        <BackgroundAudio src="/media/audio/first-time-acoustic.mp3" />
        <PerformanceMonitor />
      </main>
    </QueryClientProvider>
  );
}

// Wrap the App with Sentry ErrorBoundary
export default Sentry.withErrorBoundary(App, {
  fallback: ({ resetError }: { resetError: () => void }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1>Something went wrong</h1>
      <p>We apologize for the inconvenience. Our team has been notified.</p>
      <button
        onClick={resetError}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#4ecdc4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  ),
});
