import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In a real app, you might want to send this to an error reporting service
    // Example: errorReportingService.report(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  handleReportError = () => {
    if (this.state.error && this.state.errorId) {
      // In a real app, this could open a feedback form or send error details
      const errorDetails = {
        id: this.state.errorId,
        message: this.state.error.message,
        stack: this.state.error.stack,
        timestamp: new Date().toISOString(),
      };
      console.log('Error reported:', errorDetails);
      alert('Error details have been logged. Thank you for your feedback.');
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { showErrorDetails = false } = this.props;

      return (
        <div
          style={{
            padding: '20px',
            border: '2px solid #ff6b6b',
            borderRadius: '8px',
            backgroundColor: '#ffe6e6',
            color: '#d63031',
            textAlign: 'center',
            margin: '20px 0',
          }}
          role="alert"
          aria-live="assertive"
          aria-labelledby="error-heading"
          aria-describedby="error-description"
        >
          <h3 id="error-heading" style={{ margin: '0 0 10px 0', fontSize: '1.2em' }}>
            Something went wrong
          </h3>
          <p id="error-description" style={{ margin: '0 0 15px 0' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>

          {showErrorDetails && this.state.error?.stack && (
            <details style={{ marginBottom: '15px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Technical Details (for developers)
              </summary>
              <pre
                style={{
                  backgroundColor: '#f8f8f8',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  marginTop: '10px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleRetry}
              style={{
                marginTop: '15px',
                padding: '8px 16px',
                backgroundColor: '#d63031',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              aria-label="Try to reload this section"
            >
              Try Again
            </button>

            <button
              onClick={this.handleReportError}
              style={{
                marginTop: '15px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#d63031',
                border: '1px solid #d63031',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              aria-label="Report this error to developers"
            >
              Report Error
            </button>
          </div>

          {/* Screen reader announcement for error recovery */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            Error occurred. Use the Try Again button to reload or Report Error to send feedback.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
