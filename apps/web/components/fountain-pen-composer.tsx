'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { ChevronDown, CornerDownLeft, FileText, Paperclip, X } from 'lucide-react';
import { audioService } from '../services/audio-service';
import { useThemeStore } from '../stores/theme-store';
import { apiClient } from '../lib/api-client';

export type InkColor = 'blue' | 'red' | 'black' | 'green';

export interface InkColorConfig {
  name: string;
  hex: string;
  wetHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const INK_COLORS: Record<InkColor, InkColorConfig> = {
  blue: {
    name: 'Royal Blue',
    hex: '#1e40af',
    wetHex: '#2563eb',
    bgClass: 'bg-blue-600',
    borderClass: 'border-blue-700',
    textClass: 'text-blue-800',
  },
  red: {
    name: 'Crimson Red',
    hex: '#9e1b32',
    wetHex: '#dc2626',
    bgClass: 'bg-[#9e1b32]',
    borderClass: 'border-red-800',
    textClass: 'text-red-800',
  },
  black: {
    name: 'Ebony Black',
    hex: '#0f172a',
    wetHex: '#334155',
    bgClass: 'bg-slate-900',
    borderClass: 'border-slate-950',
    textClass: 'text-slate-900',
  },
  green: {
    name: 'Emerald Green',
    hex: '#15803d',
    wetHex: '#16a34a',
    bgClass: 'bg-emerald-700',
    borderClass: 'border-emerald-800',
    textClass: 'text-emerald-800',
  },
};

export function parseInkColor(rawText?: string): { text: string; inkColor: InkColor } {
  if (!rawText) return { text: '', inkColor: 'blue' };
  const match = rawText.match(/^\[\[ink:(blue|red|black|green)\]\]/i);
  if (match) {
    const color = match[1].toLowerCase() as InkColor;
    const cleanText = rawText.replace(/^\[\[ink:(blue|red|black|green)\]\]/i, '');
    return { text: cleanText, inkColor: color };
  }
  return { text: rawText, inkColor: 'blue' };
}

export interface AttachmentItem {
  id?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  fileName?: string;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isImageFileType(fileType?: string, fileUrl?: string): boolean {
  if (fileType && fileType.toLowerCase().startsWith('image/')) return true;
  if (fileUrl) {
    const urlLower = fileUrl.toLowerCase();
    if (urlLower.startsWith('data:image/')) return true;
    if (/\.(jpg|jpeg|png|webp|gif|svg|bmp)($|\?)/.test(urlLower)) return true;
  }
  return false;
}

interface FountainPenComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent, attachments?: AttachmentItem[], inkColor?: InkColor) => void;
  placeholder?: string;
  inkLevel: number;
  setInkLevel: React.Dispatch<React.SetStateAction<number>>;
  soundEnabled: boolean;
  isReduced: boolean;
}

export function FountainPenComposer({
  value,
  onChange,
  onSubmit,
  placeholder = "Dip your quill and scribble on the ledger...",
  inkLevel,
  setInkLevel,
  soundEnabled,
  isReduced
}: FountainPenComposerProps) {
  const theme = useThemeStore((s) => s.theme);
  const isLinedJournal = theme === 'lined-journal';

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Ink color state
  const [inkColor, setInkColor] = useState<InkColor>('blue');
  const [isInkMenuOpen, setIsInkMenuOpen] = useState(false);

  // Attachment upload state
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Coordinates tracking
  const [selectionStart, setSelectionStart] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [penTarget, setPenTarget] = useState({ x: 42, y: 12 });
  const [penPos, setPenPos] = useState({ x: 42, y: 12 });
  const [isPenDown, setIsPenDown] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastTypeTime, setLastTypeTime] = useState(0);

  // Attachment handlers
  const handleAttachClick = () => {
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const newAttachments: AttachmentItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds maximum allowed size of 25MB.`);
        }

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        const res = await apiClient<any>('/api/attachments/upload', {
          method: 'POST',
          body: JSON.stringify({
            fileData: base64Data,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
            fileName: file.name,
          }),
        });

        const uploaded = res?.data || res;
        if (uploaded && uploaded.url) {
          newAttachments.push({
            fileUrl: uploaded.url,
            fileType: uploaded.fileType || file.type,
            fileSize: uploaded.fileSize || file.size,
            fileName: uploaded.fileName || file.name,
          });
        }
      }

      setPendingAttachments(prev => [...prev, ...newAttachments]);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to seal attachment into folio clip.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!value.trim() && pendingAttachments.length === 0) || isUploading) return;

    if (isReduced) {
      onSubmit(e, pendingAttachments, inkColor);
      setPendingAttachments([]);
      return;
    }

    // Play final sweep gesture sound and pen flourish lift animation
    playScratchSound(0.18, 700);
    setIsPenDown(true);
    setPenTarget((prev) => ({ x: prev.x + 15, y: prev.y - 10 })); // Flourish motion
    
    setTimeout(() => {
      setIsPenDown(false);
      setIsTyping(false);
      onSubmit(e, pendingAttachments, inkColor);
      setPendingAttachments([]);
    }, 250);
  };

  // Smudge erasures state for Backspace
  const [recentlyDeleted, setRecentlyDeleted] = useState<
    { id: string; char: string; x: number; y: number }[]
  >([]);

  // Sound generator
  const playScratchSound = (duration = 0.08, frequency = 1200) => {
    if (isReduced) return;
    audioService.playPenScratch(duration, frequency);
  };

  // Sync cursor selection and tracking
  const syncSelection = () => {
    if (!textareaRef.current) return;
    setSelectionStart(textareaRef.current.selectionStart);
  };

  // Measure caret position
  useEffect(() => {
    if (isReduced) return;
    if (!containerRef.current || !cursorRef.current) return;

    const parentRect = containerRef.current.getBoundingClientRect();
    const cursorRect = cursorRef.current.getBoundingClientRect();

    const x = cursorRect.left - parentRect.left;
    const y = cursorRect.top - parentRect.top;

    setPenTarget({ x, y });
  }, [value, selectionStart, isFocused, isReduced]);

  // Smoothly interpolate pen position towards penTarget (60 FPS feel)
  useEffect(() => {
    if (isReduced) return;
    let animFrame: number;

    const update = () => {
      setPenPos((prev) => {
        const dx = penTarget.x - prev.x;
        const dy = penTarget.y - prev.y;
        
        // Quick glide to target
        const ease = isTyping ? 0.45 : 0.25; 
        const nextX = prev.x + dx * ease;
        const nextY = prev.y + dy * ease;

        // If very close, stop updating
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
          return penTarget;
        }

        return { x: nextX, y: nextY };
      });

      animFrame = requestAnimationFrame(update);
    };

    animFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrame);
  }, [penTarget, isTyping, isReduced]);

  // Handle Pen Typing lifecycle (Down, active, lifting, idle breathing)
  useEffect(() => {
    if (isReduced) return;
    const checkIdle = setInterval(() => {
      const elapsed = Date.now() - lastTypeTime;
      if (elapsed > 400 && isPenDown) {
        setIsPenDown(false);
      }
      if (elapsed > 1000 && isTyping) {
        setIsTyping(false);
      }
    }, 100);

    return () => clearInterval(checkIdle);
  }, [lastTypeTime, isPenDown, isTyping, isReduced]);

  // Intercept backspace to find coordinate of deleted character and trigger smudge effect
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    syncSelection();

    if (e.key === 'Backspace' && !isReduced) {
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;

      if (start === end && start > 0) {
        const charToDelete = value[start - 1];
        
        // Find the character span relative to the container
        const charSpan = containerRef.current?.querySelector(`[data-char-idx="${start - 1}"]`);
        if (charSpan && containerRef.current) {
          const parentRect = containerRef.current.getBoundingClientRect();
          const rect = charSpan.getBoundingClientRect();
          const delX = rect.left - parentRect.left;
          const delY = rect.top - parentRect.top;

          const id = `del-${Date.now()}-${Math.random()}`;
          setRecentlyDeleted((prev) => [...prev, { id, char: charToDelete, x: delX, y: delY }]);

          // Cleanup smudge after animation
          setTimeout(() => {
            setRecentlyDeleted((prev) => prev.filter((d) => d.id !== id));
          }, 550);
        }
      }
      playScratchSound(0.06, 900);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    syncSelection();
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    if (!isReduced) {
      setLastTypeTime(Date.now());
      setIsPenDown(true);
      setIsTyping(true);

      // Drain ink well slightly on each keystroke
      setInkLevel((prev) => Math.max(0, prev - 0.12));

      // Play ink scraping noise with slight random pitch frequency
      const pitch = 1100 + Math.random() * 300;
      playScratchSound(0.07, pitch);
    }
  };

  // Intercept Paste to type out text dynamically (Rapid scribbling sequence)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    if (isReduced) {
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + pastedText + value.substring(end);
      onChange(newValue);
      return;
    }

    let currentIndex = 0;
    const start = e.currentTarget.selectionStart;

    const interval = setInterval(() => {
      if (currentIndex >= pastedText.length) {
        clearInterval(interval);
        return;
      }

      const nextChar = pastedText[currentIndex];
      
      startTransition(() => {
        onChange(value.substring(0, start + currentIndex) + nextChar + value.substring(start + currentIndex));
      });

      setSelectionStart(start + currentIndex + 1);
      currentIndex++;

      setLastTypeTime(Date.now());
      setIsPenDown(true);
      setIsTyping(true);
      setInkLevel((prev) => Math.max(0, prev - 0.2));

      // Swift paste scribble noises
      playScratchSound(0.04, 1300 + Math.random() * 400);
    }, 40);
  };

  // Determine current active pen classes
  const isIdle = isFocused && !isTyping;
  const showPen = isFocused && !isReduced;

  // Render mirrored letter elements to perfectly align layout coordinates
  const renderMirroredText = () => {
    const elements: React.ReactNode[] = [];
    const len = value.length;

    for (let i = 0; i <= len; i++) {
      if (i === selectionStart && isFocused) {
        elements.push(
          <span
            key="cursor-anchor"
            ref={cursorRef}
            className="inline-block w-[1px] h-[18px] relative bg-transparent pointer-events-none"
            style={{ verticalAlign: 'baseline', margin: '0 -0.5px' }}
          >
            {/* Blinking line fallback when pen is absent */}
            {(!showPen || isReduced) && (
              <span className="absolute left-0 bottom-1 w-[1.5px] h-[15px] bg-[#9e1b32]/85 animate-pulse" />
            )}
          </span>
        );
      }

      if (i < len) {
        const char = value[i];
        if (char === '\n') {
          elements.push(<br key={`char-${i}`} />);
        } else {
          // Subtle bleeding ink color based on chosen ink color
          const activeInk = INK_COLORS[inkColor] || INK_COLORS.blue;
          const settledColor = activeInk.hex;
          const wetColor = activeInk.wetHex;

          elements.push(
            <span
              key={`char-${i}`}
              data-char-idx={i}
              className="inline-block font-handwriting select-text leading-[24px]"
              style={{
                fontFamily: "'La Belle Aurore', cursive",
                fontSize: '15px',
                color: settledColor,
                textRendering: 'optimizeSpeed',
                // Ink bleeding keyframe animation properties
                animation: isReduced ? 'none' : 'inkBleed 1.2s cubic-bezier(0.1, 0.8, 0.2, 1) forwards',
                WebkitFontSmoothing: 'antialiased',
                // Custom variables passed to keyframes
                ['--wet-color' as any]: wetColor,
                ['--settled-color' as any]: settledColor,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        }
      }
    }
    return elements;
  };

  // Dynamic angle based on movement, typing, and idle breathing states
  let penAngle = 28; // Default writing angle
  if (!isFocused) {
    penAngle = 76; // Laid flat resting in brass tray
  } else if (isIdle) {
    penAngle = 32; // Floating cursor mode
  } else if (isPenDown) {
    penAngle = 24; // Touched down firmly
  }

  // Calculate final placement coordinates of the pen container.
  // The pen SVG tip sits at SVG pixel (20, 150).
  const penLeft = penPos.x - 20;
  const penTop = penPos.y - 150;

  return (
    <div className="space-y-1.5 relative">
      
      {/* Dynamic Keyframes for Ink Bleed & Smudge effects inside container */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes inkBleed {
          0% {
            opacity: 0;
            filter: blur(1.5px);
            transform: scale(0.92) rotate(-2deg);
            color: var(--wet-color, #2563eb);
            text-shadow: 0 0 1.5px var(--wet-color, rgba(37,99,235,0.7));
          }
          20% {
            opacity: 0.95;
            filter: blur(0.4px);
            transform: scale(1.04) rotate(0.5deg);
            color: var(--wet-color, #3b82f6);
            text-shadow: 0 0 3px var(--wet-color, rgba(59,130,246,0.8));
          }
          100% {
            opacity: 1;
            filter: blur(0);
            transform: scale(1) rotate(0deg);
            color: var(--settled-color, #1e293b);
            text-shadow: none;
          }
        }

        @keyframes smudgeErase {
          0% {
            opacity: 0.85;
            filter: blur(1px);
            transform: scale(1.05) skewX(-12deg) translateY(0);
            color: #3b82f6;
          }
          40% {
            opacity: 0.45;
            filter: blur(3.5px);
            transform: scale(1.2) skewX(-18deg) translateY(-1px);
            color: #64748b;
          }
          100% {
            opacity: 0;
            filter: blur(7px);
            transform: scale(1.35) skewX(-24deg) translateY(-3px);
          }
        }

        @keyframes penFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          50% {
            transform: translate3d(0.5px, -2.5px, 0) rotate(1.5deg);
          }
        }

        @keyframes penScribble {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          25% {
            transform: translate3d(-0.4px, 0.4px, 0) rotate(-0.8deg);
          }
          75% {
            transform: translate3d(0.4px, -0.4px, 0) rotate(0.8deg);
          }
        }

        .pen-idle-breath {
          animation: penFloat 2.4s ease-in-out infinite;
        }

        .pen-active-scribble {
          animation: penScribble 0.12s linear infinite;
        }
      `}} />

      {/* COMPOSER LINED PAPER BACKGROUND (Printed onto right page) */}
      <div
        id="fountain-pen-writing-area"
        ref={containerRef}
        onClick={() => textareaRef.current?.focus()}
        className={`w-full relative rounded-lg cursor-text overflow-hidden select-none select-none-all-children ${
          isLinedJournal ? 'border border-paper-border/60' : 'border border-[#eadeca] shadow-paper-sunken'
        }`}
        style={isLinedJournal ? {
          background: 'var(--paper-surface)',
          minHeight: '80px',
          boxShadow: 'none'
        } : {
          background: 'linear-gradient(#f9f6ef 0%, #fcf9f2 100%)',
          minHeight: '80px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        {/* Ledger Red Margin Line */}
        <div className={`absolute left-[36px] top-0 bottom-0 w-[1px] pointer-events-none ${isLinedJournal ? 'bg-accent-red/25' : 'bg-red-800/15'}`} />
        <div className={`absolute left-[38px] top-0 bottom-0 w-[1px] pointer-events-none ${isLinedJournal ? 'bg-accent-red/10' : 'bg-red-800/5'}`} />

        {/* Horizontal Blue Ruling Lines */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to bottom, rgba(30,144,255,0.08) 1px, transparent 1px)',
            backgroundSize: '100% 24px',
            backgroundPosition: '0 8px'
          }}
        />

        {/* 1. PHYSICAL BACKSPACE SMUDGE ELEMENTS */}
        {recentlyDeleted.map((d) => (
          <span
            key={d.id}
            className="absolute font-handwriting select-none pointer-events-none leading-[24px]"
            style={{
              left: d.x,
              top: d.y,
              fontFamily: "'La Belle Aurore', cursive",
              fontSize: '15px',
              animation: 'smudgeErase 0.5s ease-out forwards',
            }}
          >
            {d.char === ' ' ? '\u00A0' : d.char}
          </span>
        ))}

        {/* 2. THE VISUAL MIRRORED WRITING TEXT (Renders above the paper ruling lines) */}
        <div
          className="w-full text-xs text-justify whitespace-pre-wrap break-all pointer-events-none select-none"
          style={{
            padding: '8px 12px 8px 46px',
            fontFamily: "'La Belle Aurore', cursive",
            fontSize: '15px',
            lineHeight: '24px',
            minHeight: '76px'
          }}
        >
          {renderMirroredText()}

          {/* Placeholders */}
          {value.length === 0 && !isFocused && (
            <span className="text-ink-light/50 font-serif italic text-xs leading-relaxed select-none block pt-0.5">
              {placeholder}
            </span>
          )}
        </div>

        {/* 3. INVISIBLE TEXTAREA FOR NATIVE CAPTURES & COMPATIBILITY */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextAreaChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onSelect={syncSelection}
          onPaste={handlePaste}
          onFocus={() => {
            setIsFocused(true);
            // Move pen from resting place to default position if empty
            if (value.length === 0) {
              setPenTarget({ x: 46, y: 12 });
            }
          }}
          onBlur={() => {
            setIsFocused(false);
            setIsPenDown(false);
            setIsTyping(false);
          }}
          rows={2}
          className="absolute inset-0 w-full h-full opacity-0 resize-none cursor-text font-handwriting select-text"
          style={{
            padding: '8px 12px 8px 46px',
            fontFamily: "'La Belle Aurore', cursive",
            fontSize: '15px',
            lineHeight: '24px',
            outline: 'none'
          }}
          aria-label="Handwriting Message Composer"
        />

        {/* 4. THE LIVE FOUNTAIN PEN LAYER (GPU-ACCELERATED, ROTATED, ELEVATED) */}
        {showPen && (
          <div
            className={`absolute pointer-events-none z-40 transition-all duration-75 select-none ${
              isIdle ? 'pen-idle-breath' : ''
            } ${isPenDown && isTyping ? 'pen-active-scribble' : ''}`}
            style={{
              left: `${penLeft}px`,
              top: `${penTop}px`,
              width: '40px',
              height: '150px',
              transformOrigin: '20px 150px',
              // Lean/Tilt the pen back so it doesn't block newly inscribed letters
              transform: `rotate(${penAngle}deg) scale(${isPenDown ? 0.95 : 1}) translate3d(0, ${isPenDown ? '3px' : '0px'}, 0)`,
              filter: `drop-shadow(${isPenDown ? '1.5px 3px 2px' : '4px 8px 6px'} rgba(25, 20, 15, ${isPenDown ? 0.35 : 0.2}))`,
              willChange: 'transform, left, top, filter'
            }}
          >
            <svg
              width="40"
              height="150"
              viewBox="0 0 40 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Metallic lacquer linear gradients */}
                <linearGradient id="pen-lacquer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1a1a1a" />
                  <stop offset="35%" stopColor="#3d3d3d" />
                  <stop offset="60%" stopColor="#5c5c5c" />
                  <stop offset="85%" stopColor="#222222" />
                  <stop offset="100%" stopColor="#111111" />
                </linearGradient>

                <linearGradient id="pen-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9a7f37" />
                  <stop offset="30%" stopColor="#f3d175" />
                  <stop offset="50%" stopColor="#fff2cf" />
                  <stop offset="75%" stopColor="#dcb347" />
                  <stop offset="100%" stopColor="#7e5f1c" />
                </linearGradient>

                <linearGradient id="nib-duotone" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#cca752" />
                  <stop offset="50%" stopColor="#fdf0cd" />
                  <stop offset="100%" stopColor="#b4923e" />
                </linearGradient>
              </defs>

              {/* BARREL BODY (y: 0 to 86) */}
              <path
                d="M 12 0 L 28 0 L 27 86 L 13 86 Z"
                fill="url(#pen-lacquer)"
              />
              {/* Gold Barrel End Cap */}
              <path
                d="M 12 0 L 28 0 L 27 5 L 13 5 Z"
                fill="url(#pen-gold)"
              />

              {/* COUPLING GOLD BAND (y: 86 to 93) */}
              <path
                d="M 13 86 L 27 86 L 28 93 L 12 93 Z"
                fill="url(#pen-gold)"
              />

              {/* SECTION GRIP COLLAR (y: 93 to 110) */}
              <path
                d="M 12.5 93 L 27.5 93 L 26 110 L 14 110 Z"
                fill="url(#pen-lacquer)"
              />
              <path
                d="M 14 110 L 26 110 L 25.5 113 L 14.5 113 Z"
                fill="url(#pen-gold)"
              />

              {/* THE MASTERPIECE GOLD NIB (y: 113 to 150) */}
              {/* Shoulders flared out, tapering gracefully down to the writing tip at (20, 150) */}
              <path
                d="M 14.5 113 
                   C 14.5 113, 10 120, 10 126
                   C 10 134, 18 148, 20 150 
                   C 22 148, 30 134, 30 126
                   C 30 120, 25.5 113, 25.5 113 Z"
                fill="url(#nib-duotone)"
              />

              {/* Decorative Silver/Platinum Inlay lines inside the Nib shoulders */}
              <path
                d="M 16.5 115 
                   C 16.5 115, 12.5 121, 12.5 125
                   C 12.5 131, 18.2 142, 19.5 144
                   L 20.5 144
                   C 21.8 142, 27.5 131, 27.5 125
                   C 27.5 121, 23.5 115, 23.5 115 Z"
                stroke="#e2e8f0"
                strokeWidth="0.85"
                fill="none"
                opacity="0.85"
              />

              {/* Elegant Breather Hole */}
              <circle cx="20" cy="125" r="1.25" fill="#1e1b18" />

              {/* Nib Capillary Slit running down to the tip (20, 150) */}
              <line
                x1="20"
                y1="126.25"
                x2="20"
                y2="149.5"
                stroke="#2d2214"
                strokeWidth="0.6"
              />
            </svg>
          </div>
        )}

        {/* 5. VINTAGE BRASS PEN REST (Bottom-Right, shown when not focused) */}
        {!isFocused && !isReduced && (
          <div 
            className="absolute right-3.5 bottom-1.5 flex flex-col items-center select-none opacity-55 hover:opacity-85 transition-opacity duration-300 pointer-events-none"
            title="Scribe's Brass Pen Rest"
          >
            {/* Ink bottle / brass well structure */}
            <div className="w-5 h-1 bg-[#d4af37]/60 rounded-full" />
            <div className="w-3.5 h-1.5 bg-[#8a6f27]/40 rounded-sm border border-[#d4af37]/45 -mt-0.5" />
          </div>
        )}
      </div>

      {/* Hidden File Input for Attachment Selection */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Uploading progress banner & error alert */}
      {isUploading && (
        <div className="mt-1.5 flex items-center gap-2 px-2.5 py-1 bg-paper-surface-dim/80 border border-accent-gold/40 rounded text-[10.5px] font-serif text-ink-primary italic animate-pulse select-none">
          <span className="text-[#9e1b32] font-black text-xs">⚜</span>
          <span>Sealing the folio clip envelope...</span>
        </div>
      )}

      {uploadError && (
        <div className="mt-1.5 flex items-center justify-between gap-2 px-2.5 py-1 bg-red-50/90 border border-red-200 rounded text-[10.5px] font-serif text-red-900 select-none">
          <span>⚠️ {uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="text-xs font-bold text-red-700 hover:underline cursor-pointer">×</button>
        </div>
      )}

      {/* Pending Attachment Chips Display */}
      {pendingAttachments.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 p-1.5 bg-paper-surface-dim/70 border border-paper-border/50 rounded select-none">
          {pendingAttachments.map((att, idx) => {
            const isImg = isImageFileType(att.fileType, att.fileUrl);
            return (
              <div key={idx} className="flex items-center gap-1.5 px-2 py-0.5 bg-paper-surface border border-paper-border/60 rounded shadow-xs text-[10.5px] font-serif">
                {isImg ? (
                  <img src={att.fileUrl} alt="Thumbnail" className="w-4 h-4 object-cover rounded border" />
                ) : (
                  <span className="text-[#9e1b32]">📎</span>
                )}
                <span className="font-bold max-w-[110px] truncate text-ink-primary text-[10px]">
                  {att.fileName || 'Clip'}
                </span>
                <span className="text-[8.5px] text-ink-muted">({formatFileSize(att.fileSize)})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="ml-0.5 text-accent-red font-black hover:text-red-800 transition-colors cursor-pointer text-xs leading-none"
                  title="Remove folio clip"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Decorative controls & send trigger */}
      <div className="flex items-center justify-between text-[10.5px] text-ink-muted pt-1 select-none">
        <div className="flex items-center gap-3">
          <span 
            onClick={handleAttachClick}
            className="cursor-pointer hover:text-ink-primary font-serif transition-colors flex items-center gap-1 text-[#9e1b32] font-bold"
            title="Attach image or document clip to this inscription"
          >
            📎 Attach Folio Clip {pendingAttachments.length > 0 && `(${pendingAttachments.length})`}
          </span>
          {/* Collapsible Ink Color Picker */}
          <div className="relative flex items-center font-serif text-[10.5px]">
            <button
              type="button"
              onClick={() => setIsInkMenuOpen((prev) => !prev)}
              className="cursor-pointer hover:text-ink-primary font-serif transition-colors flex items-center gap-1.5 px-2 py-0.5 bg-paper-surface-dim/80 hover:bg-paper-surface border border-paper-border/80 rounded shadow-xs text-ink-secondary"
              title="Click to change fountain pen ink color"
            >
              <span className="font-bold flex items-center gap-1 select-none">
                <span>✒ Ink Color:</span>
                <span 
                  className="w-2.5 h-2.5 rounded-full inline-block border border-black/20 shrink-0" 
                  style={{ backgroundColor: INK_COLORS[inkColor]?.hex || INK_COLORS.blue.hex }}
                />
                <span className="capitalize font-medium text-ink-primary">{inkColor}</span>
              </span>
              <ChevronDown 
                className="w-3 h-3 text-ink-muted transition-transform duration-200" 
                style={{ transform: isInkMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} 
              />
            </button>

            {isInkMenuOpen && (
              <>
                {/* Backdrop to close menu on click outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsInkMenuOpen(false)} 
                />
                
                {/* Ink Color Dropdown */}
                <div className="absolute bottom-full left-0 mb-1 z-50 min-w-[135px] bg-paper-surface border border-paper-border rounded-md shadow-lg p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[9px] font-bold tracking-wider uppercase text-ink-muted/80 px-2 py-0.5 border-b border-paper-border/40 mb-0.5">
                    Select Ink Color
                  </div>
                  {(['blue', 'red', 'black', 'green'] as InkColor[]).map((col) => {
                    const config = INK_COLORS[col];
                    const isSelected = inkColor === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          setInkColor(col);
                          setIsInkMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 px-2 py-1 rounded transition-all cursor-pointer text-[11px] w-full text-left ${
                          isSelected
                            ? 'bg-paper-surface-dim font-bold text-ink-primary border border-accent-gold/50 shadow-xs'
                            : 'hover:bg-paper-surface-dim/60 text-ink-secondary hover:text-ink-primary'
                        }`}
                      >
                        <span 
                          className="w-3 h-3 rounded-full inline-block border border-black/20 shrink-0 shadow-xs" 
                          style={{ backgroundColor: config.hex }}
                        />
                        <span className="font-serif">{config.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Quick Send Icon button positioned outside of paper area for zero intrusion */}
        <button
          onClick={handleFormSubmit}
          disabled={(!value.trim() && pendingAttachments.length === 0) || isUploading}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-ink-primary text-paper-surface hover:text-accent-gold hover:bg-ink-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all font-serif font-semibold shadow-sm focus:ring-1 focus:ring-accent-gold focus:outline-none cursor-pointer"
          title="Inscribe and Send to Ledger"
        >
          <span>Send</span>
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
