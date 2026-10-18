import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, ThemeToggle, useTheme } from '../lib/theme';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const storageMock = createLocalStorageMock();
Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  writable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

const TestConsumer = () => {
  const { theme, isDark, isLight } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="is-dark">{isDark ? 'yes' : 'no'}</span>
      <span data-testid="is-light">{isLight ? 'yes' : 'no'}</span>
      <ThemeToggle />
    </div>
  );
};

describe('ClinSync Theme Architecture', () => {
  beforeEach(() => {
    storageMock.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.className = '';
  });

  it('initializes with dark theme by default and sets document data-theme', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(screen.getByTestId('is-dark').textContent).toBe('yes');
    expect(screen.getByTestId('is-light').textContent).toBe('no');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles seamlessly between dark and light themes on button click', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId('btn-theme-toggle');
    expect(toggleBtn).toBeInTheDocument();

    // Click to switch to Light
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(screen.getByTestId('is-light').textContent).toBe('yes');
    expect(screen.getByTestId('is-dark').textContent).toBe('no');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(storageMock.getItem('clinsync_theme_preference')).toBe('light');

    // Click again to switch back to Dark
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(screen.getByTestId('is-dark').textContent).toBe('yes');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(storageMock.getItem('clinsync_theme_preference')).toBe('dark');
  });

  it('restores theme from localStorage if previously configured', () => {
    storageMock.setItem('clinsync_theme_preference', 'light');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
