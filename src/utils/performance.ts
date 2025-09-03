import * as Sentry from '@sentry/react';
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

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
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const;

// Performance metrics storage
const performanceMetrics: PerformanceMetric[] = [];

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
  Sentry.addBreadcrumb({
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
  if (Sentry.setMeasurement) {
    Sentry.setMeasurement(metric.name, metric.value, 'millisecond');
  }
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

// Initialize Core Web Vitals tracking
export function initCoreWebVitals() {
  // Largest Contentful Paint
  onLCP((metric) => {
    if (import.meta.env.DEV) {
      console.log('LCP:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // First Input Delay
  onFID((metric) => {
    if (import.meta.env.DEV) {
      console.log('FID:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // Cumulative Layout Shift
  onCLS((metric) => {
    if (import.meta.env.DEV) {
      console.log('CLS:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // First Contentful Paint
  onFCP((metric) => {
    if (import.meta.env.DEV) {
      console.log('FCP:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // Time to First Byte
  onTTFB((metric) => {
    if (import.meta.env.DEV) {
      console.log('TTFB:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });

  // Interaction to Next Paint
  onINP((metric) => {
    if (import.meta.env.DEV) {
      console.log('INP:', metric);
    }
    storeMetric(metric);
    reportToSentry(metric);
  });
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
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing a user interaction
  startTiming(name: string): void {
    this.marks.set(name, performance.now());
  }

  // End timing and measure the duration
  endTiming(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    this.measures.set(name, duration);

    // Report to Sentry if duration is significant (>100ms)
    if (duration > 100) {
      Sentry.addBreadcrumb({
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
  if (import.meta.env.DEV) {
    console.group('🚀 Performance Metrics');
    console.table(getPerformanceMetrics());
    console.log('Summary:', getPerformanceSummary());
    console.groupEnd();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
