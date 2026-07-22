'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by GlobalErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-screen" className="min-h-screen bg-[#f5efe6] flex items-center justify-center p-6 select-none font-serif relative overflow-hidden">
          {/* Subtle parchment grain overlay pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Elegant hand-crafted "torn-edge" container */}
          <div id="error-boundary-card" className="relative w-full max-w-lg bg-[#faf6f0] border-l-4 border-[#8c2d19] rounded-sm p-10 md:p-12 shadow-[0_10px_35px_-5px_rgba(44,38,32,0.15)] transition-all duration-300">
            {/* Decentered stylized Ink Smudge background graphic using safe pure Tailwind classes */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-[#1e1e1a] via-[#2c2c24] to-transparent rounded-full opacity-10 filter blur-2xl pointer-events-none" />
            
            {/* Ink blot accent */}
            <div className="flex justify-center mb-8">
              <div className="relative w-16 h-16 bg-[#1a1a15] rounded-full shadow-[0_0_15px_rgba(26,26,21,0.5)] transform rotate-12 flex items-center justify-center">
                {/* Splatter dots */}
                <div className="absolute top-2 left-10 w-3 h-3 bg-[#1a1a15] rounded-full opacity-90 transform -translate-x-1" />
                <div className="absolute -bottom-1 -left-2 w-4 h-4 bg-[#1a1a15] rounded-full opacity-80" />
                <div className="absolute top-12 -right-1 w-2.5 h-2.5 bg-[#1a1a15] rounded-full opacity-90" />
                
                {/* Custom quill inkwell emblem inside blot */}
                <span className="text-2xl text-[#f5efe6] select-none font-serif transform -rotate-12 italic font-bold">~</span>
              </div>
            </div>

            {/* Typography & Copy per UX guidance */}
            <h1 className="text-3xl text-[#2c2620] font-bold text-center tracking-tight mb-4">
              An Ink Smudge Has Obscured This Page
            </h1>
            
            <p className="text-[#5c4e43] text-center italic text-base leading-relaxed mb-8 max-w-sm mx-auto">
              "The spine of this digital volume has experienced a temporary tear, spilling ink across the active discussion threads."
            </p>

            {/* Error detail hidden behind an elegant fold/summary for security and cleanliness */}
            {this.state.error && (
              <details className="mb-8 border border-[#e6dec9] bg-[#fcf9f2] rounded p-4 text-left cursor-pointer group">
                <summary className="text-xs text-[#8c7b6c] select-none font-sans font-medium tracking-wide uppercase hover:text-[#5c4e43]">
                  Inspect the stain details
                </summary>
                <p className="mt-2 text-xs text-[#a63a2b] font-mono leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </details>
            )}

            {/* Refined primary action */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                id="error-reload-btn"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-3 bg-[#8c2d19] hover:bg-[#6e2213] text-[#faf6f0] text-sm font-sans tracking-wide font-semibold rounded-md shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Re-bind the Page
              </button>
              
              <button
                id="error-reset-btn"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full sm:w-auto px-6 py-3 border border-[#d6cbba] hover:bg-[#eae1d4] text-[#5c4e43] text-sm font-sans tracking-wide font-semibold rounded-md transition-all duration-200 cursor-pointer"
              >
                Clear Ink Blot
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
