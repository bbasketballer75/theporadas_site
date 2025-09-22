import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense } from 'react';

import { BackgroundAudio } from './components/BackgroundAudio';
import {
  CopilotAutoApprovalPanel,
  CopilotModeSelector,
  CopilotNotificationPanel,
  CopilotToolPanel,
} from './components/CopilotFeatures';
import { ErrorBoundary } from './components/ErrorBoundary';
import './components/gallery.css';
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
import { ModeManager } from './utils/modeManager';
import { listVideos } from './video/registry';

// Lazy load heavy components
const LazyFamilyTree = React.lazy(() => import('./components/FamilyTree'));
const LazyMap = React.lazy(() => import('./components/Map'));
const LazyGallery = React.lazy(() =>
  import('./components/Gallery').then((module) => ({ default: module.Gallery })),
);
const LazyGuestMessages = React.lazy(() =>
  import('./components/GuestMessages').then((module) => ({ default: module.GuestMessages })),
);

// Loading fallback component
const LoadingFallback = ({ component }: { component: string }) => (
  <div className="loading-fallback">
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
              <div className="stack hero-center">
                <h1 className="display">
                  <span className="hero-accent">The Poradas Wedding Videos</span>
                </h1>
                <p>
                  A celebration in sage & blush. This is an evolving immersive experience—sections
                  will appear here as they are completed.
                </p>
                <div className="stack hero-actions">
                  <SiteNav active={hash} />
                  <div className="toggle-row">
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
              <Suspense fallback={<LoadingFallback component="Gallery" />}>
                <LazyGallery headingId="gallery-heading" />
              </Suspense>
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
              <Suspense fallback={<LoadingFallback component="Guest Messages" />}>
                <LazyGuestMessages />
              </Suspense>
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
        <section id="copilot-features" className="snap-section" aria-label="Copilot Features">
          <div className="card stack">
            <h2 id="copilot-features-heading">Copilot Features</h2>
            <CopilotModeSelector modeManager={new ModeManager()} onModeChange={() => {}} />
            <CopilotNotificationPanel notifications={[]} onDismiss={() => {}} onAction={() => {}} />
            <CopilotToolPanel tools={[]} onToggleTool={() => {}} onExecuteTool={() => {}} />
            <CopilotAutoApprovalPanel
              rules={[]}
              onToggleRule={() => {}}
              onAddRule={() => {}}
              onEditRule={() => {}}
              onDeleteRule={() => {}}
            />
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

export default App;
