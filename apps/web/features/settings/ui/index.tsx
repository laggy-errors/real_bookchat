'use client';

import React, { useEffect, useState } from 'react';
import { useSettings } from '../hooks';
import { THEMES, ThemeType } from '../../../app/tokens';
import { audioService } from '../../../services/audio-service';
import { useUserStore } from '../../../stores/user-store';
import { useRouter } from 'next/navigation';
import { 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Zap, 
  ZapOff, 
  Type, 
  Sliders, 
  Sparkles,
  Check
} from 'lucide-react';

export function SettingsForm() {
  const {
    theme,
    highContrast,
    largeText,
    reducedMotion,
    masterMute,
    uiVolume,
    writingVolume,
    ambienceVolume,
    isLoading,
    setTheme,
    toggleHighContrast,
    toggleLargeText,
    toggleReducedMotion,
    setMasterMute,
    setUiVolume,
    setWritingVolume,
    setAmbienceVolume
  } = useSettings();

  const { user, logout } = useUserStore();
  const router = useRouter();

  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<any | null>(null);
  const [confirmBookTitle, setConfirmBookTitle] = useState('');
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [bookDeleteError, setBookDeleteError] = useState<string | null>(null);

  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [confirmAccountName, setConfirmAccountName] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState<string | null>(null);
  const [blockingBooks, setBlockingBooks] = useState<{ id: string; title: string }[]>([]);

  const getRequiredConfirmName = (u: any): string => {
    if (!u) return 'scribe';
    const candidate = u.username || u.displayName || u.name || (u.email ? u.email.split('@')[0] : '') || u.email || 'scribe';
    return String(candidate).trim() || 'scribe';
  };

  const requiredConfirmName = getRequiredConfirmName(user);

  const handleDeleteAccount = async () => {
    if (confirmAccountName.trim() !== requiredConfirmName) return;
    setIsDeletingAccount(true);
    setAccountDeleteError(null);
    setBlockingBooks([]);
    audioService.playRibbonSlide();

    try {
      const response = await fetch('/api/users/me/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        audioService.playPaperShuffle();
        if (data.books && Array.isArray(data.books)) {
          setBlockingBooks(data.books);
        }
        setAccountDeleteError(data.message || 'Unable to delete account.');
        return;
      }

      audioService.playPaperShuffle();
      await logout();
      window.location.href = '/?deleted=true';
    } catch (err: any) {
      audioService.playPaperShuffle();
      setAccountDeleteError(err.message || 'An unexpected error occurred while deleting account.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  useEffect(() => {
    const fetchBooks = async () => {
      if (!user) return;
      setIsLoadingBooks(true);
      try {
        const response = await fetch('/api/books/mine', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
          }
        });
        const data = await response.json();
        const list = data?.data || data || [];
        if (Array.isArray(list)) {
          const userCreated = list.filter((b: any) => b.creatorId === user.id);
          setMyBooks(userCreated);
        }
      } catch (err) {
        console.error('Failed to load owned books in Settings:', err);
      } finally {
        setIsLoadingBooks(false);
      }
    };
    fetchBooks();
  }, [user]);

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (confirmBookTitle !== bookTitle) return;
    setIsDeletingBook(true);
    setBookDeleteError(null);
    audioService.playRibbonSlide();

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setBookDeleteError(data.message || 'An unexpected error occurred during volume dissolution.');
        audioService.playPaperShuffle();
        return;
      }

      audioService.playPaperShuffle();
      setMyBooks(prev => prev.filter(b => b.id !== bookId));
      setBookToDelete(null);
      setConfirmBookTitle('');
    } catch (err: any) {
      setBookDeleteError(err.message || 'An unexpected error occurred during volume dissolution.');
      audioService.playPaperShuffle();
    } finally {
      setIsDeletingBook(false);
    }
  };



  // Play journal opening sensory sound on initial mount
  useEffect(() => {
    audioService.playJournalOpen();
  }, []);

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    audioService.playRibbonSlide();
  };

  const handleSliderChange = (type: 'ui' | 'writing' | 'ambience', value: number) => {
    if (type === 'ui') {
      setUiVolume(value);
      audioService.playPaperShuffle();
    } else if (type === 'writing') {
      setWritingVolume(value);
      audioService.playPenScratch(0.12, 1000);
    } else if (type === 'ambience') {
      setAmbienceVolume(value);
      // Let the audio service adjust live ambient drones
      setTimeout(() => {
        audioService.updateAmbienceVolume();
      }, 50);
    }
  };

  return (
    <div id="settings-journal" className="space-y-6 pt-2 pb-4 font-serif text-ink-primary select-none animate-fade-in">
      
      {/* Decorative Gold Header Plaque */}
      <div className="text-center pb-3 border-b border-paper-border/60">
        <span className="text-[9px] uppercase font-bold tracking-widest text-accent-gold block">
          Cabinet Configuration
        </span>
        <h3 className="text-xl font-playfair font-black text-ink-primary mt-0.5">
          Vellum & Atmosphere
        </h3>
        <p className="text-[10px] font-serif italic text-ink-muted">
          Persisted to archival registry ledger
        </p>
      </div>

      {/* 1. Six Premium Theme Presets (Notebook Grid layout) */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold tracking-widest text-accent-gold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Desk Vellum Presets
        </label>
        
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(THEMES) as ThemeType[]).map((key) => {
            const t = THEMES[key];
            const isSelected = theme === key;

            // Render theme swatch dots
            const getSwatchBg = (tKey: ThemeType) => {
              if (tKey === 'classic-library') return 'bg-[#fdfaf2] border-[#2e1d13]';
              if (tKey === 'vintage-journal') return 'bg-[#f1e6cf] border-[#46382e]';
              if (tKey === 'night-reading') return 'bg-[#2d1d15] border-[#f6ebd8]';
              if (tKey === 'rainy-evening') return 'bg-[#e2e8f0] border-[#1a202c]';
              if (tKey === 'fireplace') return 'bg-[#3a1e12] border-[#130803]';
              if (tKey === 'collector-edition') return 'bg-[#fffff4] border-[#0f2e1e]';
              if (tKey === 'lined-journal') return 'bg-[#faf6ee] border-[#9e1b32]';
              return 'bg-white';
            };

            return (
              <button
                key={key}
                type="button"
                id={`theme-btn-${key}`}
                onClick={() => handleThemeChange(key)}
                className={`p-2 rounded text-left border transition-all relative flex flex-col justify-between h-[85px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-gold ${
                  isSelected 
                    ? 'border-accent-gold bg-paper-surface-dim/80 shadow-inner' 
                    : 'border-paper-border hover:border-accent-gold/40 hover:bg-paper-surface-dim/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-serif leading-tight">
                      {t.name}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-accent-gold" />
                    )}
                  </div>
                  <p className="text-[9px] text-ink-secondary italic leading-tight mt-0.5 opacity-80 line-clamp-2">
                    {t.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 mt-1.5">
                  <div className={`w-3 h-3 rounded-full border ${getSwatchBg(key)}`} />
                  <span className="text-[8px] uppercase tracking-wider text-ink-muted">
                    {key.replace('-', ' ')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Skeuomorphic Audio atmosphere simulation with 3 sliders */}
      <div className="space-y-3 pt-2 border-t border-paper-border/30">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-bold tracking-widest text-accent-gold flex items-center gap-1.5">
            <Sliders className="w-3 h-3" />
            Acoustic Tuning
          </label>
          
          <button
            type="button"
            id="master-mute-toggle"
            onClick={() => setMasterMute(!masterMute)}
            className={`p-1 rounded border transition-all flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold cursor-pointer ${
              masterMute 
                ? 'bg-status-error-bg border-status-error text-accent-red' 
                : 'bg-paper-surface-dim border-paper-border text-ink-primary hover:border-accent-gold'
            }`}
          >
            {masterMute ? (
              <>
                <VolumeX className="w-3 h-3 text-accent-red" />
                Muted
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-accent-gold" />
                Audible
              </>
            )}
          </button>
        </div>

        <div className="space-y-2 bg-paper-surface-dim/60 p-2.5 rounded border border-paper-border/40">
          
          {/* UI Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold">Paper Rustle Volume (Flipped pages)</span>
              <span className="text-[9px] font-mono opacity-60">{Math.round(uiVolume * 100)}%</span>
            </div>
            <input
              type="range"
              id="slider-ui-volume"
              min="0"
              max="1"
              step="0.05"
              value={uiVolume}
              disabled={masterMute}
              onChange={(e) => handleSliderChange('ui', parseFloat(e.target.value))}
              className="w-full h-1 bg-paper-border rounded-lg appearance-none cursor-pointer accent-accent-gold disabled:opacity-30"
            />
          </div>

          {/* Quill / Writing Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold">Quill Friction Volume (Pen scratches)</span>
              <span className="text-[9px] font-mono opacity-60">{Math.round(writingVolume * 100)}%</span>
            </div>
            <input
              type="range"
              id="slider-writing-volume"
              min="0"
              max="1"
              step="0.05"
              value={writingVolume}
              disabled={masterMute}
              onChange={(e) => handleSliderChange('writing', parseFloat(e.target.value))}
              className="w-full h-1 bg-paper-border rounded-lg appearance-none cursor-pointer accent-accent-gold disabled:opacity-30"
            />
          </div>

          {/* Background Atmosphere Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold">Ambient Drone Volume (Study chamber)</span>
              <span className="text-[9px] font-mono opacity-60">{Math.round(ambienceVolume * 100)}%</span>
            </div>
            <input
              type="range"
              id="slider-ambience-volume"
              min="0"
              max="1"
              step="0.05"
              value={ambienceVolume}
              disabled={masterMute}
              onChange={(e) => handleSliderChange('ambience', parseFloat(e.target.value))}
              className="w-full h-1 bg-paper-border rounded-lg appearance-none cursor-pointer accent-accent-gold disabled:opacity-30"
            />
          </div>

        </div>
      </div>

      {/* 3. Accessibility Toggles (Volume 13 section 14) */}
      <div className="space-y-2 pt-2 border-t border-paper-border/30">
        <label className="text-[10px] uppercase font-bold tracking-widest text-accent-gold flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          Archival Accessibility
        </label>

        <div className="space-y-1.5">
          {/* Reduced Motion */}
          <button
            type="button"
            id="reduced-motion-toggle"
            onClick={toggleReducedMotion}
            className={`w-full p-2 rounded border flex items-center justify-between text-left transition-all text-[11px] cursor-pointer ${
              reducedMotion 
                ? 'bg-paper-surface-dim border-accent-gold font-bold shadow-inner' 
                : 'border-paper-border hover:border-accent-gold/40 hover:bg-paper-surface-dim/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {reducedMotion ? <ZapOff className="w-3.5 h-3.5 text-accent-gold" /> : <Zap className="w-3.5 h-3.5 opacity-60" />}
              <div>
                <p className="font-serif leading-tight">Reduce Paper Mechanics</p>
                <p className="text-[9px] text-ink-muted leading-none">Freeze curved 3D leaf folds and flips</p>
              </div>
            </div>
            <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${reducedMotion ? 'bg-accent-gold' : 'bg-paper-border'}`}>
              <div className={`bg-paper-surface w-2.5 h-2.5 rounded-full shadow-md transform transition-transform duration-200 ${reducedMotion ? 'translate-x-2.5' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* High Contrast */}
          <button
            type="button"
            id="high-contrast-toggle"
            onClick={toggleHighContrast}
            className={`w-full p-2 rounded border flex items-center justify-between text-left transition-all text-[11px] cursor-pointer ${
              highContrast 
                ? 'bg-paper-surface-dim border-accent-gold font-bold shadow-inner' 
                : 'border-paper-border hover:border-accent-gold/40 hover:bg-paper-surface-dim/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 opacity-60" />
              <div>
                <p className="font-serif leading-tight">High Contrast Ink</p>
                <p className="text-[9px] text-ink-muted leading-none">Force absolute bone-white and obsidian colors</p>
              </div>
            </div>
            <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${highContrast ? 'bg-accent-gold' : 'bg-paper-border'}`}>
              <div className={`bg-paper-surface w-2.5 h-2.5 rounded-full shadow-md transform transition-transform duration-200 ${highContrast ? 'translate-x-2.5' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* Text Scale */}
          <button
            type="button"
            id="large-text-toggle"
            onClick={toggleLargeText}
            className={`w-full p-2 rounded border flex items-center justify-between text-left transition-all text-[11px] cursor-pointer ${
              largeText 
                ? 'bg-paper-surface-dim border-accent-gold font-bold shadow-inner' 
                : 'border-paper-border hover:border-accent-gold/40 hover:bg-paper-surface-dim/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Type className="w-3.5 h-3.5 opacity-60" />
              <div>
                <p className="font-serif leading-tight">Enlarge Folio Text</p>
                <p className="text-[9px] text-ink-muted leading-none">Magnify letter spacing and typography scales</p>
              </div>
            </div>
            <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${largeText ? 'bg-accent-gold' : 'bg-paper-border'}`}>
              <div className={`bg-paper-surface w-2.5 h-2.5 rounded-full shadow-md transform transition-transform duration-200 ${largeText ? 'translate-x-2.5' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* 4. Danger Zone Section (Visually distinct muted red container) */}
      <div id="danger-zone-section" className="space-y-4 pt-4 border-t-2 border-dashed border-red-300/80 dark:border-red-900/60 select-text">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <h4 className="text-xs uppercase font-bold tracking-widest text-red-800 dark:text-red-400">
            Danger Zone — Irreversible Actions
          </h4>
        </div>

        {/* 4A. My Volumes (Dissolution Desk) */}
        <div id="my-volumes-dissolution" className="bg-red-50/50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200/60 space-y-3">
          <label className="text-[10px] uppercase font-bold tracking-wider text-red-800 dark:text-red-400 block">
            Volume Dissolution Desk
          </label>
          <p className="text-[11px] text-ink-secondary leading-relaxed">
            As the creator of a volume, you have the authority to permanently dissolve and destroy the volume. This action will remove the book, its discussions, and bookmarks for <strong className="font-bold text-red-900">ALL members</strong> permanently.
          </p>

          {isLoadingBooks ? (
            <p className="text-[10px] text-ink-muted italic">Scanning library shelves...</p>
          ) : myBooks.length === 0 ? (
            <p className="text-[11px] text-ink-muted italic font-serif text-center py-2">
              You haven't authored any circulating volumes yet.
            </p>
          ) : (
            <div className="space-y-3">
              {myBooks.map((b) => (
                <div key={b.id} className="bg-white/80 dark:bg-black/20 p-3 rounded border border-red-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-ink-primary font-serif">{b.title}</p>
                    <p className="text-[10px] text-ink-muted">Code: <span className="font-mono">{b.code || b.id}</span></p>
                  </div>

                  {bookToDelete?.id === b.id ? (
                    <div className="w-full md:w-auto space-y-2">
                      <div className="bg-paper-surface border border-red-200 p-2.5 rounded shadow-inner text-center font-serif italic text-xs text-ink-muted">
                        <p className="text-[10px] text-red-800 non-italic font-sans uppercase font-bold tracking-wider mb-1">
                          Verify Dissolution Signature
                        </p>
                        <p className="text-[10.5px] leading-snug mb-1.5">
                          Type exact title <strong className="text-ink-primary font-bold not-italic font-serif">"{b.title}"</strong> to authorize destruction:
                        </p>
                        <input
                          type="text"
                          value={confirmBookTitle}
                          onChange={(e) => setConfirmBookTitle(e.target.value)}
                          placeholder="Type volume title..."
                          className="w-full bg-[#faf8f4] border border-[#d3c2a3] rounded px-2.5 py-1 text-center text-xs font-handwritten text-ink-primary focus:outline-none focus:border-red-500"
                        />
                        {bookDeleteError && (
                          <p className="text-[10px] text-red-600 font-sans font-bold not-italic mt-1.5">
                            ✦ {bookDeleteError}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBookToDelete(null);
                            setConfirmBookTitle('');
                            setBookDeleteError(null);
                            audioService.playPaperShuffle();
                          }}
                          className="flex-1 py-1.5 bg-paper-surface hover:bg-paper-surface-dim border border-paper-border text-ink-secondary rounded text-[10px] uppercase font-bold tracking-wider transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={confirmBookTitle !== b.title || isDeletingBook}
                          onClick={() => handleDeleteBook(b.id, b.title)}
                          className={`flex-1 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all text-white border text-center ${
                            confirmBookTitle === b.title && !isDeletingBook
                              ? 'bg-red-700 hover:bg-red-800 border-red-800'
                              : 'bg-red-200 border-red-300 text-red-700/50 cursor-not-allowed'
                          }`}
                        >
                          {isDeletingBook ? 'Dissolving...' : 'Dissolve 🕳'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setBookToDelete(b);
                        setConfirmBookTitle('');
                        setBookDeleteError(null);
                        audioService.playPaperShuffle();
                      }}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[10px] uppercase font-bold tracking-wider transition-all hover:scale-[1.02]"
                    >
                      Delete This Book
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4B. Account Deletion Subsection */}
        <div id="account-deletion-desk" className="bg-red-100/40 dark:bg-red-950/30 p-4 rounded-lg border border-red-300/80 space-y-3">
          <label className="text-[10px] uppercase font-bold tracking-wider text-red-900 dark:text-red-300 block">
            Permanently Delete Account
          </label>
          <p className="text-[11px] text-ink-secondary leading-relaxed">
            Permanently remove your scribe account, credentials, and settings. Messages you wrote in shared volumes will remain attributed to <strong className="font-bold text-ink-primary">"Deleted Scribe"</strong> to maintain transcript continuity for other members.
          </p>

          {!isDeleteAccountOpen ? (
            <button
              type="button"
              id="btn-open-delete-account"
              onClick={() => {
                setIsDeleteAccountOpen(true);
                setConfirmAccountName('');
                setAccountDeleteError(null);
                setBlockingBooks([]);
                audioService.playPaperShuffle();
              }}
              className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white border border-red-900 rounded text-[11px] uppercase font-bold tracking-wider transition-all hover:scale-[1.01] cursor-pointer shadow-sm"
            >
              Delete My Account
            </button>
          ) : (
            <div className="bg-[#fbf9f4] dark:bg-[#1a120b] border border-[#d9c8b0] dark:border-red-900/60 p-3.5 rounded shadow-inner space-y-3 font-serif">
              <p className="text-red-900 dark:text-red-400 font-bold font-sans text-[10px] uppercase tracking-wider">
                Handwritten Confirmation Required
              </p>
              <p className="text-[11px] text-ink-secondary leading-relaxed italic">
                To confirm permanent account deletion, write your exact account username <strong className="font-bold text-ink-primary not-italic font-mono">{requiredConfirmName}</strong> below:
              </p>

              <input
                type="text"
                id="input-confirm-account-username"
                value={confirmAccountName}
                onChange={(e) => setConfirmAccountName(e.target.value)}
                placeholder={`Type "${requiredConfirmName}"...`}
                className="w-full bg-[#f4ebd0] dark:bg-black/40 border border-[#d3c2a3] dark:border-red-900/50 rounded px-3 py-1.5 text-xs font-handwritten text-ink-primary focus:outline-none focus:border-red-600 shadow-inner"
              />

              {accountDeleteError && (
                <div className="space-y-2 bg-red-100/90 dark:bg-red-900/40 p-2.5 rounded border border-red-300 font-sans text-[11px] text-red-900 dark:text-red-200">
                  <p className="font-bold">✦ {accountDeleteError}</p>

                  {blockingBooks.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <p className="text-[10px] uppercase font-bold text-red-950 dark:text-red-100">
                        Volumes blocking account deletion ({blockingBooks.length}):
                      </p>
                      {blockingBooks.map((bk) => (
                        <div key={bk.id} className="flex items-center justify-between text-xs bg-white/90 dark:bg-black/50 p-2 rounded border border-red-200">
                          <span className="font-serif font-bold text-ink-primary">📖 {bk.title}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const matchingMyBook = myBooks.find(b => b.id === bk.id) || bk;
                              setBookToDelete(matchingMyBook);
                              setConfirmBookTitle('');
                              setBookDeleteError(null);
                              const el = document.getElementById('my-volumes-dissolution');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-all"
                          >
                            Resolve / Dissolve Volume &rarr;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteAccountOpen(false);
                    setConfirmAccountName('');
                    setAccountDeleteError(null);
                    setBlockingBooks([]);
                    audioService.playPaperShuffle();
                  }}
                  className="flex-1 py-1.5 bg-paper-surface hover:bg-paper-surface-dim border border-paper-border text-ink-secondary rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-account"
                  disabled={confirmAccountName.trim() !== requiredConfirmName || isDeletingAccount}
                  onClick={handleDeleteAccount}
                  className={`flex-1 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all text-white border text-center cursor-pointer ${
                    confirmAccountName.trim() === requiredConfirmName && !isDeletingAccount
                      ? 'bg-red-800 hover:bg-red-900 border-red-900 shadow-sm'
                      : 'bg-red-200 border-red-300 text-red-700/50 cursor-not-allowed'
                  }`}
                >
                  {isDeletingAccount ? 'Erasing Credentials...' : 'Permanently Delete Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>



    </div>
  );
}
