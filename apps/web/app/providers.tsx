'use client';

import React from 'react';
import { QueryProvider } from '../providers/query-provider';
import { ThemeSync } from '../providers/theme-sync';
import { GlobalErrorBoundary } from '../components/error-boundary';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <GlobalErrorBoundary>
      <QueryProvider>
        <ThemeSync />
        {children}
      </QueryProvider>
    </GlobalErrorBoundary>
  );
}
