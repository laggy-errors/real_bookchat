'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePaperFoldUnfold } from '../animations/physics';
import { audioService } from '../services/audio-service';
import { apiClient } from '../lib/api-client';
import { 
  X, 
  Hourglass, 
  MessageSquare, 
  BookOpen, 
  Compass, 
  TrendingUp, 
  Sparkles,
  FileText,
  Bookmark
} from 'lucide-react';

interface BookAnalytics {
  bookId: string;
  bookTitle: string;
  readingTime: number; // in minutes
  pagesRead: number;
  chaptersCompleted: number;
  lastOpened: string;
  messageCount: number;
}

interface AnalyticsData {
  totalReadingTime: number; // in minutes
  totalMessages: number;
  bookBreakdown: BookAnalytics[];
}

interface ReadingAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReadingAnalyticsModal({ isOpen, onClose }: ReadingAnalyticsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Apply parchment fold animation
  usePaperFoldUnfold(modalRef, isOpen, { direction: 'top', tension: 1.6 });

  // Load analytics when open
  useEffect(() => {
    if (!isOpen) return;

    audioService.playPaperShuffle();
    setIsLoading(true);
    setErrorMsg(null);

    const fetchAnalytics = async () => {
      try {
        const response = await apiClient<AnalyticsData>('/api/reading-progress/analytics');
        if (response) {
          setData(response);
        } else {
          setErrorMsg('Unable to translate the chronicler logs at this time.');
        }
      } catch (err: any) {
        console.error('[Analytics] Error fetching data:', err);
        setErrorMsg('Failed to fetch the parchment scroll of reading histories.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to format minutes elegantly
  const formatTime = (minutes: number) => {
    if (minutes === 0) return '0 minutes';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hrs > 0) {
      return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
    }
    return `${mins} min${mins > 1 ? 's' : ''}`;
  };

  // Sum up auxiliary stats
  const totalPagesRead = data?.bookBreakdown.reduce((sum, b) => sum + b.pagesRead, 0) || 0;
  const totalChaptersCompleted = data?.bookBreakdown.reduce((sum, b) => sum + b.chaptersCompleted, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none animate-fade-in">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl bg-paper-surface border-2 border-accent-gold rounded-lg shadow-book overflow-hidden text-ink-primary font-sans relative flex flex-col max-h-[85vh]"
        style={{ transformOrigin: 'top center' }}
      >
        {/* Parchment texture overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.01)_0%,transparent_100%)] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-b from-accent-gold via-accent-gold/40 to-transparent" />

        {/* Lintel header matching classic leather spine */}
        <div className="bg-[#1e130a] text-paper-surface px-4 py-3 flex items-center justify-between border-b border-accent-gold/30 shrink-0">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent-gold animate-spin-slow" />
            <span className="font-playfair text-xs md:text-sm tracking-widest uppercase text-accent-gold font-bold">
              Scriptorium Reading Analytics
            </span>
          </div>
          <button 
            onClick={() => {
              onClose();
              audioService.playPaperShuffle();
            }}
            className="text-paper-surface/60 hover:text-paper-surface hover:bg-white/5 p-1 rounded-full transition-all cursor-pointer focus:outline-none"
            title="Close parchment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll Content Body */}
        <div className="p-6 overflow-y-auto scrollbar-thin space-y-6 flex-1 text-left">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-accent-gold border-t-transparent animate-spin" />
              <p className="text-xs font-serif italic text-ink-muted">
                Consulting the library scribes and cataloging pages...
              </p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded bg-[#fcf5e3] border border-[#e6dbb9] text-[#5c3e16] font-serif text-sm italic text-center leading-relaxed">
              &ldquo;{errorMsg}&rdquo;
            </div>
          ) : (
            <div className="space-y-6">
              {/* Introduction */}
              <div className="text-center max-w-md mx-auto">
                <h3 className="text-xl md:text-2xl font-playfair font-bold text-ink-primary tracking-tight">
                  Your Archival Footprint
                </h3>
                <p className="text-xs font-serif italic text-ink-muted mt-1 leading-relaxed">
                  Every page turned, margin note scribed, and minute spent in deep contemplation is meticulously cataloged below.
                </p>
              </div>

              {/* Grid of Bento Core stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Reading Time */}
                <div className="bg-paper-surface-dim border border-paper-border/70 rounded-lg p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-accent-gold/40 transition-all">
                  <div className="absolute right-[-10px] bottom-[-10px] text-accent-gold/5 pointer-events-none select-none group-hover:scale-110 transition-transform">
                    <Hourglass className="w-16 h-16" />
                  </div>
                  <div className="text-accent-gold/80 mb-2">
                    <Hourglass className="w-5 h-5 text-[#8f2d1b]" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted block leading-none mb-1">
                      Time Scribed
                    </span>
                    <span className="text-lg md:text-xl font-serif font-black text-ink-primary block leading-none">
                      {formatTime(data?.totalReadingTime || 0)}
                    </span>
                  </div>
                </div>

                {/* Total Messages Sent */}
                <div className="bg-paper-surface-dim border border-paper-border/70 rounded-lg p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-accent-gold/40 transition-all">
                  <div className="absolute right-[-10px] bottom-[-10px] text-accent-gold/5 pointer-events-none select-none group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-16 h-16" />
                  </div>
                  <div className="text-accent-gold/80 mb-2">
                    <MessageSquare className="w-5 h-5 text-[#8f2d1b]" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted block leading-none mb-1">
                      Inscriptions
                    </span>
                    <span className="text-lg md:text-xl font-serif font-black text-ink-primary block leading-none">
                      {data?.totalMessages || 0} <span className="text-xs font-normal text-ink-muted">msgs</span>
                    </span>
                  </div>
                </div>

                {/* Total Pages Read */}
                <div className="bg-paper-surface-dim border border-paper-border/70 rounded-lg p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-accent-gold/40 transition-all">
                  <div className="absolute right-[-10px] bottom-[-10px] text-accent-gold/5 pointer-events-none select-none group-hover:scale-110 transition-transform">
                    <FileText className="w-16 h-16" />
                  </div>
                  <div className="text-accent-gold/80 mb-2">
                    <FileText className="w-5 h-5 text-[#8f2d1b]" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted block leading-none mb-1">
                      Pages Visited
                    </span>
                    <span className="text-lg md:text-xl font-serif font-black text-ink-primary block leading-none">
                      {totalPagesRead} <span className="text-xs font-normal text-ink-muted">pages</span>
                    </span>
                  </div>
                </div>

                {/* Chapters Completed */}
                <div className="bg-paper-surface-dim border border-paper-border/70 rounded-lg p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-accent-gold/40 transition-all">
                  <div className="absolute right-[-10px] bottom-[-10px] text-accent-gold/5 pointer-events-none select-none group-hover:scale-110 transition-transform">
                    <BookOpen className="w-16 h-16" />
                  </div>
                  <div className="text-accent-gold/80 mb-2">
                    <BookOpen className="w-5 h-5 text-[#8f2d1b]" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted block leading-none mb-1">
                      Completed
                    </span>
                    <span className="text-lg md:text-xl font-serif font-black text-ink-primary block leading-none">
                      {totalChaptersCompleted} <span className="text-xs font-normal text-ink-muted">sections</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Book Breakdown List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-widest text-accent-gold font-serif border-b border-paper-border/50 pb-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[#8f2d1b]" />
                  Bound Ledger Breakdown
                </div>

                {!data || data.bookBreakdown.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-paper-border rounded bg-paper-surface-dim/30">
                    <Bookmark className="w-8 h-8 text-ink-light mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-serif italic text-ink-muted">
                      No chronicles have been cataloged in your private library shelf yet.
                    </p>
                    <p className="text-[10px] text-ink-light italic mt-1">
                      Seek or create a volume to begin cataloging.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.bookBreakdown.map((b) => (
                      <div 
                        key={b.bookId}
                        className="bg-paper-surface border border-paper-border/80 rounded-lg p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden group hover:border-accent-gold/50"
                      >
                        {/* Elegant side ledger line */}
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-accent-gold/30 group-hover:bg-accent-gold transition-colors" />

                        {/* Left Side: Book Title and Last Active */}
                        <div className="pl-2.5">
                          <h4 className="text-sm font-bold font-serif text-ink-primary group-hover:text-accent-gold transition-colors">
                            {b.bookTitle}
                          </h4>
                          <p className="text-[10px] text-ink-muted italic mt-0.5">
                            Last Active: {b.lastOpened ? new Date(b.lastOpened).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Never'}
                          </p>
                        </div>

                        {/* Right Side: Specific statistics */}
                        <div className="flex items-center gap-4 pl-2.5 md:pl-0 border-t md:border-t-0 border-paper-border/40 pt-2.5 md:pt-0">
                          <div className="text-center shrink-0 min-w-[70px]">
                            <span className="text-[8px] uppercase tracking-wider text-ink-muted block">Reading Time</span>
                            <span className="text-xs font-mono font-bold text-ink-primary block mt-0.5">
                              {b.readingTime}m
                            </span>
                          </div>

                          <div className="text-center shrink-0 min-w-[70px] border-l border-paper-border/50">
                            <span className="text-[8px] uppercase tracking-wider text-ink-muted block">Progress</span>
                            <span className="text-xs font-mono font-bold text-ink-primary block mt-0.5">
                              p. {b.pagesRead}
                            </span>
                          </div>

                          <div className="text-center shrink-0 min-w-[70px] border-l border-paper-border/50">
                            <span className="text-[8px] uppercase tracking-wider text-ink-muted block">Inscriptions</span>
                            <span className="text-xs font-mono font-bold text-[#8f2d1b] block mt-0.5">
                              {b.messageCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Decorative signature of quality */}
              <div className="pt-4 border-t border-paper-border/60 flex items-center justify-between text-[10px] text-ink-light font-serif italic select-none">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
                  <span>Scribe Ledger Certified</span>
                </div>
                <span>Cataloged via Scriptorium Engine</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
