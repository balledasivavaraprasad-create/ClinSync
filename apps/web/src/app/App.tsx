import React, { Component, useState, useEffect, type ReactNode } from 'react';
import { MainView } from '../routes';
import { LandingPage } from '../features/landing';
import { LoginPage, type LoginSuccessPayload } from '../features/authentication';
import { ErrorState } from '../components/shared/ErrorState';
import { ThemeProvider } from '../lib/theme';
import { LanguageProvider } from '../lib/i18n';

type TabType = 'dashboard' | 'kiosk' | 'ledger' | 'appointments' | 'doctor' | 'profile' | 'staff';

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

function parseRoute(): { view: 'landing' | 'login' | 'app'; tab: TabType } {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const pathname = window.location.pathname || '';

  // Check if hash/path points to login
  if (hash.startsWith('#/login') || search.includes('view=login') || pathname.startsWith('/login')) {
    return { view: 'login', tab: 'doctor' };
  }

  // Check if hash points to the prototype
  if (
    hash.startsWith('#/app') ||
    hash.startsWith('#/dashboard') ||
    hash.startsWith('#/kiosk') ||
    hash.startsWith('#/doctor') ||
    hash.startsWith('#/staff') ||
    hash.startsWith('#/ledger') ||
    hash.startsWith('#/appointments') ||
    hash.startsWith('#/profile') ||
    search.includes('view=app') ||
    search.includes('app=1') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/kiosk') ||
    pathname.startsWith('/doctor') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/dashboard')
  ) {
    let tab: TabType = 'dashboard';
    if (hash.includes('kiosk') || pathname.startsWith('/kiosk')) tab = 'kiosk';
    else if (hash.includes('doctor') || pathname.startsWith('/doctor')) tab = 'doctor';
    else if (hash.includes('staff') || pathname.startsWith('/staff')) tab = 'staff';
    else if (hash.includes('ledger') || pathname.startsWith('/ledger')) tab = 'ledger';
    else if (hash.includes('appointments') || pathname.startsWith('/appointments')) tab = 'appointments';
    else if (hash.includes('profile') || pathname.startsWith('/profile')) tab = 'profile';

    return { view: 'app', tab };
  }

  return { view: 'landing', tab: 'dashboard' };
}

export const App: React.FC = () => {
  const [route, setRoute] = useState<'landing' | 'login' | 'app'>(() => parseRoute().view);
  const [activeTab, setActiveTab] = useState<TabType>(() => parseRoute().tab);
  const [currentUser, setCurrentUser] = useState<LoginSuccessPayload | null>(null);
  const [loginTargetRole, setLoginTargetRole] = useState<'doctor' | 'kiosk' | 'auditor' | 'staff'>('doctor');

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
    const targetTab = tab || 'dashboard';
    setActiveTab(targetTab);
    setRoute('app');
    window.location.hash = targetTab === 'dashboard' ? '#/dashboard' : `#/${targetTab}`;
    window.scrollTo(0, 0);
  };

  const handleOpenLogin = (role?: 'doctor' | 'kiosk' | 'auditor' | 'staff') => {
    if (role) {
      setLoginTargetRole(role);
    }
    setRoute('login');
    window.location.hash = '#/login';
    window.scrollTo(0, 0);
  };

  const handleLoginSuccess = (payload: LoginSuccessPayload) => {
    setCurrentUser(payload);
    let targetTab: TabType = 'kiosk';
    if (payload.role === 'doctor') {
      targetTab = 'doctor';
    } else if (payload.role === 'staff' || (payload.role as string) === 'nurse') {
      targetTab = 'staff';
    } else if (payload.role === 'auditor') {
      targetTab = 'ledger';
    } else {
      targetTab = 'kiosk';
    }

    setActiveTab(targetTab);
    setRoute('app');
    window.location.hash = `#/${targetTab}`;
    window.scrollTo(0, 0);
  };

  const handleBackToLanding = () => {
    setCurrentUser(null);
    setRoute('landing');
    window.location.hash = '#/';
    window.scrollTo(0, 0);
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ErrorBoundary>
          {route === 'landing' ? (
            <LandingPage onLaunchApp={handleLaunchApp} onOpenLogin={handleOpenLogin} />
          ) : route === 'login' ? (
            <LoginPage
              initialRole={loginTargetRole}
              onLoginSuccess={handleLoginSuccess}
              onBackToLanding={handleBackToLanding}
            />
          ) : (
            <MainView
              initialTab={activeTab}
              currentUser={currentUser}
              onBackToLanding={handleBackToLanding}
              onOpenLogin={handleOpenLogin}
            />
          )}
        </ErrorBoundary>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
