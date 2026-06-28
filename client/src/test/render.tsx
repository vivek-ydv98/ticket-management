import { render as RTLRender } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { ThemeProvider } from '../lib/useTheme';

export function render(ui: ReactNode, options?: Omit<Parameters<typeof RTLRender>[1], 'wrapper'>): RenderResult {
  const queryClient = new QueryClient();

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  };

  return RTLRender(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';