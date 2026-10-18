import React, { Component, type ReactNode } from 'react';
import { MainView } from '../routes';
import { ErrorState } from '../components/shared/ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ClinSync Web Uncaught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <ErrorState
            title="Application Error"
            message={this.state.errorMessage || 'An unexpected rendering error occurred.'}
            code="REACT_RENDER_CRASH"
            onRetry={() => this.setState({ hasError: false, errorMessage: '' })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <MainView />
    </ErrorBoundary>
  );
};

export default App;
