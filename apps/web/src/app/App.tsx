import React, { Component, useState, useEffect, type ReactNode } from 'react';
import { MainView } from '../routes';
import { LandingPage } from '../features/landing';
import { ErrorState } from '../components/shared/ErrorState';

type TabType = 'kiosk' | 'ledger' | 'appointments' | 'doctor' | 'showroom' | 'mock-api' | 'visual-qa';

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

function parseRoute(): { view: 'landing' | 'app'; tab: TabType } {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const pathname = window.location.pathname || '';

  // Check if hash points to the prototype
  if (hash.startsWith('#/app') || hash.startsWith('#/kiosk') || hash.startsWith('#/doctor') ||
      hash.startsWith('#/ledger') || hash.startsWith('#/appointments') || hash.startsWith('#/visual-qa') ||
      hash.startsWith('#/showroom') || hash.startsWith('#/mock-api') ||
      search.includes('view=app') || search.includes('app=1') || pathname.startsWith('/app')) {
    let tab: TabType = 'kiosk';
    if (hash.includes('doctor')) tab = 'doctor';
    else if (hash.includes('ledger')) tab = 'ledger';
    else if (hash.includes('appointments')) tab = 'appointments';
    else if (hash.includes('visual-qa')) tab = 'visual-qa';
    else if (hash.includes('showroom')) tab = 'showroom';
    else if (hash.includes('mock-api')) tab = 'mock-api';

    return { view: 'app', tab };
  }

  return { view: 'landing', tab: 'kiosk' };
}

export const App: React.FC = () => {
  const [route, setRoute] = useState<'landing' | 'app'>(() => parseRoute().view);
  const [activeTab, setActiveTab] = useState<TabType>(() => parseRoute().tab);

  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseRoute();
      setRoute(parsed.view);
      setActiveTab(parsed.tab);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLaunchApp = (tab?: TabType) => {
    const targetTab = tab || 'kiosk';
    setActiveTab(targetTab);
    setRoute('app');
    window.location.hash = targetTab === 'kiosk' ? '#/app' : `#/app/${targetTab}`;
    window.scrollTo(0, 0);
  };

  const handleBackToLanding = () => {
    setRoute('landing');
    window.location.hash = '#/';
    window.scrollTo(0, 0);
  };

  return (
    <ErrorBoundary>
      {route === 'landing' ? (
        <LandingPage onLaunchApp={handleLaunchApp} />
      ) : (
        <MainView initialTab={activeTab} onBackToLanding={handleBackToLanding} />
      )}
    </ErrorBoundary>
  );
};

export default App;
