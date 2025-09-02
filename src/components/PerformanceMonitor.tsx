import React, { useEffect, useState } from 'react';
import { getPerformanceMetrics, getPerformanceSummary, logPerformanceInDev } from '../utils/performance';

interface PerformanceMonitorProps {
  showInProduction?: boolean;
}

export function PerformanceMonitor({ showInProduction = false }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState(() => getPerformanceMetrics());
  const [summary, setSummary] = useState(() => getPerformanceSummary());
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development or if explicitly enabled for production
  const shouldShow = import.meta.env.DEV || showInProduction;

  useEffect(() => {
    if (!shouldShow) return;

    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      setMetrics(getPerformanceMetrics());
      setSummary(getPerformanceSummary());
    }, 5000);

    return () => clearInterval(interval);
  }, [shouldShow]);

  useEffect(() => {
    // Log to console in development
    if (import.meta.env.DEV) {
      logPerformanceInDev();
    }
  }, [metrics]);

  if (!shouldShow) return null;

  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <strong>Performance Monitor</strong>
        <button
          onClick={toggleVisibility}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          aria-label={isVisible ? 'Hide performance metrics' : 'Show performance metrics'}
        >
          {isVisible ? '−' : '+'}
        </button>
      </div>

      {isVisible && (
        <>
          <div style={{ marginBottom: '10px' }}>
            <div>Total Metrics: {summary.total}</div>
            <div>Good: {summary.good} | Needs Improvement: {summary.needsImprovement} | Poor: {summary.poor}</div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>Average Values:</strong>
            {Object.entries(summary.averageValues).map(([metric, avg]) => (
              <div key={metric} style={{ marginLeft: '10px' }}>
                {metric}: {avg.toFixed(2)}ms
              </div>
            ))}
          </div>

          <div>
            <strong>Recent Metrics:</strong>
            {metrics.slice(-5).map((metric, index) => (
              <div key={index} style={{
                marginLeft: '10px',
                color: metric.rating === 'good' ? '#4CAF50' :
                       metric.rating === 'needs-improvement' ? '#FF9800' : '#F44336'
              }}>
                {metric.name}: {metric.value.toFixed(2)}ms ({metric.rating})
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              console.table(metrics);
              console.log('Performance Summary:', summary);
            }}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: '#4ecdc4',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Log to Console
          </button>
        </>
      )}
    </div>
  );
}

// Hook for programmatic access to performance data
export function usePerformanceData() {
  const [metrics, setMetrics] = useState(getPerformanceMetrics());
  const [summary, setSummary] = useState(getPerformanceSummary());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getPerformanceMetrics());
      setSummary(getPerformanceSummary());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { metrics, summary };
}