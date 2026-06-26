import { RenderResult, render as RTLRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReactNode } from 'react';

export function render(ui: ReactNode, options?: Omit<Parameters<typeof RTLRender>[1], 'wrapper'>): RenderResult {
  const queryClient = new QueryClient();

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  return RTLRender(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';