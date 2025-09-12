import { Metric, onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

import { IS_DEV } from './env';
import { addBreadcrumb, captureMessage, setMeasurement } from './sentryClient';

// Types for performance metrics
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  navigationType?: string;
}

// Thresholds for Core Web Vitals (in milliseconds)
export const CORE_WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const;

// Performance metrics storage
const performanceMetrics: PerformanceMetric[] = [];

// Safe performance helpers
interface PerformanceWithMemory extends Performance {
  memory?: { usedJSHeapSize?: number };
}

function getPerf(): PerformanceWithMemory | undefined {
  // Guard for non-DOM environments
  return typeof performance !== 'undefined' ? (performance as PerformanceWithMemory) : undefined;
}

function now(): number {
  const perf = getPerf();
  return perf && typeof perf.now === 'function' ? perf.now() : Date.now();
}

// Get rating based on metric value and thresholds
function getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds =
    CORE_WEB_VITALS_THRESHOLDS[metricName as keyof typeof CORE_WEB_VITALS_THRESHOLDS];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

// Send metric to Sentry
function reportToSentry(metric: Metric) {
  const rating = getRating(metric.name, metric.value);

  // Create a performance metric event
  void addBreadcrumb({
    category: 'performance',
    message: `${metric.name}: ${metric.value}ms (${rating})`,
    level: rating === 'poor' ? 'warning' : 'info',
    data: {
      metric: metric.name,
      value: metric.value,
      rating,
      navigationType: metric.navigationType,
    },
  });

  // Send as a measurement if supported
  void setMeasurement(metric.name, metric.value, 'millisecond');
}

// Store metric locally for analysis
function storeMetric(metric: Metric) {
  const performanceMetric: PerformanceMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    timestamp: Date.now(),
    navigationType: metric.navigationType,
  };

  performanceMetrics.push(performanceMetric);

  // Keep only last 100 metrics to prevent memory issues
  if (performanceMetrics.length > 100) {
    performanceMetrics.shift();
  }
}

// Memory usage tracking for leak detection
let memoryCheckInterval: number | null = null;
const memoryHistory: number[] = [];
const MAX_MEMORY_HISTORY = 10;

// Check for memory leaks
function checkMemoryLeaks() {
  const perf = getPerf();
  const currentMemory = perf?.memory?.usedJSHeapSize;
  if (typeof currentMemory === 'number') {
    memoryHistory.push(currentMemory);

    if (memoryHistory.length > MAX_MEMORY_HISTORY) {
      memoryHistory.shift();
    }

    // Check if memory is consistently increasing
    if (memoryHistory.length >= 5) {
      const recent = memoryHistory.slice(-5);
      const increasing = recent.every((mem, i) => i === 0 || mem >= recent[i - 1]);
      const growthRate = (recent[recent.length - 1] - recent[0]) / recent[0];

      if (increasing && growthRate > 0.1) {
        // 10% growth over last 5 checks
        void captureMessage('Potential memory leak detected', {
          level: 'warning',
          extra: {
            memoryHistory: [...memoryHistory],
            growthRate,
            currentMemory,
          },
        });

        if (IS_DEV) {
          console.warn('🚨 Potential memory leak detected:', {
            memoryHistory: [...memoryHistory],
            growthRate,
            currentMemory,
          });
        }
      }
    }
  }
}

// Monitor long tasks
function initLongTaskMonitoring() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          // Long task threshold
          void addBreadcrumb({
            category: 'performance',
            message: `Long task: ${entry.duration.toFixed(2)}ms`,
            level: 'warning',
            data: {
              duration: entry.duration,
              startTime: entry.startTime,
            },
          });

          if (IS_DEV) {
            console.warn('🐌 Long task detected:', entry.duration.toFixed(2) + 'ms');
          }
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  }
}

// Monitor frame drops (if supported)
function initFrameDropMonitoring() {
  if ('requestAnimationFrame' in window) {
    let lastTime = now();
    let frameCount = 0;
    let droppedFrames = 0;

    const checkFrameRate = () => {
      const currentTime = now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime > 16.67 * 2) {
        // More than 2 frames missed (at 60fps)
        droppedFrames++;
      }

      frameCount++;

      // Report every 60 frames (~1 second at 60fps)
      if (frameCount >= 60) {
        const dropRate = (droppedFrames / frameCount) * 100;

        if (dropRate > 10) {
          // More than 10% frame drops
          void addBreadcrumb({
            category: 'performance',
            message: `High frame drop rate: ${dropRate.toFixed(1)}%`,
            level: 'warning',
            data: { dropRate, droppedFrames, frameCount },
          });

          if (IS_DEV) {
            console.warn('🎬 High frame drop rate:', dropRate.toFixed(1) + '%');
          }
        }

        frameCount = 0;
        droppedFrames = 0;
      }

      lastTime = currentTime;
      requestAnimationFrame(checkFrameRate);
    };

    requestAnimationFrame(checkFrameRate);
  }
}

// Initialize Core Web Vitals tracking
export function initCoreWebVitals() {
  // Largest Contentful Paint
  onLCP((metric) => {
    if (IS_DEV) {
      console.log('LCP:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // Cumulative Layout Shift
  onCLS((metric) => {
    if (IS_DEV) {
      console.log('CLS:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // First Contentful Paint
  onFCP((metric) => {
    if (IS_DEV) {
      console.log('FCP:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // Time to First Byte
  onTTFB((metric) => {
    if (IS_DEV) {
      console.log('TTFB:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // Interaction to Next Paint (replaces FID)
  onINP((metric) => {
    if (IS_DEV) {
      console.log('INP:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // Initialize runtime performance monitoring
  initLongTaskMonitoring();
  initFrameDropMonitoring();

  // Start memory leak detection (check every 30 seconds)
  if (!memoryCheckInterval) {
    memoryCheckInterval = window.setInterval(checkMemoryLeaks, 30000);
  }
}

// Get stored performance metrics
export function getPerformanceMetrics(): PerformanceMetric[] {
  return [...performanceMetrics];
}

// Get metrics summary
export function getPerformanceSummary() {
  const summary = {
    total: performanceMetrics.length,
    good: 0,
    needsImprovement: 0,
    poor: 0,
    averageValues: {} as Record<string, number>,
  };

  const metricCounts: Record<string, number[]> = {};

  performanceMetrics.forEach((metric) => {
    if (metric.rating === 'good') summary.good++;
    else if (metric.rating === 'needs-improvement') summary.needsImprovement++;
    else if (metric.rating === 'poor') summary.poor++;

    if (!metricCounts[metric.name]) {
      metricCounts[metric.name] = [];
    }
    metricCounts[metric.name].push(metric.value);
  });

  // Calculate averages
  Object.entries(metricCounts).forEach(([name, values]) => {
    summary.averageValues[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
  });

  return summary;
}

// Custom performance monitoring for user interactions
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private marks: Map<string, number> = new Map(); // Fallback for browsers without performance.mark
  private measures: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing a user interaction using performance.mark for precision
  startTiming(name: string): void {
    if ('mark' in performance) {
      try {
        performance.mark(name + '-start');
      } catch {
        // Fallback to timestamp helper
        this.marks.set(name, now());
      }
    } else {
      this.marks.set(name, now());
    }
  }

  // End timing and measure the duration using performance.measure
  endTiming(name: string): number | null {
    let duration: number;

    if ('mark' in performance && 'measure' in performance) {
      try {
        performance.mark(name + '-end');
        performance.measure(name, name + '-start', name + '-end');

        const measureEntry = performance.getEntriesByName(name)[0];
        duration = measureEntry.duration;

        // Clear the marks and measure to prevent memory buildup
        performance.clearMarks(name + '-start');
        performance.clearMarks(name + '-end');
        performance.clearMeasures(name);
      } catch {
        // Fallback to timestamp helper
        const startTime = this.marks.get(name);
        if (!startTime) return null;
        duration = now() - startTime;
        this.marks.delete(name);
      }
    } else {
      // Fallback for older browsers
      const startTime = this.marks.get(name);
      if (!startTime) return null;
      duration = now() - startTime;
      this.marks.delete(name);
    }

    this.measures.set(name, duration);

    // Report to Sentry if duration is significant (>100ms)
    if (duration > 100) {
      void addBreadcrumb({
        category: 'user-interaction',
        message: `User interaction "${name}": ${duration.toFixed(2)}ms`,
        level: duration > 1000 ? 'warning' : 'info',
        data: { duration, interaction: name },
      });
    }

    return duration;
  }

  // Measure function execution time
  measureFunctionExecution<T>(name: string, fn: () => T): T {
    this.startTiming(name);
    try {
      const result = fn();
      this.endTiming(name);
      return result;
    } catch (error) {
      this.endTiming(name);
      throw error;
    }
  }

  // Get all measures
  getMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures);
  }

  // Clear all marks and measures
  clear(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();

  return {
    startTiming: (name: string) => monitor.startTiming(name),
    endTiming: (name: string) => monitor.endTiming(name),
    measureFunctionExecution: <T>(name: string, fn: () => T) =>
      monitor.measureFunctionExecution(name, fn),
    getMeasures: () => monitor.getMeasures(),
    clear: () => monitor.clear(),
  };
}

// Development utilities
export function logPerformanceInDev() {
  if (IS_DEV) {
    console.group('🚀 Performance Metrics');
    console.table(getPerformanceMetrics());
    console.log('Summary:', getPerformanceSummary());
    console.groupEnd();
  }
}

// Cleanup function to stop monitoring
export function stopPerformanceMonitoring() {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }
  memoryHistory.length = 0;
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
