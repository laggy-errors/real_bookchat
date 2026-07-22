'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { 
  BookOpen, 
  Bookmark as BookmarkIcon, 
  Search, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  CornerDownLeft, 
  Trash2, 
  Sparkles, 
  Undo2, 
  Volume2, 
  VolumeX, 
  Pin,
  Compass,
  FileText,
  MoreVertical,
  Key as KeyIcon,
  Flame as FlameIcon,
  PenTool as PenIcon,
  Hourglass as HourglassIcon
} from 'lucide-react';
import { useActiveBookStore } from '../stores/active-book-store';
import { useThemeStore } from '../stores/theme-store';
import { useAudioStore } from '../stores/audio-store';
import { useUserStore } from '../stores/user-store';
import { useNotificationsStore } from '../stores/notifications-store';
import { FountainPenComposer, InkColor, INK_COLORS, parseInkColor } from './fountain-pen-composer';
import { audioService } from '../services/audio-service';
import { AudioControls } from './audio-controls';
import { getSocket } from '../lib/socket';
import { apiClient } from '../lib/api-client';
import { useRouter } from 'next/navigation';
import { CreateBookModal } from './create-book-modal';
import { JoinBookModal } from './join-book-modal';
import { ReadingAnalyticsModal } from './reading-analytics-modal';
import { bookService } from '../services/book-service';
import { FountainPenCursor } from './fountain-pen-cursor';


// Custom Feature Imports
import { SettingsForm } from '../features/settings';
import { ProfileCard, useProfile } from '../features/profile';
import { SearchField } from '../features/search';

// Import our physical animations
import {
  usePrefersReducedMotion,
  useBookBreathing,
  useHardcoverAnimation,
  performPageTurn,
  useHandwritingAnimation,
  animateStickyNoteLanding,
  setupStickyNoteHover,
  animateBookmarkRibbon,
  usePaperFoldUnfold,
  usePaperCompression
} from '../animations';

// =========================================================================
// MOCK CHRONICLE DATABASE (Chapters & Conversation Threads per Volume)
// =========================================================================

export interface AttachmentItem {
  id?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  fileName?: string;
}

export interface Message {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  isCurrentUser: boolean;
  replyToId?: string;
  replyToAuthor?: string;
  replyToText?: string;
  replyToAttachments?: AttachmentItem[];
  reactions?: string[];
  senderId?: string;
  deletedAt?: string;
  readAt?: string;
  attachments?: AttachmentItem[];
  inkColor?: InkColor;
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

interface DiscussionThread {
  id: string;
  title: string;
  page: number;
  snippet: string;
  messages: Message[];
}

interface BookChapter {
  number: string;
  title: string;
  startPage: number;
  description: string;
  threads: DiscussionThread[];
}

const BOOK_SCHEMAS: Record<string, BookChapter[]> = {
  'vol-2': [
    {
      number: 'I',
      title: 'Tactile Shadows & Depth',
      startPage: 5,
      description: 'Skeuomorphic depth, ambient occlusion shadows, and high contrast lighting rules.',
      threads: [
        {
          id: 'v2-t1',
          title: 'The Physics of Scribe Annotations',
          page: 12,
          snippet: 'Aryan & Emma debating ambient shadow offsets of falling sticky notes.',
          messages: [
            { id: 'm1', author: 'Scribe Aryan', text: "Behold! Let us study this ledger annotation. Does the visual weight feel correct?", timestamp: '10:42 AM', isCurrentUser: false, reactions: ['verified'] },
            { id: 'm2', author: 'You', text: "Indeed, the deep center gutter and page curvature represent centuries of master binding.", timestamp: '10:45 AM', isCurrentUser: true, replyToId: 'm1', replyToAuthor: 'Scribe Aryan', replyToText: "Behold! Let us study this ledger annotation. Does the visual weight feel correct?", reactions: ['inspired'] },
            { id: 'm3', author: 'Scribe Emma', text: "Perfect. We must add the parchment texture overlay and leather cover edges next.", timestamp: '10:48 AM', isCurrentUser: false, replyToId: 'm2', replyToAuthor: 'You', replyToText: "Indeed, the deep center gutter and page curvature represent centuries of master binding.", reactions: ['studied'] },
          ]
        },
        {
          id: 'v2-t2',
          title: 'Ambient Lighting & Contrast',
          page: 35,
          snippet: 'Emma & John discussing eye-strain under warm vintage gas lamps.',
          messages: [
            { id: 'm4', author: 'Scribe Emma', text: "Warm twilight themes look highly authentic, but do they provide sufficient contrast for active readers?", timestamp: '11:15 AM', isCurrentUser: false },
            { id: 'm5', author: 'Scribe John', text: "Yes, by boosting the cream background luminosity to #fbf9f4 and keeping the ink color deep charcoal.", timestamp: '11:18 AM', isCurrentUser: false },
            { id: 'm6', author: 'You', text: "Fabulous, readability remains absolutely flawless.", timestamp: '11:20 AM', isCurrentUser: true }
          ]
        }
      ]
    },
    {
      number: 'II',
      title: 'Cream Parchment & Vellum',
      startPage: 80,
      description: 'The organic texture of paper fibers, grain density, and watermark simulation.',
      threads: [
        {
          id: 'v2-t3',
          title: 'Watermark & Fibre Density',
          page: 88,
          snippet: 'Sarah & Aryan optimizing alpha transparency of paper watermark textures.',
          messages: [
            { id: 'm7', author: 'Scribe Sarah', text: "If we use too many CSS gradients, the page scroll performance will choke on mobile viewports.", timestamp: '01:05 PM', isCurrentUser: false },
            { id: 'm8', author: 'Scribe Aryan', text: "A single lightweight, repeat-layered SVG background pattern does the trick without layout redraws.", timestamp: '01:10 PM', isCurrentUser: false },
          ]
        },
        {
          id: 'v2-t4',
          title: 'Tactile Shadows on Landing',
          page: 145,
          snippet: 'Emma detailing shadow sharpening as papers reach the desk.',
          messages: [
            { id: 'm9', author: 'Scribe Emma', text: "When a sticky note drops, its shadow starts wide and blurry, then compacts and darkens upon touching.", timestamp: '02:30 PM', isCurrentUser: false },
            { id: 'm10', author: 'You', text: "Simulating proximity shadow changes makes the drop feel incredibly heavy and physical!", timestamp: '02:33 PM', isCurrentUser: true }
          ]
        }
      ]
    },
    {
      number: 'III',
      title: 'Architectural Elegance',
      startPage: 180,
      description: 'The Golden Ratio margins, deep book center spine stitches, and leather headers.',
      threads: [
        {
          id: 'v2-t5',
          title: 'The Golden Ratio Gutters',
          page: 210,
          snippet: 'Marcus detailing outer margins that expand to leave room for scribe notes.',
          messages: [
            { id: 'm11', author: 'Scribe Marcus', text: "Centuries of binding history teach us that outer book margins must be twice the thickness of inner gutters.", timestamp: '04:15 PM', isCurrentUser: false },
            { id: 'm12', author: 'You', text: "This leaves ample breathing space for our handwriting doodles in the margins!", timestamp: '04:18 PM', isCurrentUser: true }
          ]
        }
      ]
    }
  ],
  'vol-3': [
    {
      number: 'I',
      title: 'The Double-Spread Grid',
      startPage: 5,
      description: 'Scribe navigation, split page layouts, and printed directory grids.',
      threads: [
        {
          id: 'v3-t1',
          title: 'Split Page Layout Rules',
          page: 15,
          snippet: 'Marcus & Emma formulating component separation guidelines.',
          messages: [
            { id: 'm13', author: 'Scribe Emma', text: "Left pages contain indices and reference catalogs; right pages contain active conversational ledgers.", timestamp: '10:05 AM', isCurrentUser: false },
            { id: 'm14', author: 'Scribe Marcus', text: "This preserves the traditional split of a master binder ledger. Extremely clean.", timestamp: '10:08 AM', isCurrentUser: false }
          ]
        }
      ]
    }
  ],
  'vol-6': [
    {
      number: 'I',
      title: 'The Real-Time Scribes',
      startPage: 5,
      description: 'Socket synchronization, active halos, and ink depletion logic.',
      threads: [
        {
          id: 'v6-t1',
          title: 'Active Presence Indicators',
          page: 12,
          snippet: 'Sarah & John discussing candles representing active cursors.',
          messages: [
            { id: 'm15', author: 'Scribe Sarah', text: "Could active online readers show up as flickering candle embers in the page gutter?", timestamp: '11:22 AM', isCurrentUser: false },
            { id: 'm16', author: 'Scribe John', text: "That would be beautiful! A soft amber halo expanding gently.", timestamp: '11:25 AM', isCurrentUser: false }
          ]
        }
      ]
    },
    {
      number: 'II',
      title: 'Quill Ink Depletion',
      startPage: 100,
      description: 'Managing fountain pen ink reserves and inkwell refill simulations.',
      threads: [
        {
          id: 'v6-t2',
          title: 'Ink Depletion Math',
          page: 120,
          snippet: 'You & John calibrating ink reservoir drain rates.',
          messages: [
            { id: 'm17', author: 'Scribe John', text: "Every sentence written burns roughly twelve percent of the pen's inkwell capacity.", timestamp: '03:15 PM', isCurrentUser: false },
            { id: 'm18', author: 'You', text: "This prevents chat flooding and keeps everyone's messages thoughtful and concise.", timestamp: '03:18 PM', isCurrentUser: true }
          ]
        }
      ]
    }
  ],
  'vol-10': [
    {
      number: 'I',
      title: 'The Next.js App Router Bindings',
      startPage: 5,
      description: 'Server component boundaries, workspace structures, and monorepos.',
      threads: [
        {
          id: 'v10-t1',
          title: 'The Monorepo Girdle',
          page: 25,
          snippet: 'Aryan & Marcus architecting Next.js layouts.',
          messages: [
            { id: 'm19', author: 'Scribe Aryan', text: "Separating our package concerns ensures that layout shifts never crash our physical rendering engine.", timestamp: '09:40 AM', isCurrentUser: false }
          ]
        }
      ]
    }
  ],
  'vol-13': [
    {
      number: 'I',
      title: 'Grammar of Vintage Themes',
      startPage: 5,
      description: 'Theme configurations, warm library palettes, and high viewport contrasts.',
      threads: [
        {
          id: 'v13-t1',
          title: 'Burgundy Spines & Cream Paper',
          page: 30,
          snippet: 'Emma detailing visual pairings of contrast.',
          messages: [
            { id: 'm20', author: 'Scribe Emma', text: "Our burgundy leather spine paired with soft cream-wax parchment is centuries old and highly readable.", timestamp: '02:50 PM', isCurrentUser: false }
          ]
        }
      ]
    }
  ]
};

// =========================================================================
// SUBCOMPONENTS
// =========================================================================

/**
 * Subcomponent to simulate manual quill handwriting on vellum.
 */
function HandwritingScribble({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useHandwritingAnimation(ref, text);
  return (
    <p ref={ref} className="text-xs text-ink-secondary font-serif leading-relaxed line-clamp-2">
      {text}
    </p>
  );
}

/**
 * Scrolls to the message container and triggers a highlighting flash effect
 */
const scrollToMessage = (msgId: string) => {
  const el = document.getElementById(`msg-el-${msgId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('animate-highlight-flash');
    setTimeout(() => {
      el.classList.remove('animate-highlight-flash');
    }, 1500);
  }
};

/**
 * Subcomponent for 3D physics-based falling sticky notes with lower-edge peel hover states,
 * reply quotation, and physical ink reaction stamps.
 */
function StickyNoteItem({ 
  message, 
  isSelf, 
  isReduced, 
  onReply, 
  onDeleteEveryone,
  onDeleteMe,
  resolvedReplyToAuthor,
  onOpenLightbox
}: { 
  message: Message; 
  isSelf: boolean; 
  isReduced: boolean;
  onReply: () => void;
  onDeleteEveryone: () => void;
  onDeleteMe: () => void;
  resolvedReplyToAuthor?: string;
  onOpenLightbox?: (url: string, title?: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isConfirmingDeleteEveryone, setIsConfirmingDeleteEveryone] = useState(false);
  const [isConfirmingDeleteMe, setIsConfirmingDeleteMe] = useState(false);
  const isDeleted = !!message.deletedAt;

  const [isUnread, setIsUnread] = useState(!isSelf && !message.readAt && !isDeleted);

  useEffect(() => {
    setIsUnread(!isSelf && !message.readAt && !isDeleted);
  }, [message.id, message.readAt, isSelf, isDeleted]);

  useEffect(() => {
    if (ref.current) {
      animateStickyNoteLanding(ref.current, isReduced);
      const cleanup = setupStickyNoteHover(ref.current, isReduced);
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [isReduced, message.id]);

  useEffect(() => {
    // Only observe if the message is from another user and not read yet
    if (isSelf || message.readAt || isDeleted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            apiClient(`/api/messages/messages/${message.id}/read`, {
              method: 'POST',
            })
              .then((res: any) => {
                console.log('[API] Message marked as read:', message.id);
              })
              .catch((err) => {
                console.warn('[API] Could not mark message as read:', err);
              });

            // Mark as read visually with a small delay so user notices the subtle cue first
            setTimeout(() => {
              setIsUnread(false);
            }, 500);

            // Disconnect once triggered to avoid duplicate requests
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [message.id, isSelf, message.readAt, isDeleted]);

  if (isDeleted) {
    return (
      <div 
        ref={ref} 
        className="p-3 bg-black/[0.04] text-ink-muted border border-dashed border-paper-border/40 rounded-lg relative select-none w-full"
      >
        <p className="text-xs font-serif italic text-ink-muted/70 leading-relaxed line-through decoration-ink-muted/50 text-justify">
          This inscription has been inked out.
        </p>
        <div className="mt-1.5 flex items-center justify-between">
          <span 
            className="text-[10px] text-ink-muted/50 font-handwriting"
            style={{ fontFamily: "'La Belle Aurore', cursive" }}
          >
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={ref} 
      className={`p-3.5 rounded-lg shadow-paper relative transition-all duration-300 group/note hover:shadow-depth-heavy border w-full ${
        isSelf 
          ? 'bg-sticky-yellow-bg text-sticky-yellow-ink border-sticky-yellow-border/60 rounded-tr-none' 
          : 'bg-paper-surface-dim text-ink-primary border-paper-border/80 rounded-tl-none'
      }`}
    >
      {/* Subtle unread darker indicator layer */}
      {!isSelf && (
        <div 
          className="absolute inset-0 rounded-lg rounded-tl-none pointer-events-none transition-opacity duration-1000 ease-in-out z-[1]"
          style={{ 
            backgroundColor: 'var(--paper-bg)', 
            mixBlendMode: 'multiply',
            opacity: isUnread ? 0.08 : 0 
          }}
        />
      )}
      {/* Brass Pin for User's own notes */}
      {isSelf && (
        <div className="absolute -top-1.5 right-2 z-10">
          <Pin className="w-3.5 h-3.5 text-accent-red rotate-45 opacity-75 drop-shadow-sm" />
        </div>
      )}

      {/* REPLY QUOTATION BLOCK */}
      {message.replyToAuthor && (
        <div 
          onClick={() => message.replyToId && scrollToMessage(message.replyToId)}
          className="mb-2 bg-black/[0.02] border-l-2 border-[#9e1b32]/30 pl-2 py-1 text-[11px] leading-relaxed rounded-r-md cursor-pointer hover:bg-black/[0.05] transition-colors select-none"
          title="Jump to original message"
        >
          <span className="text-[9px] uppercase font-bold text-[#9e1b32]/70 block font-serif">
            ↳ Threading Scribe {resolvedReplyToAuthor || message.replyToAuthor}
          </span>
          <p className="italic text-ink-muted line-clamp-1 font-serif text-[10px] flex items-center gap-1">
            {message.replyToAttachments && message.replyToAttachments.length > 0 && (
              <span className="text-[#9e1b32] font-bold">📎 [Clip]</span>
            )}
            <span>"{message.replyToText || 'Folio Clip Attachment'}"</span>
          </p>
        </div>
      )}

      {/* CORE NOTE TEXT */}
      {message.text && (
        <p 
          className="text-xs font-serif leading-relaxed font-medium text-justify"
          style={{
            color: INK_COLORS[message.inkColor || 'blue']?.hex || '#1e40af'
          }}
        >
          {message.text}
        </p>
      )}

      {/* ATTACHMENTS LIST */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {message.attachments.map((att, idx) => {
            const isImg = isImageFileType(att.fileType, att.fileUrl);
            if (isImg) {
              return (
                <div 
                  key={att.id || idx}
                  onClick={() => onOpenLightbox && onOpenLightbox(att.fileUrl, att.fileName)}
                  className="relative group/img rounded border border-paper-border/60 overflow-hidden cursor-pointer shadow-xs hover:shadow-md transition-shadow max-w-[240px]"
                >
                  <img 
                    src={att.fileUrl} 
                    alt={att.fileName || 'Attachment'} 
                    loading="lazy"
                    className="max-h-[180px] w-auto object-cover rounded"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-serif font-bold">
                    🔍 Expand Folio
                  </div>
                </div>
              );
            }
            return (
              <a
                key={att.id || idx}
                href={att.fileUrl}
                download={att.fileName || 'attachment'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-paper-border/60 bg-paper-surface/80 hover:bg-paper-surface text-ink-primary text-[11px] font-serif transition-colors shadow-xs group/file"
              >
                <FileText className="w-3.5 h-3.5 text-[#9e1b32] shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold truncate max-w-[130px] text-[10.5px]">
                    {att.fileName || 'Folio Attachment'}
                  </span>
                  <span className="text-[9px] text-ink-muted">
                    {formatFileSize(att.fileSize)}
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-[#9e1b32] font-bold group-hover/file:underline ml-1">
                  ⤓
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* HANDWRITTEN TIMESTAMP & ACTIONS */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex flex-col items-start leading-none gap-0.5">
          <span 
            className="text-xs text-ink-light font-handwriting select-none"
            style={{ fontFamily: "'La Belle Aurore', cursive", color: '#8a7e6b' }}
          >
            {message.timestamp}
          </span>
          {isSelf && message.readAt && (
            <span className="text-[9px] text-ink-muted/50 italic font-serif select-none mt-0.5">
              ink dried
            </span>
          )}
        </div>
        
        {/* Hover/Tap Quick Actions Menu */}
        <div className="md:opacity-0 md:group-hover/note:opacity-100 opacity-100 transition-opacity duration-300 flex items-center gap-1.5 relative">
          {isConfirmingDeleteEveryone ? (
            <div className="flex items-center gap-1.5 bg-[#fdfbf7] px-1.5 py-0.5 rounded border border-[#9e1b32]/30 shadow-sm animate-fade-in z-20">
              <span className="text-[8px] font-serif font-black text-[#9e1b32] uppercase tracking-wider select-none">
                Strike out for everyone?
              </span>
              <button 
                type="button"
                onClick={() => {
                  onDeleteEveryone();
                  setIsConfirmingDeleteEveryone(false);
                }}
                className="text-[9px] font-serif font-bold text-accent-red hover:underline px-1 bg-accent-red/10 rounded"
              >
                Yes
              </button>
              <button 
                type="button"
                onClick={() => setIsConfirmingDeleteEveryone(false)}
                className="text-[9px] font-serif font-bold text-ink-muted hover:underline px-1 bg-black/[0.04] rounded"
              >
                No
              </button>
            </div>
          ) : isConfirmingDeleteMe ? (
            <div className="flex items-center gap-1.5 bg-[#fdfbf7] px-1.5 py-0.5 rounded border border-paper-border/80 shadow-sm animate-fade-in z-20">
              <span className="text-[8px] font-serif font-black text-ink-primary uppercase tracking-wider select-none">
                Hide for me?
              </span>
              <button 
                type="button"
                onClick={() => {
                  onDeleteMe();
                  setIsConfirmingDeleteMe(false);
                }}
                className="text-[9px] font-serif font-bold text-accent-red hover:underline px-1 bg-accent-red/10 rounded"
              >
                Yes
              </button>
              <button 
                type="button"
                onClick={() => setIsConfirmingDeleteMe(false)}
                className="text-[9px] font-serif font-bold text-ink-muted hover:underline px-1 bg-black/[0.04] rounded"
              >
                No
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button 
                type="button"
                onClick={onReply}
                className="text-[10px] font-serif font-bold text-[#9e1b32] hover:underline flex items-center gap-0.5 bg-paper-surface-dim/70 px-1.5 py-0.5 rounded border border-paper-border/30 shadow-sm"
                title="Reply to Inscription"
              >
                Reply ↩
              </button>
              <button 
                type="button"
                onClick={() => setIsConfirmingDeleteMe(true)}
                className="text-[10px] font-serif font-bold text-ink-muted hover:underline flex items-center gap-0.5 bg-paper-surface-dim/70 px-1.5 py-0.5 rounded border border-paper-border/30 shadow-sm"
                title="Hide message from my view"
              >
                Delete for Me 🗑
              </button>
              {isSelf && (
                <button 
                  type="button"
                  onClick={() => setIsConfirmingDeleteEveryone(true)}
                  className="text-[10px] font-serif font-bold text-accent-red hover:underline flex items-center gap-0.5 bg-paper-surface-dim/70 px-1.5 py-0.5 rounded border border-paper-border/30 shadow-sm"
                  title="Strike out this message for everyone"
                >
                  Delete for Everyone ✂
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Subcomponent for dropping a heavy hanging silk bookmark ribbon into the center book crease.
 */
/**
 * Subcomponent for dropping a heavy hanging silk bookmark ribbon into the center book crease.
 * Made stretchable/draggable with elastic resistance and pull-to-close behavior.
 */
function RibbonVisualizer({ isReduced, onClose }: { isReduced: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const threshold = 80; // 80px pull threshold to trigger close

  useEffect(() => {
    if (ref.current) {
      animateBookmarkRibbon(ref.current, isReduced);
    }
  }, [isReduced]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !ref.current) return;
    const dy = e.clientY - startYRef.current;
    
    if (isReduced) {
      // Respect prefers-reduced-motion: skip drag physics representation
      return;
    }

    if (dy > 0) {
      // Elastic/paper-flex physics resistance formula (diminishing returns stretch)
      const maxStretch = 120;
      const actualY = (dy * maxStretch) / (dy + maxStretch);
      
      // Subtly scale the ribbon length alongside the translation for extra silk/elastic giving feel
      const scaleY = 1 + (actualY / 400);

      gsap.to(ref.current, {
        y: actualY,
        scaleY: scaleY,
        duration: 0.1,
        overwrite: 'auto'
      });
    } else {
      // Moving upwards gets extreme stiffness
      const actualY = dy * 0.1;
      gsap.to(ref.current, {
        y: actualY,
        scaleY: 1,
        duration: 0.1,
        overwrite: 'auto'
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const dy = e.clientY - startYRef.current;
    if (dy >= threshold) {
      onClose();
    } else {
      if (isReduced) return;
      // Spring back to resting state
      gsap.to(ref.current, {
        y: 0,
        scaleY: 1,
        duration: 0.6,
        ease: 'elastic.out(1.1, 0.4)',
        overwrite: 'auto'
      });
    }
  };

  return (
    <div 
      ref={ref} 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute top-0 w-3 bg-accent-gold shadow-md rounded-b transition-shadow select-none pointer-events-auto ${
        isDragging ? 'cursor-grabbing shadow-lg brightness-105' : 'cursor-grab hover:brightness-105'
      }`}
      style={{ 
        height: '75%', 
        left: 'calc(50% - 6px)', 
        borderRight: '1.5px solid rgba(0,0,0,0.15)',
        transformOrigin: 'center top',
        zIndex: 25,
        touchAction: 'none'
      }}
    />
  );
}

/**
 * A serene landing page displayed on the right page when the book is opened but no conversation is selected.
 * Displays a single, centered literary/reading-themed quote in cursive calligraphy.
 */
function ReadingQuoteLanding() {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    const quotes = [
      "Your pen knows paths your voice has never walked.",
      "A book is a heart that only beats when another heart is near.",
      "In the quiet of these pages, we find the voices we didn't know we were searching for.",
      "A thread of dark ink can bridge the distance between two souls.",
      "We read to know we are not alone in the silent hours of the night.",
      "Every inscribed word is an invitation to begin a quiet conversation.",
      "Books are the quietest and most constant of friends."
    ];
    // Pick at random on mount
    const idx = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[idx]);
  }, []);

  return (
    <div 
      id="quote-landing-page" 
      className="flex-1 flex flex-col items-center justify-center relative z-10 px-8 py-16 text-center select-none animate-fade-in"
    >
      <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-8 py-12 md:py-16">
        {/* Top subtle vintage decorative element */}
        <span className="text-accent-gold/40 text-xl font-serif tracking-widest select-none">❦</span>
        
        {/* Centered handwriting quote */}
        <p className="font-handwritten font-book-handwritten text-3xl md:text-4xl text-ink-primary/95 leading-relaxed tracking-wide antialiased select-text font-medium px-4">
          "{quote}"
        </p>

        {/* Bottom subtle vintage decorative element */}
        <span className="text-accent-gold/40 text-xl font-serif tracking-widest select-none">❦</span>
      </div>
    </div>
  );
}

const getRelativeLastSeen = (lastSeen: any) => {
  if (!lastSeen) return 'Away';
  const date = new Date(lastSeen);
  if (isNaN(date.getTime())) return 'Away';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 10) {
    return 'Just now';
  } else if (diffMin < 5) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHr < 4) {
    return 'Last seen recently';
  } else if (diffHr < 24) {
    return `${diffHr}h ago`;
  } else {
    return 'Away';
  }
};

// =========================================================================
// MAIN OPEN BOOK COMPONENT
// =========================================================================

export function OpenBook({ onBackToShelf }: { onBackToShelf: () => void }) {
  // Zustand States
  const { activeBook, updateProgress, setActiveBook, targetDirectChat, setTargetDirectChat } = useActiveBookStore();
  const { theme, setTheme } = useThemeStore();
  const { user } = useUserStore();
  const { profile } = useProfile();
  const { addNotification } = useNotificationsStore();
  
  const router = useRouter();

  // Accessibility Check
  const isReduced = usePrefersReducedMotion();

  // Selected sub-tabs inside LeftPage
  const [leftTab, setLeftTab] = useState<'discussions' | 'search' | 'readers' | 'bookmarks' | 'annotations' | 'quotes' | 'profile' | 'settings'>('discussions');

  // Mobile page state ('left' | 'right')
  const [mobilePage, setMobilePage] = useState<'left' | 'right'>('left');

  // Animation State Hooks
  const [isOpen, setIsOpen] = useState(false);
  const bookSpreadRef = useRef<HTMLDivElement>(null);

  // Guidelines unfold accordion state
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const guidelinesRef = useRef<HTMLDivElement>(null);

  // Local chat-threads buffer based on selected volume
  const [chatThreads, setChatThreads] = useState<BookChapter[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Message cache keyed by `${conversationId}_page_${pageNumber}` to prevent resetting/clearing on switch
  const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});

  // Last known timestamp of message received for catch-up sync (Phase 66)
  const lastMessageTimestampRef = useRef<number>(Date.now());
  const hasDisconnectedRef = useRef<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'back_online'>('connected');

  const updateHighWaterMark = useCallback((timestamp?: string | number | Date) => {
    if (!timestamp) return;
    const time = new Date(timestamp).getTime();
    if (!isNaN(time) && time > lastMessageTimestampRef.current) {
      lastMessageTimestampRef.current = time;
    }
  }, []);
  
  // Track total pages and current page per chat conversation
  const [totalPagesMap, setTotalPagesMap] = useState<Record<string, number>>({});
  const [currentChatPage, setCurrentChatPage] = useState<number>(1);
  
  // Ref to chat container scroll node
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Ref to cached scroll positions per conversationId
  const scrollPositionsRef = useRef<Record<string, number>>({});

  // Refs & state for scroll wheel chapter page flip
  const isWheelFlippingRef = useRef(false);
  const wheelDeltaAccumulatorRef = useRef(0);
  const [scrollBoundaryCue, setScrollBoundaryCue] = useState<'top' | 'bottom' | null>(null);

  // Ref to track which cache keys have been fetched from API to avoid redundant network calls
  const fetchedKeysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    // Clear fetched cache keys on book change to force fresh load of thread messages
    fetchedKeysRef.current = {};
  }, [activeBook?.id]);

  useEffect(() => {
    if (!activeBook) return;
    const isPredefined = ['vol-2', 'vol-3', 'vol-6', 'vol-10', 'vol-13'].includes(activeBook.id);
    const chapters = BOOK_SCHEMAS[activeBook.id] || BOOK_SCHEMAS['vol-2'];
    
    const initialCache: Record<string, Message[]> = {};
    const initialTotalPagesMap: Record<string, number> = {};
    const mappedChapters = chapters.map(ch => ({
      ...ch,
      threads: ch.threads.map(t => {
        const id = isPredefined ? t.id : `${activeBook.id}-${t.id}`;
        const messages = isPredefined ? t.messages : [];
        initialCache[`${id}_page_1`] = messages;
        initialTotalPagesMap[id] = 1;
        return {
          ...t,
          id,
          messages,
        };
      })
    }));
    setMessagesCache(prev => ({
      ...initialCache,
      ...prev
    }));
    setTotalPagesMap(prev => ({
      ...initialTotalPagesMap,
      ...prev
    }));
    setChatThreads(mappedChapters);
  }, [activeBook?.id]);

  // Active direct 1:1 chat state
  const [activeDirectChat, setActiveDirectChat] = useState<{
    id: string;
    title: string;
    isDirect: boolean;
    recipientName: string;
    recipientId: string;
    messages: Message[];
  } | null>(null);

  // Locally hidden messages (e.g. for mock messages, or instant/persistent fallback hiding)
  const [localHiddenMessageIds, setLocalHiddenMessageIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('local_hidden_messages');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Clear unread count locally when activeDirectChat recipientId changes
  useEffect(() => {
    if (activeDirectChat?.recipientId) {
      setReadersList(prev => 
        prev.map(m => {
          if (m.userId === activeDirectChat.recipientId) {
            return { ...m, unreadCount: 0 };
          }
          return m;
        })
      );
    }
  }, [activeDirectChat?.recipientId]);

  // Find the active conversation thread matching currentPage
  const standardActiveThread = chatThreads
    .flatMap(c => c.threads)
    .find(t => t.page === activeBook?.currentPage);

  const activeThreadId = activeDirectChat ? activeDirectChat.id : (standardActiveThread ? standardActiveThread.id : null);
  const activeThreadTitle = activeDirectChat ? activeDirectChat.title : (standardActiveThread ? standardActiveThread.title : '');
  
  // Cache key for current chat page
  const activeCacheKey = activeThreadId ? `${activeThreadId}_page_${currentChatPage}` : '';
  const activeThreadMessages = activeThreadId 
    ? (messagesCache[activeCacheKey] || []).filter(m => !localHiddenMessageIds.includes(m.id)) 
    : [];

  const activeThread = activeThreadId ? {
    id: activeThreadId,
    title: activeThreadTitle,
    messages: activeThreadMessages,
    page: activeBook?.currentPage || 12
  } : null;

  // Dynamic lists of valid pages for arrow-key navigation loop (1 = TOC, rest = active discussions)
  const validPages = [1, ...chatThreads.flatMap(c => c.threads.map(t => t.page))];

  // Local UI states
  const [inputText, setInputText] = useState('');
  const [inkLevel, setInkLevel] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [readersList, setReadersList] = useState<any[]>([
    { name: 'Scribe Aryan', role: 'Archivist', status: 'Reading Page 145', online: true },
    { name: 'Scribe Emma', role: 'Illuminator', status: 'Flipping pages', online: true },
    { name: 'Scribe Marcus', role: 'Preserver', status: 'Idle', online: false },
  ]);

  // Ribbon Bookmark items
  const [bookmarks, setBookmarks] = useState<any[]>([
    { id: 'b1', page: 12, label: 'Section I: Scribe Annotations' },
    { id: 'b2', page: 88, label: 'Section II: Watermark Density' },
  ]);
  const [bookmarkLabel, setBookmarkLabel] = useState('');

  // Scriptorium, Marginalia and Reading Progress state bundles
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [annotationText, setAnnotationText] = useState('');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quoteText, setQuoteText] = useState('');
  const [progressStats, setProgressStats] = useState<any>(null);
  const [readingTimeSeconds, setReadingTimeSeconds] = useState(0);

  // Audio atmosphere simulation states
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Active reply target state
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  // Scribe presence & typing simulator (quiet skeuomorphism)
  const [typingScribe, setTypingScribe] = useState<string | null>(null);

  // Rebuilt Left Page Sidebar local states
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [visibilityGrants, setVisibilityGrants] = useState<any[]>([]);
  const [isLoadingGrants, setIsLoadingGrants] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);

  // Nickname Override & Member Removal & Highlight states
  const [activeKebabMemberId, setActiveKebabMemberId] = useState<string | null>(null);
  const [nicknameEditingMember, setNicknameEditingMember] = useState<any | null>(null);
  const [newNickname, setNewNickname] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
  const [highlightedPermissionsMemberId, setHighlightedPermissionsMemberId] = useState<string | null>(null);

  // Leave Book State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLeavingBook, setIsLeavingBook] = useState(false);

  // Delete Active Book State
  const [isDeleteActiveBookModalOpen, setIsDeleteActiveBookModalOpen] = useState(false);
  const [confirmActiveBookTitle, setConfirmActiveBookTitle] = useState('');
  const [isDeletingActiveBook, setIsDeletingActiveBook] = useState(false);
  const [activeBookDeleteError, setActiveBookDeleteError] = useState<string | null>(null);

  const handleCreateSuccess = (newBook: any) => {
    setIsCreateModalOpen(false);
    audioService.playBookOpen();
    // Navigate directly to the newly created custom book
    router.push(`/?book=${newBook.id}`);
  };

  const handleJoinSuccess = (joinedBook: any) => {
    setIsJoinModalOpen(false);
    audioService.playBookOpen();
    // Navigate directly to the joined custom book
    router.push(`/?book=${joinedBook.id}`);
  };

  const handleSaveNickname = async () => {
    if (!activeBook || !nicknameEditingMember) return;

    try {
      audioService.playPenFinish();
      await apiClient(`/api/books/${activeBook.id}/members/${nicknameEditingMember.userId}/nickname`, {
        method: 'POST',
        body: JSON.stringify({ nickname: newNickname }),
      });

      // Refetch visible members list
      const updatedMembers = await apiClient<any[]>(`/api/books/${activeBook.id}/visible-members`);
      if (updatedMembers && Array.isArray(updatedMembers)) {
        setReadersList(updatedMembers);
      }

      addNotification({
        title: 'Chronicle Name Sealed',
        message: newNickname.trim() 
          ? `Scribe's moniker is now successfully overridden as "${newNickname}".`
          : 'Overridden name has been deleted and reverted to original.',
        type: 'success',
      });
      setNicknameEditingMember(null);
      setNewNickname('');
    } catch (err: any) {
      console.error('Failed to update nickname override:', err);
      addNotification({
        title: 'Alteration Failed',
        message: err.message || 'Could not alter scribe moniker.',
        type: 'error',
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!activeBook || !memberToRemove) return;

    try {
      audioService.playPaperShuffle();
      await apiClient(`/api/books/${activeBook.id}/members/${memberToRemove.userId}`, {
        method: 'DELETE',
      });

      // Refetch visible members list
      const updatedMembers = await apiClient<any[]>(`/api/books/${activeBook.id}/visible-members`);
      if (updatedMembers && Array.isArray(updatedMembers)) {
        setReadersList(updatedMembers);
      }

      addNotification({
        title: 'Scribe Banished',
        message: `Scribe "${memberToRemove.name}" has been successfully struck from this volume's register.`,
        type: 'success',
      });
      setMemberToRemove(null);
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      addNotification({
        title: 'Banishment Failed',
        message: err.message || 'Could not remove member from the book register.',
        type: 'error',
      });
    }
  };

  const handleLeaveBook = async () => {
    if (!activeBook) return;
    setIsLeavingBook(true);
    try {
      audioService.playPaperShuffle();
      await apiClient(`/api/books/${activeBook.id}/leave`, {
        method: 'POST',
      });
      addNotification({
        title: 'Book Removed',
        message: `You have successfully removed "${activeBook.title}" from your shelf.`,
        type: 'success',
      });
      // Clear active book state and navigate back to shelf
      setActiveBook(null);
      setIsLeaveModalOpen(false);
      onBackToShelf();
    } catch (err: any) {
      console.error('Failed to leave book:', err);
      addNotification({
        title: 'Failed to Leave Book',
        message: err.message || 'An error occurred while removing the book.',
        type: 'error',
      });
    } finally {
      setIsLeavingBook(false);
    }
  };

  const handleDeleteActiveBook = async () => {
    if (!activeBook) return;
    if (confirmActiveBookTitle !== activeBook.title) return;
    setIsDeletingActiveBook(true);
    setActiveBookDeleteError(null);
    try {
      audioService.playPaperShuffle();
      await apiClient(`/api/books/${activeBook.id}`, {
        method: 'DELETE',
      });
      addNotification({
        title: 'Volume Dissolved',
        message: `The volume "${activeBook.title}" has been permanently dissolved and deleted.`,
        type: 'success',
      });
      // Clear active book state and navigate back to shelf
      setActiveBook(null);
      setIsDeleteActiveBookModalOpen(false);
      setConfirmActiveBookTitle('');
      onBackToShelf();
    } catch (err: any) {
      console.error('Failed to delete book:', err);
      setActiveBookDeleteError(err.message || 'An error occurred while deleting the book.');
      addNotification({
        title: 'Failed to Delete Book',
        message: err.message || 'An error occurred while deleting the book.',
        type: 'error',
      });
    } finally {
      setIsDeletingActiveBook(false);
    }
  };

  // Load initial bookmarks from backend database
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const list = await apiClient<any[]>('/api/bookmarks');
        if (list && Array.isArray(list)) {
          const mapped = list.map(b => ({
            id: b.id,
            page: b.pageNumber || 1,
            label: b.notes || `Bookmark on Page ${b.pageNumber || 1}`,
          }));
          if (mapped.length > 0) {
            setBookmarks(mapped);
          }
        }
      } catch (err) {
        console.warn('Could not load bookmarks from DB:', err);
      }
    };
    loadBookmarks();
  }, []);

  // Load conversation-specific bookmarks
  const [convoBookmarks, setConvoBookmarks] = useState<any[]>([]);

  useEffect(() => {
    const loadConvoBookmarks = async () => {
      if (!activeThreadId) {
        setConvoBookmarks([]);
        return;
      }
      try {
        const response = await apiClient<any>(`/api/conversations/${activeThreadId}/bookmarks`);
        if (response?.status === 'success' && Array.isArray(response.data)) {
          setConvoBookmarks(response.data);
        } else {
          setConvoBookmarks([]);
        }
      } catch (err) {
        console.error('[API] Failed to load conversation bookmarks:', err);
        setConvoBookmarks([]);
      }
    };
    loadConvoBookmarks();
  }, [activeThreadId]);

  const toggleConvoBookmark = async () => {
    if (!activeThreadId) return;
    
    const existing = convoBookmarks.find(b => b.pageNumber === currentChatPage);
    if (existing) {
      try {
        await apiClient(`/api/conversations/${activeThreadId}/bookmarks/${existing.id}`, {
          method: 'DELETE',
        });
        setConvoBookmarks(prev => prev.filter(b => b.id !== existing.id));
        audioService.playRibbonSlide();
        addNotification({
          title: 'Bookmark Removed',
          message: `Bookmark removed from Page ${currentChatPage}.`,
          type: 'success'
        });
      } catch (err) {
        console.error('[API] Failed to delete bookmark:', err);
        addNotification({
          title: 'Error',
          message: 'Failed to remove bookmark.',
          type: 'error'
        });
      }
    } else {
      if (convoBookmarks.length >= 6) {
        addNotification({
          title: 'Bookmark Limit Reached',
          message: 'You can have up to 6 active bookmarks per conversation. Please remove an existing bookmark first.',
          type: 'error'
        });
        return;
      }

      try {
        const response = await apiClient<any>(`/api/conversations/${activeThreadId}/bookmarks`, {
          method: 'POST',
          body: JSON.stringify({ pageNumber: currentChatPage }),
        });
        if (response?.status === 'success' && response.data) {
          setConvoBookmarks(prev => [...prev, response.data]);
          audioService.playRibbonSlide();
          addNotification({
            title: 'Page Bookmarked',
            message: `Page ${currentChatPage} has been bookmarked.`,
            type: 'success'
          });
        } else if (response?.status === 'error' && response.message) {
          addNotification({
            title: 'Error',
            message: response.message,
            type: 'error'
          });
        }
      } catch (err: any) {
        console.error('[API] Failed to add bookmark:', err);
        let errMsg = 'Failed to add bookmark.';
        if (err && err.message) {
          errMsg = err.message;
        } else if (typeof err === 'string') {
          errMsg = err;
        }
        addNotification({
          title: 'Error',
          message: errMsg,
          type: 'error'
        });
      }
    }
  };

  // Track active study/reading time in seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setReadingTimeSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load annotations, quotes, and reading progress for the active book
  useEffect(() => {
    if (!activeBook) return;

    const loadStudyData = async () => {
      try {
        // 1. Fetch Annotations
        const annos = await apiClient<any>(`/api/annotations?bookId=${activeBook.id}`);
        if (annos && annos.data) {
          setAnnotations(annos.data);
        }

        // 2. Fetch Saved Quotes
        const qts = await apiClient<any>(`/api/quotes?bookId=${activeBook.id}`);
        if (qts && qts.data) {
          setQuotes(qts.data);
        }

        // 3. Fetch Reading Progress
        const prog = await apiClient<any>(`/api/reading-progress/${activeBook.id}`);
        if (prog && prog.data) {
          setProgressStats(prog.data);
          setReadingTimeSeconds((prog.data.readingTime || 0) * 60);
        }
      } catch (err) {
        console.warn('Could not load study vellum metrics:', err);
      }
    };

    loadStudyData();
  }, [activeBook?.id]);

  // Sync Reading Progress back to DB in background on page change or time increments
  useEffect(() => {
    if (!activeBook) return;

    const syncProgress = async () => {
      try {
        const completedChaptersCount = chatThreads.filter(ch => ch.startPage <= activeBook.currentPage).length;
        const minutes = Math.max(1, Math.ceil(readingTimeSeconds / 60));

        const res = await apiClient<any>('/api/reading-progress', {
          method: 'POST',
          body: JSON.stringify({
            bookId: activeBook.id,
            pagesRead: activeBook.currentPage,
            chaptersCompleted: completedChaptersCount,
            readingTime: minutes,
          }),
        });

        if (res && res.data) {
          setProgressStats(res.data);
        }
      } catch (err) {
        console.warn('Failed to sync physical reading progress:', err);
      }
    };

    const delayDebounce = setTimeout(syncProgress, 1200);
    return () => clearTimeout(delayDebounce);
  }, [activeBook?.currentPage, Math.floor(readingTimeSeconds / 60)]);

  // Load initial book readers presence
  const loadReaders = async () => {
    if (!activeBook) return;
    try {
      const data = await bookService.getVisibleMembers(activeBook.id);
      if (data && Array.isArray(data)) {
        setReadersList(data);
      }
    } catch (err) {
      console.warn('Could not load visible members:', err);
    }
  };

  useEffect(() => {
    loadReaders();
  }, [activeBook?.id]);

  const handleStartDirectChat = async (member: any) => {
    if (!activeBook || !user) return;
    
    try {
      // 1. Fetch conversations from /api/chats
      const res = await apiClient<any>('/api/chats');
      const conversations = res?.data || res || [];
      
      let existingConversation = conversations.find((c: any) => 
        c.type === 'DIRECT' && 
        c.participants?.some((p: any) => p.userId === member.userId)
      );
      
      let conversationId = existingConversation?.id;
      
      if (!conversationId) {
        // 2. Create direct conversation
        const newConv = await apiClient<any>('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Direct with ${member.name}`,
            type: 'DIRECT',
            bookId: activeBook.id,
            participantUserIds: [member.userId]
          })
        });
        const createdData = newConv?.data || newConv;
        conversationId = createdData?.id;
      }
      
      if (conversationId) {
        // If they are on page 1 (TOC), flip to a chat page (e.g., 12) so they see the chat log
        if (activeBook.currentPage === 1) {
          handlePageFlipTo(12);
        }
        
        // Set mobilePage to 'right' to navigate to chat view on small viewports
        setMobilePage('right');

        // Set the active direct chat state
        setActiveDirectChat({
          id: conversationId,
          title: `Direct &bull; ${member.name}`,
          isDirect: true,
          recipientName: member.name,
          recipientId: member.userId,
          messages: messagesCache[conversationId] || []
        });
      }
    } catch (err) {
      console.error('Failed to start direct chat:', err);
    }
  };

  const fetchGrants = async () => {
    if (!activeBook) return;
    try {
      setIsLoadingGrants(true);
      const res = await apiClient<any>(`/api/books/${activeBook.id}/visibility-grants`);
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setVisibilityGrants(res.data);
      } else if (Array.isArray(res)) {
        setVisibilityGrants(res);
      }
    } catch (err) {
      console.error('Failed to load visibility grants:', err);
    } finally {
      setIsLoadingGrants(false);
    }
  };

  const handleToggleGrant = async (viewerId: string, visibleUserId: string) => {
    if (!activeBook) return;
    audioService.playPaperShuffle();

    const existingGrant = visibilityGrants.find(
      g => g.viewerId === viewerId && g.visibleUserId === visibleUserId
    );

    try {
      if (existingGrant) {
        await apiClient<any>(`/api/books/${activeBook.id}/visibility-grants/${existingGrant.id}`, {
          method: 'DELETE',
        });
        addNotification({
          title: 'Visibility Revoked',
          message: 'The member can no longer see or chat with this scribe.',
          type: 'success',
        });
      } else {
        await apiClient<any>(`/api/books/${activeBook.id}/visibility-grants`, {
          method: 'POST',
          body: JSON.stringify({ viewerId, visibleUserId }),
        });
        addNotification({
          title: 'Visibility Granted',
          message: 'The member can now see and chat with this scribe.',
          type: 'success',
        });
      }
      await fetchGrants();
      await loadReaders();
    } catch (err) {
      console.error('Failed to toggle visibility grant:', err);
      addNotification({
        title: 'Error',
        message: 'Could not update visibility permissions.',
        type: 'error',
      });
    }
  };

  useEffect(() => {
    if (showManageMembers) {
      fetchGrants();
    }
  }, [showManageMembers, activeBook?.id]);

  // Synchronize presence to server and emit live updates
  useEffect(() => {
    if (!activeBook) return;
    const syncPresence = async () => {
      try {
        await apiClient('/api/presence', {
          method: 'PUT',
          body: JSON.stringify({
            activeBookId: activeBook.id,
            currentChapter: activeThread ? activeThread.title : 'Inscription',
            online: true,
            typing: false,
          }),
        });

        const socket = getSocket();
        socket.emit('user:online', {
          userId: user?.id || 'anon',
          username: user?.username || user?.name || 'Anonymous Scribe',
          activeBookId: activeBook.id,
          currentChapter: activeThread ? activeThread.title : 'Inscription',
        });
      } catch (err) {
        console.warn('Could not update presence in DB:', err);
      }
    };

    syncPresence();
  }, [activeBook?.currentPage, activeThread?.id]);

  // Clean up online status on unmount
  useEffect(() => {
    return () => {
      apiClient('/api/presence', {
        method: 'PUT',
        body: JSON.stringify({
          online: false,
          typing: false,
        }),
      }).catch(err => console.warn('Could not set offline in DB:', err));

      const socket = getSocket();
      socket.emit('user:offline', {
        userId: user?.id || 'anon',
      });
    };
  }, []);

  // Set up socket event listeners for real-time presence, chat, typing, and bookmarks
  useEffect(() => {
    const socket = getSocket();

    const handleUserOnline = (data: any) => {
      console.log('[Socket] user:online received:', data);
      setReadersList(prev => {
        if (prev.some(r => r.userId === data.userId)) {
          return prev.map(r => {
            if (r.userId === data.userId) {
              return {
                ...r,
                online: true,
                status: data.currentChapter ? `Reading ${data.currentChapter}` : 'Flipping pages',
                lastSeen: data.lastSeen || new Date().toISOString(),
              };
            }
            return r;
          });
        } else {
          return [
            ...prev,
            {
              userId: data.userId,
              name: data.username || `Scribe ${data.userId.substring(0, 4)}`,
              role: 'Scribe',
              status: data.currentChapter ? `Reading ${data.currentChapter}` : 'Flipping pages',
              online: true,
              typing: false,
              lastSeen: data.lastSeen || new Date().toISOString(),
            }
          ];
        }
      });
    };

    const handleUserOffline = (data: any) => {
      console.log('[Socket] user:offline received:', data);
      setReadersList(prev =>
        prev.map(r => {
          if (r.userId === data.userId) {
            return {
              ...r,
              online: false,
              typing: false,
              status: 'Offline',
              lastSeen: data.lastSeen || new Date().toISOString(),
            };
          }
          return r;
        })
      );
    };

    const handleTypingStart = (data: any) => {
      console.log('[Socket] typing:start received:', data);
      if (data.userId !== user?.id && data.conversationId === activeThread?.id) {
        setTypingScribe(data.username || 'Another Scribe');
        setReadersList(prev =>
          prev.map(r => {
            if (r.userId === data.userId) {
              return { ...r, typing: true };
            }
            return r;
          })
        );
      }
    };

    const handleTypingStop = (data: any) => {
      console.log('[Socket] typing:stop received:', data);
      if (data.userId !== user?.id) {
        setTypingScribe(null);
        setReadersList(prev =>
          prev.map(r => {
            if (r.userId === data.userId) {
              return { ...r, typing: false };
            }
            return r;
          })
        );
      }
    };

    const handleBookmarkCreated = (data: any) => {
      console.log('[Socket] bookmark:created received:', data);
      if (data.bookId === activeBook?.id) {
        setBookmarks(prev => {
          if (prev.some(b => b.page === data.bookmark.page)) {
            return prev;
          }
          return [...prev, data.bookmark];
        });

        addNotification({
          title: 'Ribbon Placed by Scribe',
          message: `Another scribe has placed a ribbon bookmark on Page ${data.bookmark.page}.`,
          type: 'info'
        });
      }
    };

    const handleVisibilityUpdated = (data: any) => {
      console.log('[Socket] visibility:updated received:', data);
      if (data.bookId === activeBook?.id) {
        loadReaders();
      }
    };

    const handleMembersUpdated = (data: any) => {
      console.log('[Socket] members:updated received:', data);
      if (data.bookId === activeBook?.id) {
        loadReaders();
      }
    };

    const handleBookDeletedSocket = (data: any) => {
      console.log('[Socket] book:deleted received in open book:', data);
      if (data.bookId === activeBook?.id) {
        addNotification({
          title: 'Volume Dissolved',
          message: 'The volume you were reading has been dissolved and permanently deleted by its creator.',
          type: 'error'
        });
        audioService.playPaperShuffle();
        setActiveBook(null);
        onBackToShelf();
      }
    };

    const handleNewNotificationSocket = (data: any) => {
      console.log('[Socket] notification:new received in open-book:', data);
      if (data.bookId === activeBook?.id && data.senderId) {
        setReadersList(prevList => 
          prevList.map(member => {
            if (member.userId === data.senderId) {
              return {
                ...member,
                unreadCount: (member.unreadCount || 0) + 1
              };
            }
            return member;
          })
        );
      }
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('bookmark:created', handleBookmarkCreated);
    socket.on('visibility:updated', handleVisibilityUpdated);
    socket.on('members:updated', handleMembersUpdated);
    socket.on('book:deleted', handleBookDeletedSocket);
    socket.on('notification:new', handleNewNotificationSocket);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('bookmark:created', handleBookmarkCreated);
      socket.off('visibility:updated', handleVisibilityUpdated);
      socket.off('members:updated', handleMembersUpdated);
      socket.off('book:deleted', handleBookDeletedSocket);
      socket.off('notification:new', handleNewNotificationSocket);
    };
  }, [activeBook?.id, activeThread?.id, user?.id]);

  // Catch-up sync function on reconnection (Phase 66)
  const handleSyncMessages = useCallback(async () => {
    try {
      const sinceTime = lastMessageTimestampRef.current || (Date.now() - 3600000);
      console.log('[Sync] Executing catch-up sync with since timestamp:', sinceTime, new Date(sinceTime).toISOString());

      const res = await apiClient<any>(`/api/conversations/sync?since=${sinceTime}`);
      if (!res || !res.messages) return;

      const syncedMessages: any[] = res.messages || [];
      if (res.syncedAt) {
        updateHighWaterMark(res.syncedAt);
      }

      if (syncedMessages.length === 0) {
        console.log('[Sync] No missed messages returned from sync.');
        return;
      }

      console.log(`[Sync] Received ${syncedMessages.length} missed messages across conversations.`);

      for (const raw of syncedMessages) {
        const conversationId = raw.conversationId;
        if (!conversationId) continue;

        if (raw.createdAt) {
          updateHighWaterMark(raw.createdAt);
        }

        const { text: cleanContent, inkColor } = parseInkColor(raw.content || '');
        const { text: cleanReplyToText } = parseInkColor(raw.replyTo ? (raw.replyTo.deletedAt ? 'Original message unavailable' : raw.replyTo.content) : '');

        const mappedMsg: Message = {
          id: raw.id,
          author: (raw.sender?.deletedAt || raw.sender?.email?.startsWith('deleted-user-')) ? 'Deleted Scribe' : (raw.sender?.profile?.displayName || raw.sender?.username || raw.sender?.email || `Scribe ${raw.senderId?.substring(0, 4)}`),
          senderId: raw.senderId,
          text: cleanContent,
          inkColor: inkColor,
          timestamp: raw.createdAt ? new Date(raw.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCurrentUser: raw.senderId === user?.id,
          reactions: raw.reactions?.map((r: any) => typeof r === 'string' ? r : r.emoji) || [],
          replyToId: raw.replyToId || undefined,
          replyToAuthor: raw.replyTo ? ((raw.replyTo.sender?.deletedAt || raw.replyTo.sender?.email?.startsWith('deleted-user-')) ? 'Deleted Scribe' : (raw.replyTo.sender?.profile?.displayName || raw.replyTo.sender?.username || raw.replyTo.sender?.email || `Scribe ${raw.replyTo.senderId?.substring(0, 4)}`)) : undefined,
          replyToText: raw.replyTo ? cleanReplyToText : undefined,
          replyToAttachments: raw.replyTo?.attachments ? raw.replyTo.attachments.map((a: any) => ({
            id: a.id,
            fileUrl: a.fileUrl || a.url,
            fileType: a.fileType,
            fileSize: a.fileSize,
            fileName: a.fileName,
          })) : undefined,
          deletedAt: raw.deletedAt || undefined,
          readAt: raw.readAt || undefined,
          attachments: raw.attachments ? raw.attachments.map((a: any) => ({
            id: a.id,
            fileUrl: a.fileUrl || a.url,
            fileType: a.fileType,
            fileSize: a.fileSize,
            fileName: a.fileName,
          })) : [],
        };

        // Merge into messagesCache idempotently
        setMessagesCache(prevCache => {
          let exists = false;
          for (const k of Object.keys(prevCache)) {
            if (k.startsWith(`${conversationId}_page_`)) {
              if (prevCache[k].some(m => m.id === mappedMsg.id)) {
                exists = true;
                break;
              }
            }
          }
          if (exists) return prevCache;

          const currentTotalPages = totalPagesMap[conversationId] || 1;
          const latestCacheKey = `${conversationId}_page_${currentTotalPages}`;
          const latestMsgs = prevCache[latestCacheKey] || [];

          if (latestMsgs.length < 16) {
            return {
              ...prevCache,
              [latestCacheKey]: [...latestMsgs, mappedMsg]
            };
          } else {
            const newTotal = currentTotalPages + 1;
            setTimeout(() => {
              setTotalPagesMap(prev => ({
                ...prev,
                [conversationId]: newTotal
              }));
              if (activeThreadId === conversationId && currentChatPage === currentTotalPages) {
                setCurrentChatPage(newTotal);
              }
            }, 0);

            const newCacheKey = `${conversationId}_page_${newTotal}`;
            return {
              ...prevCache,
              [newCacheKey]: [mappedMsg]
            };
          }
        });

        const isFromMe = mappedMsg.senderId === user?.id;
        const isCurrentThread = activeThreadId === conversationId;

        if (!isFromMe) {
          if (isCurrentThread) {
            audioService.playPenFinish();
            setShowJumpToLatest(true);
          } else {
            audioService.playStickyFall();
            const senderName = mappedMsg.author;
            const contentPreview = mappedMsg.text || 'Sent a message.';

            const colors: ('yellow' | 'pink' | 'blue' | 'mint' | 'peach')[] = ['yellow', 'pink', 'blue', 'mint', 'peach'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            addNotification({
              title: `Message from ${senderName}`,
              message: contentPreview,
              type: 'info',
              color: randomColor,
              conversationId: conversationId,
              bookId: activeBook?.id || 'vol-2',
              senderId: mappedMsg.senderId,
              senderName: senderName,
              lifecycleState: 'delivered',
            });

            setReadersList(prevList => 
              prevList.map(member => {
                if (member.userId === mappedMsg.senderId) {
                  return {
                    ...member,
                    unreadCount: (member.unreadCount || 0) + 1
                  };
                }
                return member;
              })
            );
          }
        }
      }
    } catch (err) {
      console.error('[Sync] Error during catch-up sync:', err);
    }
  }, [user?.id, activeThreadId, currentChatPage, totalPagesMap, activeBook?.id, addNotification, updateHighWaterMark]);

  // Manage all room joins and track active viewing status (with socket reconnection handling)
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const synchronizeSocketState = async () => {
      try {
        console.log('[Socket] Synchronizing socket state for user:', user.id);
        
        // 1. Join user notification room
        socket.emit('user:join', user.id);

        // 2. Track active conversation being viewed
        if (activeThread?.id) {
          console.log(`[Socket] Emitting active view for: ${activeThread.id}`);
          socket.emit('conversation:view', { conversationId: activeThread.id, userId: user.id });
        } else {
          socket.emit('conversation:view', { conversationId: null, userId: user.id });
        }

        // 3. Join actively viewed thread room
        if (activeThread?.id) {
          const roomName = `chat:${activeThread.id}`;
          socket.emit('room:join', roomName);
          console.log(`[Socket] Joined active room: ${roomName}`);
        }

        // 4. Proactively join other book-level chat rooms
        if (activeBook) {
          // Join proactive standard rooms of this book
          const isPredefined = ['vol-2', 'vol-3', 'vol-6', 'vol-10', 'vol-13'].includes(activeBook.id);
          const chapters = BOOK_SCHEMAS[activeBook.id] || BOOK_SCHEMAS['vol-2'];
          chapters.forEach(ch => {
            ch.threads.forEach(t => {
              const id = isPredefined ? t.id : `${activeBook.id}-${t.id}`;
              socket.emit('room:join', `chat:${id}`);
            });
          });

          // Join direct chats of this book
          const res = await apiClient<any>('/api/chats').catch(() => null);
          const conversations = res?.data || res || [];
          const activeBookDirectChats = conversations.filter((c: any) => c.bookId === activeBook.id);
          activeBookDirectChats.forEach((c: any) => {
            socket.emit('room:join', `chat:${c.id}`);
          });
        }
      } catch (err) {
        console.warn('[Socket] Failed to synchronize state:', err);
      }
    };

    const handleConnect = async () => {
      console.log('[Socket] Connect event fired. Synchronizing socket state & catch-up sync...');
      await synchronizeSocketState();

      if (hasDisconnectedRef.current) {
        setConnectionStatus('reconnecting');
        await handleSyncMessages();
        hasDisconnectedRef.current = false;
        setConnectionStatus('back_online');
        setTimeout(() => {
          setConnectionStatus('connected');
        }, 2500);
      } else {
        setConnectionStatus('connected');
      }
    };

    const handleDisconnect = (reason: string) => {
      console.warn('[Socket] Socket disconnected:', reason);
      hasDisconnectedRef.current = true;
      setConnectionStatus('reconnecting');
    };

    const handleConnectError = (err: any) => {
      console.warn('[Socket] Socket connect error:', err);
      hasDisconnectedRef.current = true;
      setConnectionStatus('reconnecting');
    };

    // Synchronize immediately on mount or dependency change
    synchronizeSocketState();

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      // Clean up when active thread changes or unmounts
      if (activeThread?.id) {
        const roomName = `chat:${activeThread.id}`;
        socket.emit('room:leave', roomName);
      }
      socket.emit('conversation:view', { conversationId: null, userId: user.id });
    };
  }, [user?.id, activeBook?.id, activeThread?.id, handleSyncMessages]);

  // Subscribe to real-time chat messages
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (data: { conversationId: string; message: any }) => {
      console.log('[Socket] message:new received:', data);

      setTotalPagesMap(prevTotalPagesMap => {
        const totalPages = prevTotalPagesMap[data.conversationId] || 1;
        
        setMessagesCache(prevCache => {
          // Prevent duplicates across all cached pages of this conversation
          let exists = false;
          for (const k of Object.keys(prevCache)) {
            if (k.startsWith(`${data.conversationId}_page_`)) {
              if (prevCache[k].some(m => m.id === data.message.id)) {
                exists = true;
                break;
              }
            }
          }
          if (exists) return prevCache;

          const raw = data.message;
          if (raw.createdAt) updateHighWaterMark(raw.createdAt);
          const { text: cleanText, inkColor } = parseInkColor(raw.text || raw.content || '');
          const { text: cleanReplyToText } = parseInkColor(raw.replyToText || (raw.replyTo ? (raw.replyTo.deletedAt ? 'Original message unavailable' : raw.replyTo.content) : ''));

          const mappedMsg: Message = {
            id: raw.id,
            author: raw.author || raw.sender?.profile?.displayName || raw.sender?.username || raw.sender?.email || `Scribe ${raw.senderId?.substring(0, 4)}`,
            senderId: raw.senderId,
            text: cleanText,
            inkColor: inkColor,
            timestamp: raw.timestamp || (raw.createdAt ? new Date(raw.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
            isCurrentUser: raw.senderId === user?.id,
            reactions: raw.reactions?.map((r: any) => typeof r === 'string' ? r : r.emoji) || [],
            replyToId: raw.replyToId || undefined,
            replyToAuthor: raw.replyToAuthor || (raw.replyTo ? (raw.replyTo.sender?.profile?.displayName || raw.replyTo.sender?.username || raw.replyTo.sender?.email || `Scribe ${raw.replyTo.senderId.substring(0, 4)}`) : undefined),
            replyToText: cleanReplyToText || undefined,
            replyToAttachments: raw.replyToAttachments || (raw.replyTo?.attachments ? raw.replyTo.attachments.map((a: any) => ({
              id: a.id,
              fileUrl: a.fileUrl || a.url,
              fileType: a.fileType,
              fileSize: a.fileSize,
              fileName: a.fileName,
            })) : undefined),
            deletedAt: raw.deletedAt || undefined,
            readAt: raw.readAt || undefined,
            attachments: raw.attachments ? raw.attachments.map((a: any) => ({
              id: a.id,
              fileUrl: a.fileUrl || a.url,
              fileType: a.fileType,
              fileSize: a.fileSize,
              fileName: a.fileName,
            })) : [],
          };

          const isFromMe = mappedMsg.senderId === user?.id;
          const isCurrentThread = activeThreadId === data.conversationId;

          if (!isFromMe) {
            if (isCurrentThread) {
              audioService.playPenFinish();

              // If not on the latest page or scrolled up on latest page, show jump-to-latest indicator
              const isViewingLatest = currentChatPage === totalPages;
              const container = chatScrollRef.current;
              const isNearBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 120) : false;
              if (!isViewingLatest || !isNearBottom) {
                setShowJumpToLatest(true);
              }
            } else {
              // Play incoming sticky note sound
              audioService.playStickyFall();

              // Gentle browser native notification if unfocused
              const senderName = mappedMsg.author;
              const contentPreview = mappedMsg.text || 'Sent a message.';

              if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'default') {
                  Notification.requestPermission();
                } else if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
                  new Notification(`New Message from ${senderName}`, {
                    body: contentPreview,
                  });
                }
              }

              // Show Sticky Note Toast!
              const colors: ('yellow' | 'pink' | 'blue' | 'mint' | 'peach')[] = ['yellow', 'pink', 'blue', 'mint', 'peach'];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];

              const matchingThread = chatThreads.flatMap(c => c.threads).find(t => t.id === data.conversationId);
              const pageNum = matchingThread ? matchingThread.page : undefined;

              addNotification({
                title: `Message from ${senderName}`,
                message: contentPreview,
                type: 'info',
                color: randomColor,
                page: pageNum,
                conversationId: data.conversationId,
                bookId: activeBook?.id || 'vol-2',
                senderId: mappedMsg.senderId,
                senderName: senderName,
                lifecycleState: 'delivered',
              });
            }
          } else {
            // My own messages still play the pen finish sound
            audioService.playPenFinish();
          }

          const latestCacheKey = `${data.conversationId}_page_${totalPages}`;
          const latestMsgs = prevCache[latestCacheKey] || [];

          if (latestMsgs.length < 16) {
            return {
              ...prevCache,
              [latestCacheKey]: [...latestMsgs, mappedMsg]
            };
          } else {
            const newTotal = totalPages + 1;
            
            // Update totalPagesMap in the outer state
            setTimeout(() => {
              setTotalPagesMap(prev => ({
                ...prev,
                [data.conversationId]: newTotal
              }));
            }, 0);

            const newCacheKey = `${data.conversationId}_page_${newTotal}`;
            const isViewingLatestPageBefore = activeThreadId === data.conversationId && currentChatPage === totalPages;

            if (isViewingLatestPageBefore) {
              setTimeout(() => {
                setCurrentChatPage(newTotal);
              }, 0);
            }

            return {
              ...prevCache,
              [newCacheKey]: [mappedMsg]
            };
          }
        });

        return prevTotalPagesMap;
      });
    };

    const handleDeletedMessage = (data: { conversationId: string; messageId: string }) => {
      setMessagesCache(prevCache => {
        const nextCache = { ...prevCache };
        for (const k of Object.keys(nextCache)) {
          if (k.startsWith(`${data.conversationId}_page_`)) {
            nextCache[k] = nextCache[k].map(m => {
              if (m.id === data.messageId) {
                return {
                  ...m,
                  deletedAt: new Date().toISOString(),
                };
              }
              if (m.replyToId === data.messageId) {
                return {
                  ...m,
                  replyToText: 'Original message unavailable',
                };
              }
              return m;
            });
          }
        }
        return nextCache;
      });
    };

    const handleMessageRead = (data: { conversationId: string; messageId: string; readAt: string }) => {
      console.log('[Socket] message:read received:', data);
      setMessagesCache(prevCache => {
        const nextCache = { ...prevCache };
        for (const k of Object.keys(nextCache)) {
          if (k.startsWith(`${data.conversationId}_page_`)) {
            nextCache[k] = nextCache[k].map(m => {
              if (m.id === data.messageId) {
                return {
                  ...m,
                  readAt: data.readAt,
                };
              }
              return m;
            });
          }
        }
        return nextCache;
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('message:read', handleMessageRead);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('message:read', handleMessageRead);
    };
  }, [activeThreadId, currentChatPage, user?.id, chatThreads, activeBook?.id, addNotification]);

  // Removed separate proactive room-joining effect in favor of consolidated synchronization

  // Synchronize target direct chat from store
  useEffect(() => {
    if (!targetDirectChat) return;

    // Open direct chat page (page 12 or whatever)
    if (activeBook) {
      if (activeBook.currentPage === 1) {
        handlePageFlipTo(12);
      }
    }

    setActiveDirectChat({
      id: targetDirectChat.id,
      title: `Direct &bull; ${targetDirectChat.recipientName}`,
      isDirect: true,
      recipientName: targetDirectChat.recipientName,
      recipientId: targetDirectChat.recipientId,
      messages: messagesCache[targetDirectChat.id] || [],
    });

    setLeftTab('discussions');

    // Clean up from store so we don't trigger in a loop
    setTargetDirectChat(null);
  }, [targetDirectChat, activeBook, setTargetDirectChat, messagesCache]);

  // Synchronize current page when switching active thread
  useEffect(() => {
    if (!activeThreadId) return;
    const loadedPages = totalPagesMap[activeThreadId];
    if (loadedPages !== undefined) {
      setCurrentChatPage(loadedPages);
    } else {
      setCurrentChatPage(1);
    }
  }, [activeThreadId]);

  // Reset unread count to 0 for a conversation when the user actually opens it
  useEffect(() => {
    if (!activeThreadId) return;
    
    const markAsRead = async () => {
      try {
        await apiClient(`/api/messages/conversations/${activeThreadId}/read`, {
          method: 'POST',
        });
      } catch (err) {
        console.error('[API] Failed to mark conversation as read on open:', err);
      }
    };
    markAsRead();
  }, [activeThreadId]);

  // Load message history for the active thread from REST API
  useEffect(() => {
    if (!activeThreadId) return;

    const loadThreadMessages = async () => {
      try {
        const cacheKey = `${activeThreadId}_page_${currentChatPage}`;
        if (fetchedKeysRef.current[cacheKey]) {
          return;
        }

        const hasLoadedPages = totalPagesMap[activeThreadId] !== undefined;
        const url = hasLoadedPages 
          ? `/api/messages/conversations/${activeThreadId}/messages?page=${currentChatPage}`
          : `/api/messages/conversations/${activeThreadId}/messages`;

        const res = await apiClient<any>(url);
        if (res && res.messages) {
          res.messages.forEach((m: any) => {
            if (m.createdAt) updateHighWaterMark(m.createdAt);
          });
          const mapped: Message[] = res.messages.map((m: any) => {
            const { text: cleanText, inkColor } = parseInkColor(m.content || m.text || '');
            const { text: cleanReplyToText } = parseInkColor(m.replyTo ? (m.replyTo.deletedAt ? 'Original message unavailable' : m.replyTo.content) : '');
            return {
              id: m.id,
              author: (m.sender?.deletedAt || m.sender?.email?.startsWith('deleted-user-')) ? 'Deleted Scribe' : (m.sender?.profile?.displayName || m.sender?.username || m.sender?.email || `Scribe ${m.senderId.substring(0, 4)}`),
              senderId: m.senderId,
              text: cleanText,
              inkColor: inkColor,
              timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isCurrentUser: m.senderId === user?.id,
              reactions: m.reactions?.map((r: any) => r.emoji) || [],
              replyToId: m.replyToId || undefined,
              replyToAuthor: m.replyTo ? ((m.replyTo.sender?.deletedAt || m.replyTo.sender?.email?.startsWith('deleted-user-')) ? 'Deleted Scribe' : (m.replyTo.sender?.profile?.displayName || m.replyTo.sender?.username || m.replyTo.sender?.email || `Scribe ${m.replyTo.senderId.substring(0, 4)}`)) : undefined,
              replyToText: m.replyTo ? cleanReplyToText : undefined,
            replyToAttachments: m.replyTo?.attachments ? m.replyTo.attachments.map((a: any) => ({
              id: a.id,
              fileUrl: a.fileUrl || a.url,
              fileType: a.fileType,
              fileSize: a.fileSize,
              fileName: a.fileName,
            })) : undefined,
            deletedAt: m.deletedAt || undefined,
            readAt: m.readAt || undefined,
            attachments: m.attachments ? m.attachments.map((a: any) => ({
              id: a.id,
              fileUrl: a.fileUrl || a.url,
              fileType: a.fileType,
              fileSize: a.fileSize,
              fileName: a.fileName,
            })) : [],
          };
        });

          const respPage = res.currentPage || currentChatPage;
          const respTotalPages = res.totalPages || 1;

          setTotalPagesMap(prev => ({
            ...prev,
            [activeThreadId]: respTotalPages
          }));

          if (!hasLoadedPages) {
            setCurrentChatPage(respPage);
          }

          // If it's a predefined book and page 1, merge with static mock messages
          let finalMessages = mapped;
          if (activeBook) {
            const isPredefined = ['vol-2', 'vol-3', 'vol-6', 'vol-10', 'vol-13'].includes(activeBook.id);
            if (isPredefined && respPage === 1) {
              const chapters = BOOK_SCHEMAS[activeBook.id] || [];
              const matchingMockThread = chapters.flatMap(c => c.threads).find(t => t.id === activeThreadId);
              const mockMessages = matchingMockThread ? matchingMockThread.messages : [];
              const existingTexts = new Set(mockMessages.map(m => m.text));
              const newMessages = mapped.filter(m => !existingTexts.has(m.text));
              finalMessages = [...mockMessages, ...newMessages];
            }
          }

          const targetCacheKey = `${activeThreadId}_page_${respPage}`;
          setMessagesCache(prev => ({
            ...prev,
            [targetCacheKey]: finalMessages
          }));

          fetchedKeysRef.current[targetCacheKey] = true;
        }
      } catch (err) {
        console.warn('Could not load historical messages from API:', err);
      }
    };

    loadThreadMessages();
  }, [activeThreadId, currentChatPage, user?.id, activeBook]);

  // Chapter wheel scroll listener removed per user request (prevents scrolling inside chat from turning pages)

  // Save scroll position on user scroll
  const handleChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 15;
    const isAtTop = container.scrollTop <= 10;

    if (!isAtBottom && !isAtTop && scrollBoundaryCue) {
      setScrollBoundaryCue(null);
      wheelDeltaAccumulatorRef.current = 0;
    }

    if (activeThreadId) {
      const scrollKey = `${activeThreadId}_page_${currentChatPage}`;
      scrollPositionsRef.current[scrollKey] = container.scrollTop;

      // Clear jump-to-latest indicator if scrolled near the bottom of the latest page
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
      const totalPages = totalPagesMap[activeThreadId] || 1;
      const isLatestPage = currentChatPage === totalPages;
      if (isNearBottom && isLatestPage) {
        setShowJumpToLatest(false);
      }
    }
  };

  // Restore scroll position on conversation change
  useEffect(() => {
    if (!activeThreadId || !chatScrollRef.current) return;
    const scrollKey = `${activeThreadId}_page_${currentChatPage}`;
    const savedScrollTop = scrollPositionsRef.current[scrollKey];
    if (savedScrollTop !== undefined) {
      chatScrollRef.current.scrollTop = savedScrollTop;
    } else {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeThread?.id]);

  // Handle auto-scroll to bottom on new message
  useEffect(() => {
    if (!activeThread || !chatScrollRef.current) return;
    const container = chatScrollRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    const lastMsg = activeThread.messages[activeThread.messages.length - 1];
    const isFromMe = lastMsg?.senderId === user?.id || lastMsg?.author === 'You';
    if (isNearBottom || isFromMe) {
      container.scrollTop = container.scrollHeight;
    }
  }, [activeThread?.messages?.length]);

  // Reset jump-to-latest indicator when active thread changes
  useEffect(() => {
    setShowJumpToLatest(false);
  }, [activeThreadId]);

  // Typing state indicators ref and timeout handling
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!activeThread || !user) return;

    const socket = getSocket();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', {
        userId: user.id,
        username: user.username || user.name || 'Anonymous Scribe',
        conversationId: activeThread.id,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit('typing:stop', {
          userId: user.id,
          username: user.username || user.name || 'Anonymous Scribe',
          conversationId: activeThread.id,
        });
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const updateMessageInCache = (conversationId: string, msgId: string, updater: (m: Message) => Message) => {
    setMessagesCache(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${conversationId}_page_`)) {
          const msgs = next[key] || [];
          if (msgs.some(m => m.id === msgId)) {
            next[key] = msgs.map(m => m.id === msgId ? updater(m) : m);
          }
        }
      }
      return next;
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeThreadId) return;
    try {
      await apiClient<any>(`/api/messages/messages/${messageId}`, {
        method: 'DELETE',
      });

      // Play skeuomorphic page/pen sound to represent striking out a message
      audioService.playPenFinish();

      setMessagesCache(prevCache => {
        const nextCache = { ...prevCache };
        for (const k of Object.keys(nextCache)) {
          if (k.startsWith(`${activeThreadId}_page_`)) {
            nextCache[k] = nextCache[k].map(m => {
              if (m.id === messageId) {
                return {
                  ...m,
                  deletedAt: new Date().toISOString(),
                };
              }
              if (m.replyToId === messageId) {
                return {
                  ...m,
                  replyToText: 'Original message unavailable',
                };
              }
              return m;
            });
          }
        }
        return nextCache;
      });

      const socket = getSocket();
      socket.emit('message:deleted', {
        conversationId: activeThreadId,
        messageId,
      });

      addNotification({
        title: 'Inscription Deleted',
        message: 'The line has been struck out with dark ink.',
        type: 'success',
      });
    } catch (err) {
      console.warn('Could not delete message:', err);
      addNotification({
        title: 'Strikethrough Failed',
        message: 'Only the original scribe may strike out their line.',
        type: 'error',
      });
    }
  };

  const handleHideMessageForMe = async (messageId: string) => {
    if (!activeThreadId) return;

    // Always add to localHiddenMessageIds and play audio right away for instant feedback
    setLocalHiddenMessageIds(prev => {
      const next = [...prev, messageId];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('local_hidden_messages', JSON.stringify(next));
        } catch (e) {
          console.warn('Could not write to localStorage:', e);
        }
      }
      return next;
    });
    audioService.playPenFinish();

    // Also update current cache to trigger instant re-render
    setMessagesCache(prevCache => {
      const nextCache = { ...prevCache };
      for (const k of Object.keys(nextCache)) {
        if (k.startsWith(`${activeThreadId}_page_`)) {
          nextCache[k] = nextCache[k].filter(m => m.id !== messageId);
        }
      }
      return nextCache;
    });

    try {
      await apiClient<any>(`/api/messages/messages/${messageId}/hide-for-me`, {
        method: 'POST',
      });

      addNotification({
        title: 'Inscription Hidden',
        message: 'This line is now hidden from your personal log.',
        type: 'success',
      });
    } catch (err) {
      console.warn('Could not hide message on server:', err);
      // Quietly succeed since the message is already hidden locally (perfect for mock messages)
      addNotification({
        title: 'Inscription Hidden',
        message: 'This line is now hidden from your personal log.',
        type: 'success',
      });
    }
  };

  // Trigger book-opening sequence on mount
  useEffect(() => {
    setIsOpen(true);
    audioService.playBookOpen();
    audioService.startAmbience();
    return () => {
      audioService.stopAmbience();
    };
  }, []);

  // Load settings preference from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const pref = await apiClient<any>('/api/settings/theme');
        if (pref) {
          if (pref.themeName) {
            const mappedTheme = 
              pref.themeName === 'Classic Library' ? 'classic-library' :
              pref.themeName === 'Vintage Journal' ? 'vintage-journal' :
              pref.themeName === 'Night Reading' ? 'night-reading' :
              pref.themeName === 'Rainy Evening' ? 'rainy-evening' :
              pref.themeName === 'Fireplace' ? 'fireplace' :
              pref.themeName === 'Collector Edition' ? 'collector-edition' :
              pref.themeName === 'Lined Journal' ? 'lined-journal' : 'classic-library';
            useThemeStore.getState().setTheme(mappedTheme as any);
          }
          if (pref.fontSize) {
            const isLarge = pref.fontSize === 'large';
            const store = useThemeStore.getState();
            if (store.largeText !== isLarge) store.toggleLargeText();
          }
          if (pref.reducedMotion !== undefined) {
            const store = useThemeStore.getState();
            if (store.reducedMotion !== pref.reducedMotion) store.toggleReducedMotion();
          }
          if (pref.highContrast !== undefined) {
            const store = useThemeStore.getState();
            if (store.highContrast !== pref.highContrast) store.toggleHighContrast();
          }
          
          // Sound
          const audioStore = useAudioStore.getState();
          if (pref.masterMute !== undefined) audioStore.setMasterMute(pref.masterMute);
          if (pref.uiVolume !== undefined) audioStore.setUiVolume(pref.uiVolume);
          if (pref.writingVolume !== undefined) audioStore.setWritingVolume(pref.writingVolume);
          if (pref.ambienceVolume !== undefined) {
            audioStore.setAmbienceVolume(pref.ambienceVolume);
            setTimeout(() => {
              audioService.updateAmbienceVolume();
            }, 50);
          }
        }
      } catch (err) {
        console.warn('Could not load theme preferences from database:', err);
      }
    };
    loadSettings();
  }, [user?.id]);

  // 1. Hook up dynamic book breathing (idle state)
  useBookBreathing(bookSpreadRef, { scale: true, enabled: isOpen });

  // 2. Hook up skeuomorphic hardcover opening/closing 3D pivot
  useHardcoverAnimation(bookSpreadRef, isOpen, {
    leftPageSelector: '.left-page-container',
    rightPageSelector: '.right-page-container',
    gutterSelector: '.gutter-crease',
  });

  // 3. Attach fold/unfold animation to guidelines panel
  usePaperFoldUnfold(guidelinesRef, isGuidelinesOpen, { direction: 'top', tension: 1.8 });

  // 4. Attach physical compression to major buttons for visceral tactile response
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const refillBtnRef = useRef<HTMLButtonElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const foldHeaderRef = useRef<HTMLButtonElement>(null);

  usePaperCompression(backBtnRef, { intensity: 'hard' });
  usePaperCompression(refillBtnRef, { intensity: 'soft' });
  usePaperCompression(sendBtnRef, { intensity: 'medium' });
  usePaperCompression(foldHeaderRef, { intensity: 'soft' });

  // Handle message compose
  const handleSendMessage = (e: React.FormEvent, attachments?: AttachmentItem[], selectedInkColor: InkColor = 'blue') => {
    e.preventDefault();
    if ((!inputText.trim() && (!attachments || attachments.length === 0)) || !activeBook || !activeThread) return;

    if (inkLevel <= 5) {
      addNotification({
        title: 'Inkwell Depleted',
        message: 'Your quill has run dry. Refill your ink reservoir from the desk.',
        type: 'warning'
      });
      return;
    }

    const formattedContent = `[[ink:${selectedInkColor}]]${inputText}`;

    const newMsg: Message = {
      id: String(Date.now()),
      author: user?.username || user?.name || 'You',
      senderId: user?.id,
      text: inputText,
      inkColor: selectedInkColor,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true,
      attachments: attachments || [],
      ...(replyToMessage ? {
        replyToId: replyToMessage.id,
        replyToAuthor: replyToMessage.author,
        replyToText: replyToMessage.text,
        replyToAttachments: replyToMessage.attachments,
      } : {})
    };

    // 1. Optimistic local state update based on page capacity (16 messages per page)
    const totalPages = totalPagesMap[activeThread.id] || 1;
    const latestCacheKey = `${activeThread.id}_page_${totalPages}`;
    const latestMsgs = messagesCache[latestCacheKey] || [];

    let targetPage = totalPages;
    if (latestMsgs.length >= 16) {
      targetPage = totalPages + 1;
      setTotalPagesMap(prev => ({
        ...prev,
        [activeThread.id]: targetPage
      }));
      setCurrentChatPage(targetPage);
      setMessagesCache(prev => ({
        ...prev,
        [`${activeThread.id}_page_${targetPage}`]: [newMsg]
      }));
    } else {
      setCurrentChatPage(totalPages);
      setMessagesCache(prev => ({
        ...prev,
        [`${activeThread.id}_page_${totalPages}`]: [...latestMsgs, newMsg]
      }));
    }

    setInputText('');
    setReplyToMessage(null); // Clear active reply thread
    setInkLevel(prev => Math.max(0, prev - 12)); // Quill usage drains inkwell
    audioService.playPenFinish();

    // 2. Clear typing indicator on submit
    if (isTypingRef.current) {
      isTypingRef.current = false;
      const socket = getSocket();
      socket.emit('typing:stop', {
        userId: user?.id,
        username: user?.username || user?.name || 'Anonymous Scribe',
        conversationId: activeThread.id,
      });
    }

    // 3. Save to server database via REST API, then emit socket event to broadcast
    apiClient<any>(`/api/messages/conversations/${activeThread.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        id: newMsg.id,
        content: formattedContent,
        messageType: (attachments && attachments.length > 0 && !newMsg.text) ? 'ATTACHMENT' : 'TEXT',
        replyToId: newMsg.replyToId || null,
        attachments: attachments && attachments.length > 0 ? attachments.map(a => ({
          url: a.fileUrl,
          fileType: a.fileType,
          fileSize: a.fileSize,
          fileName: a.fileName,
        })) : undefined,
      }),
    }).then((savedMsg) => {
      console.log('[API] Message saved on server:', savedMsg);
      if (savedMsg?.createdAt) updateHighWaterMark(savedMsg.createdAt);
      
      const { text: cleanSavedText, inkColor: savedInkColor } = parseInkColor(savedMsg.content);
      const { text: cleanSavedReplyText } = parseInkColor(savedMsg.replyTo ? (savedMsg.replyTo.deletedAt ? 'Original message unavailable' : savedMsg.replyTo.content) : '');

      const mappedSavedMsg: Message = {
        id: savedMsg.id,
        author: savedMsg.sender?.profile?.displayName || savedMsg.sender?.username || savedMsg.sender?.email || `Scribe ${savedMsg.senderId.substring(0, 4)}`,
        senderId: savedMsg.senderId,
        text: cleanSavedText,
        inkColor: savedInkColor,
        timestamp: new Date(savedMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: savedMsg.senderId === user?.id,
        reactions: savedMsg.reactions?.map((r: any) => r.emoji) || [],
        replyToId: savedMsg.replyToId || undefined,
        replyToAuthor: savedMsg.replyTo ? (savedMsg.replyTo.sender?.profile?.displayName || savedMsg.replyTo.sender?.username || savedMsg.replyTo.sender?.email || `Scribe ${savedMsg.replyTo.senderId.substring(0, 4)}`) : undefined,
        replyToText: savedMsg.replyTo ? cleanSavedReplyText : undefined,
        replyToAttachments: savedMsg.replyTo?.attachments ? savedMsg.replyTo.attachments.map((a: any) => ({
          id: a.id,
          fileUrl: a.fileUrl,
          fileType: a.fileType,
          fileSize: a.fileSize,
          fileName: a.fileName,
        })) : undefined,
        deletedAt: savedMsg.deletedAt || undefined,
        readAt: savedMsg.readAt || undefined,
        attachments: savedMsg.attachments ? savedMsg.attachments.map((a: any) => ({
          id: a.id,
          fileUrl: a.fileUrl,
          fileType: a.fileType,
          fileSize: a.fileSize,
          fileName: a.fileName,
        })) : [],
      };

      // Replace optimistic message with actual mapped saved message in state
      updateMessageInCache(activeThread.id, newMsg.id, () => mappedSavedMsg);

      const socket = getSocket();
      socket.emit('message:new', {
        conversationId: activeThread.id,
        message: mappedSavedMsg,
      });
    }).catch((err) => {
      console.warn('[API] Could not save message to server:', err);
    });
  };

  const handleRefillInk = () => {
    setInkLevel(100);
    addNotification({
      title: 'Ink Refilled',
      message: 'Your fountain pen has been freshly loaded with dark sepia ink.',
      type: 'success'
    });
  };

  const handleAddBookmark = async () => {
    if (!activeBook) return;
    const pageNum = activeBook.currentPage;
    
    // Avoid duplicates
    if (bookmarks.some(b => b.page === pageNum)) {
      addNotification({
        title: 'Ribbon Already Placed',
        message: `A ribbon is already active on Page ${pageNum}.`,
        type: 'info'
      });
      return;
    }

    const label = bookmarkLabel.trim() || `Bookmark on Page ${pageNum}`;

    try {
      // 1. Save to server via REST API
      const response = await apiClient<any>('/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          bookId: activeBook.id,
          pageNumber: pageNum,
          notes: label,
        }),
      });

      const newB = {
        id: response.id || String(Date.now()),
        page: pageNum,
        label: label,
      };

      setBookmarks([...bookmarks, newB]);
      setBookmarkLabel('');
      audioService.playRibbonSlide();

      // 2. Broadcast live event via Socket.IO
      const socket = getSocket();
      socket.emit('bookmark:created', {
        userId: user?.id || 'anon',
        bookId: activeBook.id,
        bookmark: newB,
      });

      addNotification({
        title: 'Bookmark Ribbon Saved',
        message: `A golden silk ribbon has been placed on Page ${pageNum}.`,
        type: 'success'
      });
    } catch (err) {
      console.error('[API] Failed to save bookmark:', err);
      // Fallback local update if API fails (e.g. database not seeded or offline)
      const newB = {
        id: String(Date.now()),
        page: pageNum,
        label: label,
      };
      setBookmarks([...bookmarks, newB]);
      setBookmarkLabel('');
      audioService.playRibbonSlide();
    }
  };

  const handleRemoveBookmark = async (id: string) => {
    try {
      // Delete from server via REST API
      await apiClient(`/api/bookmarks/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('[API] Could not delete bookmark from server:', err);
    }
    
    // Always remove from local state
    setBookmarks(bookmarks.filter(b => b.id !== id));
    audioService.playPaperShuffle();
  };

  const handleCreateAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annotationText.trim() || !activeBook) return;

    try {
      const notes = annotationText.trim();
      const pageNum = activeBook.currentPage;
      const chName = activeThread ? activeThread.title : 'Inscription';

      const response = await apiClient<any>('/api/annotations', {
        method: 'POST',
        body: JSON.stringify({
          bookId: activeBook.id,
          notes,
          pageNumber: pageNum,
          chapter: chName,
        }),
      });

      if (response && response.data) {
        setAnnotations(prev => [response.data, ...prev]);
        setAnnotationText('');
        audioService.playPenFinish();
        addNotification({
          title: 'Handwritten Marginalia Inscribed',
          message: `Your handwritten annotation has been cataloged under Page ${pageNum}.`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error('[API] Failed to create annotation:', err);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      await apiClient(`/api/annotations/${id}`, {
        method: 'DELETE',
      });
      setAnnotations(prev => prev.filter(a => a.id !== id));
      audioService.playPaperShuffle();
    } catch (err) {
      console.warn('[API] Failed to delete annotation:', err);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteText.trim() || !activeBook) return;

    try {
      const content = quoteText.trim();
      const pageNum = activeBook.currentPage;

      const response = await apiClient<any>('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          bookId: activeBook.id,
          content,
          pageNumber: pageNum,
        }),
      });

      if (response && response.data) {
        setQuotes(prev => [response.data, ...prev]);
        setQuoteText('');
        audioService.playRibbonSlide();
        addNotification({
          title: 'Quote Card Filed',
          message: `A printed index card with your saved quote has been filed under Page ${pageNum}.`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error('[API] Failed to save quote:', err);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    try {
      await apiClient(`/api/quotes/${id}`, {
        method: 'DELETE',
      });
      setQuotes(prev => prev.filter(q => q.id !== id));
      audioService.playPaperShuffle();
    } catch (err) {
      console.warn('[API] Failed to delete quote:', err);
    }
  };

  // Coordinated physical page flipping coordinator
  const handlePageFlip = (direction: 'next' | 'prev') => {
    const container = bookSpreadRef.current;
    if (!container || !activeBook) return;

    // Clear 1:1 direct chat state on routine navigation
    setActiveDirectChat(null);
    setSelectedMemberId(null);

    const currentIndex = validPages.indexOf(activeBook.currentPage);
    let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    // Bounds safety loop
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= validPages.length) targetIndex = validPages.length - 1;

    const targetPage = validPages[targetIndex];
    if (targetPage === activeBook.currentPage) return;

    // Play tactile physical paper rustle sound
    audioService.playPageFlip();

    // Trigger full-blooded 3D curved flip
    performPageTurn({
      container,
      direction,
      isReduced,
      themeClassNames: {
        surface: 'bg-paper-surface',
        border: 'border-paper-border',
        ink: 'text-ink-secondary',
      },
      onPageSwap: () => {
        updateProgress(targetPage);
      }
    });
  };

  // Immediate physical page jump (perfect for Table of Contents or Bookmark Ribbon clicks)
  const handlePageFlipTo = (targetPage: number) => {
    const container = bookSpreadRef.current;
    if (!container || !activeBook || targetPage === activeBook.currentPage) return;

    // Clear 1:1 direct chat state on routine navigation
    setActiveDirectChat(null);
    setSelectedMemberId(null);

    const direction = targetPage > activeBook.currentPage ? 'next' : 'prev';

    audioService.playPageFlip();

    performPageTurn({
      container,
      direction,
      isReduced,
      themeClassNames: {
        surface: 'bg-paper-surface',
        border: 'border-paper-border',
        ink: 'text-ink-secondary',
      },
      onPageSwap: () => {
        updateProgress(targetPage);
      }
    });
  };

  const handleBackToShelfAnimate = () => {
    setIsOpen(false);
    audioService.playBookClose();
    audioService.stopAmbience();
    setTimeout(() => {
      onBackToShelf();
    }, 700);
  };

  // Unified page-turn calculation according to total pages for active thread
  const totalPagesForActiveThread = activeThreadId ? (totalPagesMap[activeThreadId] || 1) : 1;
  const currentChapterIndex = validPages.indexOf(activeBook?.currentPage || 1);

  const canGoPrev = activeThreadId
    ? currentChatPage > 1
    : currentChapterIndex > 0;

  const canGoNext = activeThreadId
    ? currentChatPage < totalPagesForActiveThread
    : currentChapterIndex < validPages.length - 1;

  const handleNextPage = useCallback(() => {
    if (activeThreadId) {
      if (currentChatPage < totalPagesForActiveThread) {
        audioService.playPaperShuffle();
        setCurrentChatPage((prev) => Math.min(totalPagesForActiveThread, prev + 1));
      }
    } else if (currentChapterIndex < validPages.length - 1) {
      handlePageFlip('next');
    }
  }, [activeThreadId, currentChatPage, totalPagesForActiveThread, currentChapterIndex, validPages]);

  const handlePrevPage = useCallback(() => {
    if (activeThreadId) {
      if (currentChatPage > 1) {
        audioService.playPaperShuffle();
        setCurrentChatPage((prev) => Math.max(1, prev - 1));
      }
    } else if (currentChapterIndex > 0) {
      handlePageFlip('prev');
    }
  }, [activeThreadId, currentChatPage, currentChapterIndex]);

  // Keyboard navigation & Esc handler for page turning in reading view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore keybindings if the user is currently typing in an input, textarea, select, or contenteditable
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable ||
          activeEl.getAttribute('role') === 'textbox');

      if (isInputFocused) {
        return;
      }

      // 2. Check if any modal or overlay is open
      const isModalOrOverlayOpen =
        isCreateModalOpen ||
        isJoinModalOpen ||
        showAnalyticsModal ||
        isLeaveModalOpen ||
        isDeleteActiveBookModalOpen ||
        showSettingsOverlay ||
        showManageMembers ||
        !!memberToRemove ||
        !!nicknameEditingMember;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSettingsOverlay) setShowSettingsOverlay(false);
        else if (showManageMembers) setShowManageMembers(false);
        else if (showAnalyticsModal) setShowAnalyticsModal(false);
        else if (isLeaveModalOpen) setIsLeaveModalOpen(false);
        else if (isDeleteActiveBookModalOpen) setIsDeleteActiveBookModalOpen(false);
        else if (isCreateModalOpen) setIsCreateModalOpen(false);
        else if (isJoinModalOpen) setIsJoinModalOpen(false);
        else handleBackToShelfAnimate();
        return;
      }

      // If a modal/overlay is open, ignore arrow page turning
      if (isModalOrOverlayOpen) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handlePageFlipTo(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCreateModalOpen,
    isJoinModalOpen,
    showAnalyticsModal,
    isLeaveModalOpen,
    isDeleteActiveBookModalOpen,
    showSettingsOverlay,
    showManageMembers,
    memberToRemove,
    nicknameEditingMember,
    handleNextPage,
    handlePrevPage,
    handlePageFlipTo,
    handleBackToShelfAnimate,
  ]);

  // Sync mobile layout state on screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobilePage('left');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRibbonClose = () => {
    if (isReduced) {
      audioService.stopAmbience();
      onBackToShelf();
    } else {
      handleBackToShelfAnimate();
    }
  };

  if (!activeBook) {
    return (
      <div className="min-h-screen bg-paper-bg flex flex-col items-center justify-center p-6 text-center text-paper-surface">
        <BookOpen className="w-16 h-16 mb-4 text-accent-gold animate-pulse" />
        <h2 className="text-2xl font-serif font-bold">No Book Selected</h2>
        <p className="text-sm font-serif italic mt-2 opacity-60">Return to the circulating archives to open a volume.</p>
        <button 
          onClick={onBackToShelf}
          className="mt-6 px-6 py-2 rounded bg-ink-primary text-paper-surface border border-paper-border/20 hover:border-accent-gold transition-all text-xs tracking-wider uppercase font-serif"
        >
          Return to Shelf
        </button>
      </div>
    );
  }

  // Filter messages for find search tab across all paginated pages
  const allMessages = Object.values(messagesCache).flat();
  const filteredMatches = allMessages.filter(m => 
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="openbook-stage" className="min-h-screen bg-paper-bg p-2 md:p-6 lg:p-10 flex flex-col justify-between select-none relative font-sans text-ink-primary overflow-x-hidden">
      
      {/* 1. UNIVERSAL TOOLBAR */}
      <div className="max-w-7xl mx-auto w-full mb-4 flex flex-wrap items-center justify-between gap-4 bg-black/30 backdrop-blur-md p-3 rounded-lg border border-amber-500/20 shadow-md relative z-20 animate-fade-in">
        
        <button
          ref={backBtnRef}
          onClick={handleBackToShelfAnimate}
          className="px-4 py-1.5 rounded bg-[#9e1b32] text-[#fbf9f4] font-semibold text-xs tracking-wider uppercase shadow-md hover:bg-[#b2223a] transition-all border border-[#fbf9f4]/20 flex items-center gap-1 focus:ring-2 focus:ring-accent-gold focus:outline-none"
          title="Return to the Library Shelf (Esc)"
        >
          <Undo2 className="w-3.5 h-3.5 text-accent-gold" />
          Circulating Shelf
        </button>

        {/* Center Plaque details */}
        <div className="hidden md:flex items-center gap-2 text-[#f1e6cf]">
          <BookOpen className="w-4 h-4 text-accent-gold" />
          <span className="text-xs font-serif italic text-[#f1e6cf]">
            Reading: <span className="font-bold text-accent-gold not-italic">{activeBook.title}</span>
            {activeThreadId && (
              <> &bull; Page {currentChatPage}</>
            )}
          </span>
        </div>

        {/* Ambient Tools */}
        <div className="flex items-center gap-4 text-[#f1e6cf]">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#f1e6cf]/80 text-[10px] uppercase font-bold tracking-wider mr-1">Leather Theme:</span>
            <select
              value={theme}
              onChange={async (e) => {
                const val = e.target.value as any;
                setTheme(val);
                audioService.playRibbonSlide();
                            const dbName = 
                  val === 'classic-library' ? 'Classic Library' :
                  val === 'vintage-journal' ? 'Vintage Journal' :
                  val === 'night-reading' ? 'Night Reading' :
                  val === 'rainy-evening' ? 'Rainy Evening' :
                  val === 'fireplace' ? 'Fireplace' :
                  val === 'collector-edition' ? 'Collector Edition' :
                  val === 'lined-journal' ? 'Lined Journal' : 'Classic Library';

                try {
                  await apiClient('/api/settings/theme', {
                    method: 'PUT',
                    body: JSON.stringify({ themeName: dbName })
                  });
                } catch (err) {
                  console.warn('Could not sync theme selection in dropdown:', err);
                }
              }}
              className="bg-black/40 text-[#fbf9f4] border border-amber-500/30 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-accent-gold cursor-pointer shadow-sm font-sans"
            >
              <option className="bg-[#2e1d13] text-[#fdfaf2]" value="classic-library">Classic Library</option>
              <option className="bg-[#46382e] text-[#f1e6cf]" value="vintage-journal">Vintage Journal</option>
              <option className="bg-[#0c0d0e] text-[#e6dfd3]" value="night-reading">Night Reading</option>
              <option className="bg-[#1a202c] text-[#e2e8f0]" value="rainy-evening">Rainy Evening</option>
              <option className="bg-[#160a04] text-[#fbe9db]" value="fireplace">Fireplace</option>
              <option className="bg-[#0f2e1e] text-[#fffff4]" value="collector-edition">Collector Edition</option>
              <option className="bg-[#3a2212] text-[#faf6ee]" value="lined-journal">Lined Journal</option>
            </select>
          </div>

          <AudioControls />
        </div>
      </div>

      {/* 2. DOUBLE-SPREAD OPEN BOOK FRAME */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex items-center justify-center relative my-2 z-10">
        


        {/* PHYSICAL LEATHER COVER BACKING FRAME */}
        <div 
          ref={bookSpreadRef} 
          className="w-full bg-[#1b1008] rounded-[24px] p-2 md:p-3 shadow-book relative flex border-2 border-[#dfd5af]/20 overflow-visible"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Subtle leather fold grain */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_100%)] pointer-events-none" />
          
          {/* Inner embossed gold lining board border */}
          <div className="absolute inset-2 border border-[#d4af37]/20 rounded-[18px] pointer-events-none" />

          {/* OPEN-BOOK STACKED LEAVES FRAME */}
          <div className="w-full bg-paper-surface rounded-2xl relative overflow-hidden flex flex-col md:flex-row shadow-depth border-b-[6px] border-r-[6px] border-l-[3px] border-t-[1px] border-[#dcd1ba]">

            {/* Stacked leaves edge lines bottom/right margins */}
            <div className="absolute bottom-0 inset-x-0 h-[6px] bg-gradient-to-t from-[#cfc3ab] to-[#f4ebe1] border-t border-[#dfd5af]/40 pointer-events-none" />
            <div className="absolute right-0 inset-y-0 w-[6px] bg-gradient-to-l from-[#cfc3ab] to-[#f4ebe1] border-l border-[#dfd5af]/40 pointer-events-none" />
            <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-r from-[#cfc3ab] to-[#f4ebe1] border-r border-[#dfd5af]/40 pointer-events-none" />

            {/* ==================== LEFT PAGE CONTAINER ==================== */}
            <div 
              className={`flex-1 min-h-[500px] md:min-h-[600px] p-4 md:p-8 flex flex-col justify-between relative overflow-hidden bg-paper-surface rounded-l-2xl left-page-container ${
                mobilePage === 'left' ? 'flex' : 'hidden md:flex'
              }`}
            >
              {/* Inner Page fold shadow */}
              <div className="absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-black/[0.02] to-black/[0.12] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.01)_0%,transparent_100%)] pointer-events-none" />

              {/* RENDER CABINET SETTINGS OVERLAY, MANAGE MEMBERS OVERLAY OR THE MAIN SIDEBAR */}
              {showSettingsOverlay ? (
                /* Elegant settings overlay on left page with double border parchment look */
                <div className="flex-1 flex flex-col h-full relative z-30 animate-fade-in text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-paper-border/50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsOverlay(false);
                        audioService.playPaperShuffle();
                      }}
                      className="text-[10px] uppercase font-bold text-ink-muted hover:text-accent-red flex items-center gap-1 cursor-pointer focus:outline-none"
                    >
                      &larr; Back to Scribes
                    </button>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-accent-gold">
                      Cabinet Settings
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 my-3">
                    <SettingsForm />
                  </div>
                </div>
              ) : showManageMembers ? (
                /* Manage members overlay styled as a ledger/index-card list per Volume 3's component language */
                <div className="flex-1 flex flex-col h-full relative z-30 animate-fade-in text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-paper-border/50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManageMembers(false);
                        audioService.playPaperShuffle();
                      }}
                      className="text-[10px] uppercase font-bold text-ink-muted hover:text-accent-red flex items-center gap-1 cursor-pointer focus:outline-none"
                    >
                      &larr; Back to Scribes
                    </button>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-accent-gold">
                      Ledger Permissions
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 my-3 space-y-4">
                    <div className="bg-paper-surface-dim/50 border border-double border-paper-border p-3 rounded">
                      <p className="text-[11px] font-serif italic text-ink-secondary leading-relaxed">
                        As the Volume Archon, you hold the quill of visibility. Dictate exactly which other scribes each member is permitted to behold and converse with in this chronicle.
                      </p>
                    </div>

                    {readersList.filter(m => m.userId !== activeBook?.creatorId).length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-paper-border rounded">
                        <p className="text-xs font-serif italic text-ink-muted">
                          No other scribes have joined this ledger yet. Share your volume code to invite them.
                        </p>
                      </div>
                    ) : (
                      readersList
                        .filter(m => m.userId !== activeBook?.creatorId)
                        .map(member => {
                          const otherScribes = readersList.filter(
                            u => u.userId !== member.userId && u.userId !== activeBook?.creatorId
                          );

                          const isFocused = member.userId === highlightedPermissionsMemberId;

                          return (
                            <div 
                              key={member.userId} 
                              className={`bg-paper-surface border rounded-lg p-3.5 shadow-sm hover:shadow transition-all relative overflow-hidden ${
                                isFocused 
                                  ? 'border-accent-gold ring-2 ring-accent-gold/40 bg-paper-surface-dim scale-[1.01]' 
                                  : 'border-paper-border/80'
                              }`}
                            >
                              <div className="absolute right-2 top-2 text-[24px] text-accent-gold/10 pointer-events-none select-none font-serif">
                                𓍯
                              </div>

                              <div className="flex items-center gap-2 border-b border-dashed border-[#8f2d1b]/20 pb-1.5 mb-2.5">
                                <div className="w-5 h-5 rounded-full bg-[#1b4d22]/10 border border-[#1b4d22]/20 text-[#1b4d22] flex items-center justify-center font-serif text-[10px] font-black shrink-0">
                                  {member.name[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-xs font-bold font-serif text-ink-primary leading-none">
                                      {member.name}
                                    </h4>
                                    {isFocused && (
                                      <span className="text-[8px] uppercase tracking-wider font-bold text-accent-gold animate-pulse">
                                        ✦ Focused
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-ink-muted italic leading-none mt-1">
                                    {member.role || 'Scribe Partner'} &bull; Joined Member
                                  </p>
                                </div>
                              </div>

                              <p className="text-[10px] uppercase tracking-wider font-bold text-[#8f2d1b] font-serif mb-1.5">
                                Can See & Chat With:
                              </p>

                              {otherScribes.length === 0 ? (
                                <p className="text-[10px] text-ink-muted italic font-serif py-1 pl-1">
                                  No other eligible scribes present to grant visibility to.
                                </p>
                              ) : (
                                <div className="space-y-1.5 bg-paper-surface-dim/40 rounded p-2 border border-paper-border/30">
                                  {otherScribes.map(scribe => {
                                    const isGranted = visibilityGrants.some(
                                      g => g.viewerId === member.userId && g.visibleUserId === scribe.userId
                                    );

                                    return (
                                      <label 
                                        key={scribe.userId} 
                                        className="flex items-center justify-between gap-2 p-1 rounded hover:bg-paper-surface-dim/80 transition-all cursor-pointer select-none group"
                                      >
                                        <span className="text-[11px] font-serif text-ink-secondary group-hover:text-ink-primary transition-colors">
                                          {scribe.name}
                                        </span>
                                        <input 
                                          type="checkbox"
                                          checked={isGranted}
                                          onChange={() => handleToggleGrant(member.userId, scribe.userId)}
                                          className="w-3.5 h-3.5 rounded border-paper-border text-accent-gold focus:ring-accent-gold accent-accent-gold cursor-pointer"
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              ) : (
                /* Main Sidebar Rebuilt Structure (Top to Bottom) */
                <div className="flex-1 flex flex-col justify-between h-full relative z-10 text-left">
                  
                  <div className="flex-1 flex flex-col">
                    {/* 1. Header: Bullet/dot status indicator + book's shelf/room title + italic subtitle AND Close Book button on right */}
                    <div className="flex justify-between items-start select-none">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          {/* Bullet status indicator representing active/connected status */}
                          {connectionStatus === 'reconnecting' ? (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" title="Reconnecting..." />
                          ) : connectionStatus === 'back_online' ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Back online" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse shrink-0" title="Online" />
                          )}
                          <h2 className="text-sm font-playfair font-black tracking-tight text-ink-primary">
                            {activeBook?.title || 'BookChat Shelf'}
                          </h2>
                          {connectionStatus === 'reconnecting' && (
                            <span className="text-[9px] font-serif italic text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300/60 animate-pulse">
                              Reconnecting...
                            </span>
                          )}
                          {connectionStatus === 'back_online' && (
                            <span className="text-[9px] font-serif italic text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-300/60 animate-fade-in">
                              Back online
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-serif italic text-ink-muted mt-0.5">
                          Created by {
                            activeBook?.creator?.profile?.displayName || 
                            activeBook?.creator?.username || 
                            activeBook?.creator?.email || 
                            (activeBook?.creatorId && activeBook.creatorId === user?.id ? (user?.name || user?.username || user?.email) : null) ||
                            'System Archivist'
                          }
                        </p>
                      </div>

                      {/* Close / Dissolve Book buttons */}
                      <div className="flex flex-col sm:flex-row gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            audioService.playPaperShuffle();
                            setIsLeaveModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider text-ink-muted hover:text-[#9e1b32] hover:bg-black/5 border border-transparent hover:border-[#9e1b32]/10 transition-all cursor-pointer focus:outline-none font-serif"
                          title="Close the book to remove it from your shelf"
                        >
                          📖 Close Book
                        </button>

                        {user?.id && activeBook?.creatorId === user?.id && (
                          <button
                            type="button"
                            onClick={() => {
                              audioService.playPaperShuffle();
                              setIsDeleteActiveBookModalOpen(true);
                              setConfirmActiveBookTitle('');
                              setActiveBookDeleteError(null);
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-600/10 transition-all cursor-pointer focus:outline-none font-serif"
                            title="Permanently dissolve and delete this book for everyone"
                          >
                            🗑 Dissolve Volume
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. Search input: dashed-underline paper search field */}
                    <div className="relative mt-3 select-none">
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => {
                          setMemberSearchQuery(e.target.value);
                          if (Math.random() > 0.4) {
                            audioService.playPenScratch(0.04, 1300);
                          }
                        }}
                        placeholder="search archives..."
                        className="w-full bg-transparent border-b border-dashed border-paper-border/80 focus:border-accent-gold focus:outline-none py-1.5 text-xs font-serif italic text-ink-primary placeholder:text-ink-muted/50 placeholder:italic transition-colors"
                        aria-label="Search archives"
                      />
                    </div>

                    {/* 3. Actions: "+ Create" and "+ Join" stacked side-by-side */}
                    <div className="mt-4 flex flex-col gap-2 select-none">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateModalOpen(true);
                          }}
                          className="py-2 px-2 rounded bg-[#1b4d22] hover:bg-[#22632b] text-[#fbf9f4] focus:outline-none focus:ring-1 focus:ring-accent-gold transition-all font-serif font-bold text-[10px] uppercase tracking-wider text-center flex items-center justify-center gap-1 shadow-sm border border-[#1b4d22]/20 cursor-pointer"
                        >
                          + Create
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsJoinModalOpen(true);
                          }}
                          className="py-2 px-2 rounded bg-[#5c3e16] hover:bg-[#6e4a1a] text-[#fbf9f4] focus:outline-none focus:ring-1 focus:ring-accent-gold transition-all font-serif font-bold text-[10px] uppercase tracking-wider text-center flex items-center justify-center gap-1 shadow-sm border border-[#5c3e16]/20 cursor-pointer"
                        >
                          + Join
                        </button>
                      </div>
                    </div>

                    {/* 4. Section Label: "CONVERSATIONS" in small caps, muted color */}
                    <div className="mt-6 mb-2.5 select-none">
                      <span className="text-[9px] uppercase tracking-widest font-bold text-ink-muted/80 font-serif">
                        Conversations
                      </span>
                    </div>

                    {/* 5. Member/Room List: populated from ConversationParticipant (Volume 12) filtered to the active conversation/book */}
                    {/* This list is populated from the ConversationParticipant model (Volume 12) filtered to the active conversation/book */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[250px] space-y-1.5 pr-0.5">
                      {readersList.filter(m => 
                        m.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
                      ).length > 0 ? (
                        readersList
                          .filter(m => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                          .map((member) => {
                            const isSelected = selectedMemberId === (member.userId || member.name) || (!selectedMemberId && readersList[0] === member);
                            const initials = member.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase();

                            const avatarBg = isSelected 
                              ? 'bg-[#9e1b32] text-white border-[#9e1b32]' 
                              : 'bg-paper-surface-dim border-paper-border text-ink-primary';

                            return (
                              <div
                                key={member.userId || member.name}
                                onClick={() => {
                                  setSelectedMemberId(member.userId || member.name);
                                  audioService.playPaperShuffle();
                                  handleStartDirectChat(member);
                                }}
                                className={`w-full text-left p-2.5 rounded transition-all flex items-center gap-3 relative focus:outline-none focus:ring-1 focus:ring-accent-gold cursor-pointer ${
                                  isSelected 
                                    ? 'bg-paper-surface-dim border-l-4 border-[#9e1b32] shadow-sm' 
                                    : 'hover:bg-paper-surface-dim/40 border-l-4 border-transparent'
                                }`}
                              >
                                {/* Circular Avatar (initials) with online/offline ink-dot */}
                                <div className="relative shrink-0">
                                  <div className={`w-8 h-8 rounded-full border border-double flex items-center justify-center font-serif text-xs font-bold shadow-sm ${avatarBg}`}>
                                    {initials}
                                  </div>
                                  <div 
                                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-paper-surface ${
                                      member.online 
                                        ? 'bg-emerald-600' 
                                        : 'bg-stone-300/60 border border-stone-400'
                                    }`} 
                                    title={member.online ? 'Online' : 'Offline'}
                                  />
                                </div>

                                {/* Member details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs font-bold font-serif leading-tight truncate ${isSelected ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'}`}>
                                      {member.name}
                                    </p>
                                    {member.unreadCount > 0 && (
                                      <div className="bg-accent-gold text-[#2c1a04] w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-serif font-bold shadow-sticky border border-[#dfd5af] shrink-0">
                                        {member.unreadCount > 99 ? '99+' : member.unreadCount}
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-ink-muted italic leading-tight mt-0.5 truncate">
                                    {member.role || 'Scribe Partner'} &bull; {member.online ? 'Online' : getRelativeLastSeen(member.lastSeen)}
                                  </p>
                                </div>

                                {/* Kebab Menu Trigger & Popover Actions */}
                                <div className="relative shrink-0 flex items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      audioService.playPaperShuffle();
                                      setActiveKebabMemberId(activeKebabMemberId === member.userId ? null : member.userId);
                                    }}
                                    className="p-1 rounded hover:bg-black/10 text-ink-muted hover:text-ink-primary transition-colors cursor-pointer focus:outline-none"
                                    title="Member actions"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {activeKebabMemberId === member.userId && (
                                    <div 
                                      className="absolute right-0 top-6 z-[100] w-40 bg-paper-surface border border-paper-border rounded shadow-depth-heavy py-1 text-left animate-fade-in text-xs font-serif"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveKebabMemberId(null);
                                          setNicknameEditingMember(member);
                                          setNewNickname(member.name);
                                          audioService.playPaperShuffle();
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-black/5 text-ink-primary flex items-center gap-1.5 cursor-pointer focus:outline-none font-serif"
                                      >
                                        ✍ Edit nickname
                                      </button>

                                      {member.userId !== user?.id && !(user?.id !== activeBook?.creatorId && member.userId === activeBook?.creatorId) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveKebabMemberId(null);
                                            setMemberToRemove(member);
                                            audioService.playPaperShuffle();
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-accent-red flex items-center gap-1.5 cursor-pointer focus:outline-none font-serif font-bold"
                                        >
                                          ✕ Remove from book
                                        </button>
                                      )}

                                      {user?.id === activeBook?.creatorId && member.userId !== activeBook?.creatorId && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveKebabMemberId(null);
                                            setHighlightedPermissionsMemberId(member.userId);
                                            setShowManageMembers(true);
                                            audioService.playPaperShuffle();
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-black/5 text-[#1b4d22] flex items-center gap-1.5 cursor-pointer focus:outline-none font-serif"
                                        >
                                          🛡 Permissions
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Status bullet */}
                                {member.online && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />
                                )}
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-[10px] text-ink-muted italic font-serif text-center py-6 select-none">
                          No matching scribes found in this book spread.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 6. Footer pinned to the bottom: current user's avatar, name, small role, and "settings" link */}
                  <div className="pt-4 border-t border-paper-border flex items-center justify-between select-none mt-4">
                    <div className="flex items-center gap-2.5">
                      {/* Current user avatar */}
                      <div className="w-8 h-8 rounded-full border border-dashed border-accent-gold bg-[#fefcf2] text-[#8f2d1b] flex items-center justify-center font-serif text-xs font-black shadow-sm shrink-0">
                        {(() => {
                          const currentNameForAvatar = profile?.displayName || user?.name || user?.username || user?.email || 'S';
                          const selectedEmblemId = profile?.avatarUrl;
                          const emblemIcons: Record<string, React.ComponentType<{ className?: string }>> = {
                            key: KeyIcon,
                            compass: Compass,
                            flame: FlameIcon,
                            book: BookOpen,
                            pen: PenIcon,
                            hourglass: HourglassIcon,
                          };
                          const EmblemIcon = selectedEmblemId ? emblemIcons[selectedEmblemId] : null;

                          if (EmblemIcon) {
                            return <EmblemIcon className="w-4 h-4 text-[#8f2d1b]" />;
                          }

                          return currentNameForAvatar
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase();
                        })()}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold font-serif leading-tight text-ink-primary">
                          {profile?.displayName || user?.name || user?.username || user?.email || 'Scribe Keeper'}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-ink-muted font-serif">
                          {activeBook && user
                            ? (activeBook.creatorId === user.id ? 'Volume Creator' : 'Volume Member')
                            : 'Scribe Partner'} &bull; Scholar Guild
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeBook && user && activeBook.creatorId === user.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowManageMembers(true);
                            audioService.playJournalOpen();
                          }}
                          className="text-[10px] uppercase tracking-wider font-bold text-[#1b4d22] hover:text-[#22632b] hover:underline cursor-pointer focus:outline-none animate-fade-in"
                        >
                          Permissions
                        </button>
                      )}
                      {/* Settings link to open settings overlay */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsOverlay(true);
                          audioService.playJournalOpen();
                        }}
                        className="text-[10px] uppercase tracking-wider font-bold text-accent-gold hover:text-accent-red hover:underline cursor-pointer focus:outline-none"
                      >
                        Settings
                      </button>
                      
                      {/* Analytics link to open reading analytics modal */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowAnalyticsModal(true);
                          audioService.playJournalOpen();
                        }}
                        className="text-[10px] uppercase tracking-wider font-bold text-accent-gold hover:text-accent-red hover:underline cursor-pointer focus:outline-none"
                      >
                        Analytics
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* ==================== CENTER SPINE / GUTTER CREASE ==================== */}
            <div className="hidden md:flex flex-col items-center justify-center relative w-8 z-20 self-stretch pointer-events-none gutter-crease">
              <div className="absolute inset-y-0 -left-1 w-[4px] bg-gradient-to-r from-black/5 to-transparent" />
              <div className="absolute inset-y-0 -right-1 w-[4px] bg-gradient-to-l from-black/5 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/5 to-black/20" />
              <div className="w-[1.5px] h-full bg-black/45" />

              <div className="absolute inset-y-4 left-1/2 -translate-x-1/2 flex flex-col justify-between h-[95%] text-accent-gold/40 text-[9px] font-serif">
                <span>𓍯</span>
                <span>𓍯</span>
                <span>𓍯</span>
                <span>𓍯</span>
                <span>𓍯</span>
              </div>

              {/* Bookmark silk ribbon dropped into center crease */}
              <RibbonVisualizer key={activeBook.currentPage} isReduced={isReduced} onClose={handleRibbonClose} />
            </div>

            {/* ==================== RIGHT PAGE CONTAINER ==================== */}
            <div 
              className={`flex-1 min-h-[500px] md:min-h-[600px] p-4 md:p-8 flex flex-col justify-between relative overflow-hidden bg-paper-surface rounded-r-2xl right-page-container ${
                mobilePage === 'right' ? 'flex' : 'hidden md:flex'
              }`}
              style={theme === 'lined-journal' && activeBook.currentPage !== 1 ? {
                backgroundImage: 'linear-gradient(to bottom, transparent 27px, rgba(147, 197, 253, 0.15) 27px, rgba(147, 197, 253, 0.15) 28px)',
                backgroundSize: '100% 28px',
                backgroundPosition: '0 4px',
              } : undefined}
            >
              {/* Inner Page fold shadow */}
              <div className="absolute top-0 left-0 bottom-0 w-16 bg-gradient-to-l from-transparent via-black/[0.02] to-black/[0.12] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.01)_0%,transparent_100%)] pointer-events-none" />

              {/* Lined Journal Theme Overlays */}
              {theme === 'lined-journal' && activeBook.currentPage !== 1 && (
                <>
                  {/* Single vertical rule line near the right edge of the page */}
                  <div className="absolute right-12 top-0 bottom-0 w-[1px] bg-accent-red/35 pointer-events-none z-10" />
                  
                  {/* Small pinned-ribbon tab in the top-right corner */}
                  <div className="absolute top-0 right-4 w-4 h-12 bg-accent-red shadow-sm rounded-b flex flex-col items-center justify-start pt-1.5 pointer-events-none z-30">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-gold shadow-xs" />
                  </div>
                </>
              )}

              {/* RIGHT PAGE MAIN BODY */}
              {activeBook.currentPage === 1 ? (
                <ReadingQuoteLanding />
              ) : (
                // ACTIVE CHAT - RIGHT SIDE (Discussion chat log)
                <div className="flex-1 flex flex-col justify-between space-y-4 relative z-10">
                  
                  {/* Inline keyframe animations for handwriting, stamp slam physics, and chapter page flips */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes writeInk {
                      0% {
                        opacity: 0;
                        transform: translateY(12px) scale(0.97);
                        filter: blur(1.5px) contrast(1.15);
                      }
                      100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                        filter: blur(0) contrast(1);
                      }
                    }
                    .animate-write-ink {
                      animation: writeInk 0.55s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                    }

                    @keyframes chapterPageFlipEnter {
                      0% {
                        opacity: 0;
                        transform: perspective(1200px) rotateY(-10deg) translateY(12px) scale(0.975);
                        filter: blur(2px);
                      }
                      60% {
                        transform: perspective(1200px) rotateY(2.5deg) translateY(-2px) scale(1.002);
                        filter: blur(0);
                      }
                      100% {
                        opacity: 1;
                        transform: perspective(1200px) rotateY(0deg) translateY(0) scale(1);
                        filter: blur(0);
                      }
                    }
                    .animate-chapter-flip {
                      animation: chapterPageFlipEnter 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                      transform-origin: left center;
                    }

                    @keyframes pageCurlPulse {
                      0%, 100% {
                        transform: translateY(0) scale(1);
                      }
                      50% {
                        transform: translateY(-3px) scale(1.03);
                      }
                    }
                    .animate-curl-pulse {
                      animation: pageCurlPulse 1.2s ease-in-out infinite;
                    }
                    
                    @keyframes sealStamp {
                      0% {
                        transform: scale(2.2) rotate(-22deg);
                        opacity: 0;
                        filter: blur(2px);
                      }
                      35% {
                        transform: scale(0.9) rotate(8deg);
                        opacity: 0.95;
                      }
                      100% {
                        transform: scale(1) rotate(var(--stamp-rotation, 6deg));
                        opacity: 0.8;
                        filter: blur(0);
                      }
                    }
                    .animate-seal-stamp {
                      animation: sealStamp 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    }
                  `}} />
                  
                  {/* Right Page Header */}
                  {theme === 'lined-journal' ? (
                    <div className="pb-3 pt-1 flex flex-col space-y-1 relative select-none pr-8 border-b border-paper-border/60">
                      {/* Mobile Back Button */}
                      <button
                        type="button"
                        onClick={() => {
                          audioService.playPaperShuffle();
                          setMobilePage('left');
                        }}
                        className="flex md:hidden text-[10px] uppercase font-bold text-[#9e1b32] hover:text-[#801426] items-center gap-1 cursor-pointer focus:outline-none mb-1.5 font-serif self-start"
                      >
                        &larr; Back to Scribes
                      </button>

                      {(activeDirectChat || activeBook.currentPage !== 1) && (
                        <button
                          type="button"
                          onClick={() => {
                            audioService.playPaperShuffle();
                            setActiveDirectChat(null);
                            setSelectedMemberId(null);
                            handlePageFlipTo(1);
                          }}
                          className="text-[10px] uppercase font-bold text-[#9e1b32] hover:text-[#801426] flex items-center gap-1 cursor-pointer focus:outline-none mb-1.5 font-serif self-start"
                        >
                          &larr; Back to Book
                        </button>
                      )}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-serif font-bold text-ink-primary tracking-tight leading-tight">
                              {activeThread ? activeThread.title : 'Discussion Thread'}
                            </h3>
                            {connectionStatus === 'reconnecting' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-serif font-semibold bg-amber-100/90 text-amber-900 border border-amber-300/60 animate-pulse select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping shrink-0" />
                                Reconnecting...
                              </span>
                            )}
                            {connectionStatus === 'back_online' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-serif font-semibold bg-emerald-100/90 text-emerald-900 border border-emerald-300/60 animate-fade-in select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                                Back online
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-serif text-accent-red font-medium tracking-wide mt-1">
                            Started on July 15, 2026
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Active Bookmarks count (Volume 12) */}
                          <div className="flex items-center gap-1 bg-[#f5ebd6] border border-paper-border/50 rounded px-1.5 py-0.5" title="Number of active bookmarks out of 6 maximum">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9e1b32] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#9e1b32]"></span>
                            </span>
                            <span className="text-[8px] font-serif italic text-[#9e1b32] whitespace-nowrap">
                              {activeThreadId ? convoBookmarks.length : 0}/6 Active Bookmarks
                            </span>
                          </div>

                          {/* Place ribbon bookmark tab shortcut */}
                          <button 
                            onClick={toggleConvoBookmark}
                            disabled={!activeThreadId || (convoBookmarks.length >= 6 && !convoBookmarks.some(b => b.pageNumber === currentChatPage))}
                            className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all focus:ring-1 focus:ring-accent-gold focus:outline-none shrink-0
                              ${convoBookmarks.some(b => b.pageNumber === currentChatPage)
                                ? 'bg-[#9e1b32] text-white' 
                                : (convoBookmarks.length >= 6 && !convoBookmarks.some(b => b.pageNumber === currentChatPage))
                                  ? 'bg-black/5 text-ink-muted opacity-40 cursor-not-allowed'
                                  : 'bg-[#f5ebd6] hover:bg-[#ebd9bd] border border-paper-border/50 text-[#9e1b32]'
                              }`}
                            title={convoBookmarks.some(b => b.pageNumber === currentChatPage) 
                              ? "Remove Bookmark from this page" 
                              : convoBookmarks.length >= 6 
                                ? "Bookmark limit of 6 reached. Remove one first." 
                                : "Bookmark this page"}
                          >
                            <BookmarkIcon className={`w-3 h-3 ${convoBookmarks.some(b => b.pageNumber === currentChatPage) ? 'fill-current' : ''}`} />
                          </button>

                          {/* Overflow ("more") icon */}
                          <button 
                            type="button"
                            className="p-1 rounded hover:bg-black/5 text-ink-muted transition-colors cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pb-2 flex flex-col space-y-1 relative select-none">
                      {/* Mobile Back Button */}
                      <button
                        type="button"
                        onClick={() => {
                          audioService.playPaperShuffle();
                          setMobilePage('left');
                        }}
                        className="flex md:hidden text-[10px] uppercase font-bold text-[#9e1b32] hover:text-[#801426] items-center gap-1 cursor-pointer focus:outline-none mb-1.5 font-serif self-start"
                      >
                        &larr; Back to Scribes
                      </button>

                      {(activeDirectChat || activeBook.currentPage !== 1) && (
                        <button
                          type="button"
                          onClick={() => {
                            audioService.playPaperShuffle();
                            setActiveDirectChat(null);
                            setSelectedMemberId(null);
                            handlePageFlipTo(1);
                          }}
                          className="text-[10px] uppercase font-bold text-[#9e1b32] hover:text-[#801426] flex items-center gap-1 cursor-pointer focus:outline-none mb-1.5 font-serif self-start"
                        >
                          &larr; Back to Book
                        </button>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          {/* Book Title & Chapter */}
                          <span className="text-[8px] uppercase font-bold tracking-wider text-ink-light font-serif">
                            {activeBook.title}
                          </span>
                          {activeThread && !activeDirectChat && (
                            <span className="text-[10px] text-accent-red font-serif font-bold italic mt-0.5">
                              Chapter {chatThreads.find(c => c.threads.some(t => t.id === activeThread.id))?.number}: {chatThreads.find(c => c.threads.some(t => t.id === activeThread.id))?.title}
                            </span>
                          )}
                        </div>

                        {/* Active Bookmarks count (Volume 12) */}
                        <div className="flex items-center gap-1 bg-paper-surface-dim/40 border border-paper-border/30 rounded px-1.5 py-0.5" title="Number of active bookmarks out of 6 maximum">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-gold"></span>
                          </span>
                          <span className="text-[8px] font-serif italic text-ink-muted whitespace-nowrap">
                            {activeThreadId ? convoBookmarks.length : 0}/6 Active Bookmarks
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <h3 className="text-sm font-playfair font-black text-ink-primary tracking-tight line-clamp-1">
                          {activeThread ? activeThread.title : 'Discussion Thread'}
                        </h3>

                        {/* Place ribbon bookmark tab shortcut */}
                        <button 
                          onClick={toggleConvoBookmark}
                          disabled={!activeThreadId || (convoBookmarks.length >= 6 && !convoBookmarks.some(b => b.pageNumber === currentChatPage))}
                          className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all focus:ring-1 focus:ring-accent-gold focus:outline-none shrink-0
                            ${convoBookmarks.some(b => b.pageNumber === currentChatPage)
                              ? 'bg-[#9e1b32] text-white' 
                              : (convoBookmarks.length >= 6 && !convoBookmarks.some(b => b.pageNumber === currentChatPage))
                                ? 'bg-black/5 text-ink-muted opacity-40 cursor-not-allowed'
                                : 'bg-accent-gold/15 hover:bg-accent-gold/30 border border-paper-border/40 text-accent-gold'
                            }`}
                          title={convoBookmarks.some(b => b.pageNumber === currentChatPage)
                            ? "Remove Bookmark from this page" 
                            : convoBookmarks.length >= 6 
                              ? "Bookmark limit of 6 reached. Remove one first." 
                              : "Bookmark this page"}
                        >
                          <BookmarkIcon className={`w-3 h-3 ${convoBookmarks.some(b => b.pageNumber === currentChatPage) ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Decorative Divider Header (Skeuomorphic vintage engraving style) */}
                      <div className="w-full py-1.5 flex items-center justify-center relative">
                        <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-paper-border/80 to-transparent" />
                        <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-paper-border/80 to-transparent translate-y-[2px]" />
                        <div className="bg-paper-surface px-3.5 z-10 text-[9px] font-serif text-[#9e1b32] flex items-center gap-1 tracking-widest font-bold">
                          ⚜ ❦ <span className="uppercase text-[8px]">Inscribed ledger folio</span> ❦ ⚜
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Paginated Page Controls (Applies to all themes) */}
                  {activeThread && (totalPagesMap[activeThreadId || ''] || 1) > 1 && (
                    <div id="folio-pagination-controls" className="flex items-center justify-between px-3 py-1.5 mt-1 mb-2 border border-paper-border/30 rounded bg-paper-surface-dim/40 select-none text-[11px] font-serif">
                      <button
                        id="folio-prev-page-btn"
                        type="button"
                        disabled={currentChatPage <= 1}
                        onClick={() => {
                          audioService.playPaperShuffle();
                          setCurrentChatPage(prev => Math.max(1, prev - 1));
                        }}
                        className="px-2 py-0.5 text-[#9e1b32] disabled:text-ink-muted hover:bg-black/5 rounded font-bold cursor-pointer transition-colors focus:outline-none"
                      >
                        &larr; Prev Page
                      </button>
                      <div className="flex items-center gap-1.5 text-ink-secondary">
                        <span>Folio Page</span>
                        <select
                          id="folio-page-select"
                          value={currentChatPage}
                          onChange={(e) => {
                            audioService.playPaperShuffle();
                            setCurrentChatPage(Number(e.target.value));
                          }}
                          className="mx-1 px-1.5 py-0.5 rounded border border-paper-border/60 bg-paper-surface font-sans text-[11px] text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent-gold"
                        >
                          {Array.from({ length: totalPagesMap[activeThreadId || ''] || 1 }, (_, i) => i + 1).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <span>of {totalPagesMap[activeThreadId || ''] || 1}</span>
                      </div>
                      <button
                        id="folio-next-page-btn"
                        type="button"
                        disabled={currentChatPage >= (totalPagesMap[activeThreadId || ''] || 1)}
                        onClick={() => {
                          audioService.playPaperShuffle();
                          setCurrentChatPage(prev => Math.min(totalPagesMap[activeThreadId || ''] || 1, prev + 1));
                        }}
                        className="px-2 py-0.5 text-[#9e1b32] disabled:text-ink-muted hover:bg-black/5 rounded font-bold cursor-pointer transition-colors focus:outline-none"
                      >
                        Next Page &rarr;
                      </button>
                    </div>
                  )}

                  {/* Lined paper conversation ruling area */}
                  <div 
                    ref={chatScrollRef}
                    onScroll={handleChatScroll}
                    key={`${activeBook?.currentPage}-${currentChatPage}`}
                    className="flex-1 py-1 overflow-y-auto max-h-[290px] scrollbar-thin pr-1 relative flex flex-col gap-1 w-full animate-chapter-flip"
                    style={theme === 'lined-journal' ? {
                      backgroundImage: 'linear-gradient(to bottom, transparent 27px, rgba(147, 197, 253, 0.15) 27px, rgba(147, 197, 253, 0.15) 28px)',
                      backgroundSize: '100% 28px',
                      backgroundPosition: '0 4px',
                    } : undefined}
                  >
                    {connectionStatus === 'reconnecting' && (
                      <div className="mx-auto w-full mb-2 py-1 px-2.5 bg-amber-50/95 border border-amber-200/90 rounded text-[11px] font-serif text-amber-900 flex items-center justify-between shadow-2xs animate-pulse select-none shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                          <span>Reconnecting... Syncing missed messages</span>
                        </div>
                        <span className="text-[10px] italic text-amber-700 font-sans">Syncing</span>
                      </div>
                    )}
                    {connectionStatus === 'back_online' && (
                      <div className="mx-auto w-full mb-2 py-1 px-2.5 bg-emerald-50/95 border border-emerald-200/90 rounded text-[11px] font-serif text-emerald-900 flex items-center justify-between shadow-2xs animate-fade-in select-none shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Back online — Messages updated</span>
                        </div>
                        <span className="text-[10px] italic text-emerald-700 font-sans">Synced</span>
                      </div>
                    )}
                    {activeThread && activeThread.messages.length > 0 ? (
                      (() => {
                        let lastAuthor = '';
                        const currentUser = user;
                        return activeThread.messages.map((m, mIdx) => {
                          const isOwnMessage = m.senderId ? m.senderId === currentUser?.id : m.isCurrentUser;
                          const isSelf = isOwnMessage;
                          const isGroupStart = m.author !== lastAuthor;
                          lastAuthor = m.author;

                          const authorMember = readersList.find(r => r.userId === m.senderId);
                          const resolvedAuthor = authorMember ? authorMember.name : m.author;

                          const replyMsg = activeThread?.messages?.find(msg => msg.id === m.replyToId);
                          const replySenderId = replyMsg?.senderId;
                          const replyMember = replySenderId ? readersList.find(r => r.userId === replySenderId) : undefined;
                          const resolvedReplyToAuthor = replyMember ? replyMember.name : m.replyToAuthor;

                          if (theme === 'lined-journal') {
                            return (
                              <div 
                                id={`msg-el-${m.id}`}
                                key={m.id} 
                                className={`w-full flex flex-col animate-write-ink mb-6 ${
                                  isSelf ? 'items-end text-right' : 'items-start text-left'
                                }`}
                                style={{ contentVisibility: 'auto' }}
                              >
                                {/* Header / metadata line */}
                                {isSelf ? (
                                  <div className="flex items-center gap-1.5 text-[10px] font-sans font-semibold tracking-wider text-ink-muted/80 mb-1 select-none">
                                    <span>{m.timestamp}</span>
                                    <span className="text-[9px] text-accent-red font-bold uppercase">YOU</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-[10px] mb-1 select-none">
                                    <span 
                                      className="font-bold text-ink-primary font-serif uppercase tracking-tight text-[11px]"
                                      style={{ fontVariant: 'small-caps' }}
                                    >
                                      {resolvedAuthor}
                                    </span>
                                    <span className="text-ink-muted/70 text-[9px]">{m.timestamp}</span>
                                  </div>
                                )}

                                {/* REPLY QUOTATION BLOCK FOR LINED JOURNAL */}
                                {m.replyToId && (
                                  <div 
                                    onClick={() => scrollToMessage(m.replyToId!)}
                                    className="mb-1 bg-[#93c5fd]/5 border-l-2 border-accent-red/30 pl-2 py-0.5 text-[11px] leading-[18px] rounded-r-md cursor-pointer hover:bg-[#93c5fd]/10 transition-colors select-none text-left max-w-[85%]"
                                    title="Jump to original message"
                                  >
                                    <span className="text-[9px] uppercase font-bold text-accent-red/70 block font-serif leading-none mt-0.5">
                                      ↳ Threading Scribe {resolvedReplyToAuthor || m.replyToAuthor}
                                    </span>
                                    <p className="italic text-ink-muted line-clamp-1 font-serif text-[10px] flex items-center gap-1">
                                      {m.replyToAttachments && m.replyToAttachments.length > 0 && (
                                        <span className="text-accent-red font-bold">📎 [Clip]</span>
                                      )}
                                      <span>"{m.replyToText || 'Folio Clip Attachment'}"</span>
                                    </p>
                                  </div>
                                )}

                                {/* Message text sitting on the ruled lines */}
                                {m.text && (
                                  <div 
                                    className={`max-w-[85%] font-serif text-[13.5px] leading-[28px] tracking-wide relative group ${
                                      isSelf 
                                        ? 'text-ink-primary italic font-medium pr-1 pl-4 font-serif' 
                                        : 'text-ink-secondary pl-1 pr-4 font-serif'
                                    }`}
                                    style={{
                                      fontFamily: 'var(--font-family-serif)',
                                      color: INK_COLORS[m.inkColor || 'blue']?.hex || '#1e40af',
                                      textShadow: isSelf ? '0.2px 0 0 rgba(0,0,0,0.1)' : undefined
                                    }}
                                  >
                                    {m.text}

                                    {/* Quick hover reply button for lined journal style */}
                                    <div className="absolute top-0 right-0 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-200 flex gap-1 z-10 bg-paper-surface/95 px-1 py-0.5 rounded shadow-sm border border-paper-border/40 select-none text-[9px] leading-none">
                                      <button
                                        type="button"
                                        onClick={() => setReplyToMessage(m)}
                                        className="text-accent-red font-bold hover:underline"
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* ATTACHMENTS FOR LINED JOURNAL */}
                                {m.attachments && m.attachments.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-2 max-w-[85%]">
                                    {m.attachments.map((att, idx) => {
                                      const isImg = isImageFileType(att.fileType, att.fileUrl);
                                      if (isImg) {
                                        return (
                                          <div 
                                            key={att.id || idx}
                                            onClick={() => setLightboxImage({ url: att.fileUrl, title: att.fileName })}
                                            className="relative group/img rounded border border-paper-border/60 overflow-hidden cursor-pointer shadow-xs hover:shadow-md transition-shadow max-w-[240px]"
                                          >
                                            <img 
                                              src={att.fileUrl} 
                                              alt={att.fileName || 'Attachment'} 
                                              loading="lazy"
                                              className="max-h-[180px] w-auto object-cover rounded"
                                            />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-serif font-bold">
                                              🔍 Expand Folio
                                            </div>
                                          </div>
                                        );
                                      }
                                      return (
                                        <a
                                          key={att.id || idx}
                                          href={att.fileUrl}
                                          download={att.fileName || 'attachment'}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-paper-border/60 bg-paper-surface/80 hover:bg-paper-surface text-ink-primary text-[11px] font-serif transition-colors shadow-xs group/file"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-[#9e1b32] shrink-0" />
                                          <div className="flex flex-col min-w-0">
                                            <span className="font-bold truncate max-w-[130px] text-[10.5px]">
                                              {att.fileName || 'Folio Attachment'}
                                            </span>
                                            <span className="text-[9px] text-ink-muted">
                                              {formatFileSize(att.fileSize)}
                                            </span>
                                          </div>
                                          <span className="text-[9px] uppercase tracking-wider text-[#9e1b32] font-bold group-hover/file:underline ml-1">
                                            ⤓
                                          </span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Pinned Stamp Reactions */}
                                {m.reactions && m.reactions.length > 0 && (
                                  <div className="mt-1.5 flex gap-1 select-none pointer-events-none opacity-80 mix-blend-multiply">
                                    {m.reactions.map((r, rIdx) => {
                                      // Render a small neat text stamp
                                      const label = r === 'verified' ? '✔ HISTORIC' : r === 'studied' ? '✦ SCRIPT' : r === 'disputed' ? '✘ DISPUTED' : '⚜ ILLUMINATED';
                                      return (
                                        <span 
                                          key={rIdx} 
                                          className={`text-[8px] font-bold px-1.5 py-0.5 border border-double rounded tracking-wider ${
                                            r === 'verified' ? 'border-accent-red text-accent-red rotate-[-2deg]' : 'border-accent-blue text-accent-blue rotate-[2deg]'
                                          }`}
                                        >
                                          {label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div 
                              id={`msg-el-${m.id}`}
                              key={m.id} 
                              className={`flex flex-col max-w-[88%] w-full animate-write-ink ${
                                isSelf ? 'self-end ml-auto items-end' : 'self-start mr-auto items-start'
                              } ${isGroupStart ? 'mt-3.5' : 'mt-1'}`}
                            >
                              {isGroupStart && (
                                <div className={`flex items-center gap-1.5 mb-1 px-1 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                                  {/* Small Monogram printed seal as avatar */}
                                  <div className={`w-4 h-4 rounded-full border border-double flex items-center justify-center font-serif text-[8px] font-black shadow-sm rotate-[-3deg] select-none ${
                                    isSelf 
                                      ? 'bg-[#fef3c7] border-[#d97706] text-[#b45309]' 
                                      : resolvedAuthor.includes('Emma') 
                                      ? 'bg-[#fee2e2] border-[#dc2626] text-[#b91c1c]'
                                      : resolvedAuthor.includes('Aryan')
                                      ? 'bg-[#ecfdf5] border-[#059669] text-[#047857]'
                                      : 'bg-[#f0f9ff] border-[#0284c7] text-[#0369a1]'
                                  }`}>
                                    {resolvedAuthor.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                  </div>
                                  <span className="text-[10px] font-serif font-bold text-ink-primary select-none">
                                    {resolvedAuthor}
                                  </span>
                                </div>
                              )}

                              <div className="relative group w-full flex flex-col items-stretch max-w-[360px]">
                                <StickyNoteItem 
                                  message={m} 
                                  isSelf={isSelf} 
                                  isReduced={isReduced} 
                                  onReply={() => setReplyToMessage(m)}
                                  onDeleteEveryone={() => handleDeleteMessage(m.id)}
                                  onDeleteMe={() => handleHideMessageForMe(m.id)}
                                  resolvedReplyToAuthor={resolvedReplyToAuthor}
                                  onOpenLightbox={(url, title) => setLightboxImage({ url, title })}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      <div className="text-center py-12 text-ink-light italic font-serif text-xs">
                        No annotations recorded yet. Dip your quill to initiate discussion.
                      </div>
                    )}
                  </div>

                  {showJumpToLatest && (
                    <div className="absolute bottom-[90px] right-4 z-20 animate-bounce select-none">
                      <button
                        type="button"
                        onClick={() => {
                          audioService.playPaperShuffle();
                          const totalPages = totalPagesMap[activeThreadId || ''] || 1;
                          setCurrentChatPage(totalPages);
                          setShowJumpToLatest(false);
                          setTimeout(() => {
                            if (chatScrollRef.current) {
                              chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
                            }
                          }, 100);
                        }}
                        className="bg-accent-red hover:bg-accent-red/90 text-white font-sans text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full shadow-lg border-2 border-leather-border-gold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 focus:outline-none animate-fade-in"
                      >
                        <span>New Inscriptions ✒</span>
                        <span className="text-[12px] leading-none">&darr;</span>
                      </button>
                    </div>
                  )}

                  {/* Simulated Scribe Active Typing Indicator */}
                  {typingScribe && (
                    <div className="flex items-center gap-1.5 pl-2 text-[9px] text-ink-muted italic font-serif select-none animate-pulse">
                      <span className="relative flex h-1 w-1">
                        <span className="relative inline-flex rounded-full h-1 w-1 bg-accent-gold"></span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="inline-block animate-bounce text-[10px]">✒</span> {typingScribe} is drafting a marginal inscription...
                      </span>
                    </div>
                  )}

                  {/* Composer/Quill input */}
                  <div className="pt-2 border-t border-paper-border/80">
                    
                    {/* Replying target preview bar */}
                    {replyToMessage && (
                      <div className="bg-paper-surface-dim border border-paper-border/50 rounded px-2 py-1 flex items-center justify-between text-[11px] font-serif animate-fade-in mb-2 select-none">
                        <div className="flex items-center gap-1 text-ink-secondary">
                          <span className="text-[#9e1b32] font-black text-xs">↳</span>
                          <span className="italic">
                            Replying to <strong>{replyToMessage.author}</strong>: "{replyToMessage.text.substring(0, 32)}..."
                          </span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setReplyToMessage(null)}
                          className="text-[#9e1b32] hover:underline font-bold text-[9px] uppercase tracking-wider pl-2 shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] font-serif text-ink-muted select-none mb-1.5">
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${inkLevel > 20 ? 'bg-accent-green' : 'bg-status-error animate-pulse'}`} />
                        Inkwell Reservoir: {inkLevel}%
                      </span>
                      <button
                        ref={refillBtnRef}
                        type="button"
                        onClick={handleRefillInk}
                        className="text-accent-red hover:text-accent-red/80 font-bold hover:underline transition-all uppercase text-[9px] tracking-wider focus:ring-1 focus:ring-accent-gold focus:outline-none"
                      >
                        Refill Inkwell
                      </button>
                    </div>

                    <FountainPenComposer
                      value={inputText}
                      onChange={handleInputChange}
                      onSubmit={handleSendMessage}
                      placeholder={replyToMessage ? "Inscribe your threaded reply..." : "Dip your quill and scribble on the ledger..."}
                      inkLevel={inkLevel}
                      setInkLevel={setInkLevel}
                      soundEnabled={soundEnabled}
                      isReduced={isReduced}
                    />
                  </div>
                </div>
              )}

              {/* Right Page Bottom Footer */}
              <div className="relative z-10 pt-4 border-t border-paper-border flex justify-between text-xs font-serif italic text-ink-muted mt-4">
                {activeBook.currentPage === 1 ? (
                  <>
                    <span>Folio ii</span>
                    <span>Page 1 / 1</span>
                  </>
                ) : (
                  <>
                    <span>Folio {currentChatPage}</span>
                    <span>Page {currentChatPage} / {totalPagesMap[activeThreadId || ''] || 1}</span>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Dynamic Bookmark Tabs Sticking Out of Right Cover Edge (Volume 12) */}
          {activeThreadId && convoBookmarks.map((bm, index) => {
            const isCurrent = currentChatPage === bm.pageNumber;
            return (
              <button
                key={bm.id}
                onClick={() => {
                  audioService.playPaperShuffle();
                  setCurrentChatPage(bm.pageNumber || 1);
                  addNotification({
                    title: 'Jumped to Bookmark',
                    message: `Flipped straight to Bookmarked Page ${bm.pageNumber}.`,
                    type: 'success'
                  });
                }}
                style={{ top: `${index * 52 + 80}px` }}
                className={`absolute md:left-[100%] md:right-auto right-0 h-10 md:px-3.5 px-2 flex items-center justify-center md:rounded-r-lg rounded-l-lg border-y md:border-r border-l shadow-md transition-all duration-300 group z-10 whitespace-nowrap text-xs font-serif font-bold cursor-pointer hover:translate-x-1 md:hover:translate-x-1 hover:-translate-x-0.5 focus:outline-none focus:ring-1 focus:ring-accent-gold
                  ${isCurrent 
                    ? 'bg-accent-gold text-[#2c1a04] border-accent-gold/40 md:-translate-x-[2px] translate-x-[2px] font-black z-20 shadow-lg scale-105' 
                    : 'bg-[#faf6ee] text-ink-primary border-paper-border/80 hover:bg-[#f5ebd6]'
                  }`}
                title={`Flip to Bookmarked Page ${bm.pageNumber}`}
              >
                {/* Decorative brass/gold edge on the tab left boundary */}
                <div className={`absolute md:left-0 md:right-auto right-0 top-0 bottom-0 w-1 ${isCurrent ? 'bg-[#9e1b32]' : 'bg-accent-gold/40'}`} />
                
                <span className="flex items-center gap-1.5">
                  <BookmarkIcon className={`w-3.5 h-3.5 ${isCurrent ? 'text-[#2c1a04] fill-current' : 'text-accent-gold'}`} />
                  <span className="hidden md:inline">Folio {bm.pageNumber}</span>
                  <span className="inline md:hidden text-[10px]">{bm.pageNumber}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PAGINATION CONTROLS & RESPONSIVE TURNERS */}
      <div className="max-w-7xl mx-auto w-full mt-4 flex justify-between items-center gap-4 relative z-20">
        
        {/* Pagination bar according to total pages */}
        <div className="flex items-center gap-2.5 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-500/20 text-[#fbf9f4] shadow-md animate-fade-in">
          <button
            onClick={handlePrevPage}
            disabled={!canGoPrev}
            className="flex items-center gap-1 text-xs font-serif italic text-accent-gold hover:text-amber-200 disabled:opacity-30 disabled:hover:text-accent-gold transition-colors focus:outline-none cursor-pointer pr-1.5 border-r border-white/10"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev Page</span>
          </button>

          <span className="text-xs font-serif italic whitespace-nowrap min-w-[75px] text-center text-[#f1e6cf] px-1">
            {activeBook.currentPage !== 1 && activeThreadId ? (
              `Page ${currentChatPage} of ${totalPagesForActiveThread}`
            ) : (
              'Title & Frontispiece'
            )}
          </span>

          <button
            onClick={handleNextPage}
            disabled={!canGoNext}
            className="flex items-center gap-1 text-xs font-serif italic text-accent-gold hover:text-amber-200 disabled:opacity-30 disabled:hover:text-accent-gold transition-colors focus:outline-none cursor-pointer pl-1.5 border-l border-white/10"
            title="Next Page"
          >
            <span className="hidden sm:inline">Next Page</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile page tab selector */}
        <div className="flex md:hidden gap-2">
          <button
            onClick={() => setMobilePage('left')}
            className={`px-3 py-1.5 rounded-full text-xs font-serif font-semibold tracking-wide border transition-all ${
              mobilePage === 'left'
                ? 'bg-accent-gold text-[#2c1a04] border-accent-gold shadow'
                : 'bg-black/30 text-[#fbf9f4] border-amber-500/20 hover:bg-black/50'
            }`}
          >
            Left Side
          </button>
          <button
            onClick={() => setMobilePage('right')}
            className={`px-3 py-1.5 rounded-full text-xs font-serif font-semibold tracking-wide border transition-all ${
              mobilePage === 'right'
                ? 'bg-accent-gold text-[#2c1a04] border-accent-gold shadow'
                : 'bg-black/30 text-[#fbf9f4] border-amber-500/20 hover:bg-black/50'
            }`}
          >
            Right Side
          </button>
        </div>

        {/* Status Line */}
        <div className="hidden lg:flex items-center gap-1.5 text-[#f1e6cf]/80 text-[11px] font-serif italic">
          <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
          <span>Flicker embers indicate active readers. Dip quills to join the discussion ledger.</span>
        </div>
      </div>

      <CreateBookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <JoinBookModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={handleJoinSuccess}
      />

      <ReadingAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
      />

      {/* ✍ EDIT NICKNAME MODAL */}
      {nicknameEditingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div 
            className="w-full max-w-md bg-paper-surface border border-paper-border rounded-lg shadow-depth-heavy p-6 text-left animate-fade-in relative"
            style={{ backgroundImage: 'radial-gradient(#dfd5af 0.5px, transparent 0.5px)', backgroundSize: '16px 16px', opacity: 1 }}
          >
            {/* Elegant Skewomorphic Header */}
            <div className="border-b border-paper-border pb-3 mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-accent-gold block font-serif">
                ✦ Alter Chronicle Moniker ✦
              </span>
              <h3 className="text-sm font-serif font-bold text-ink-primary mt-1">
                Recalibrate Scribe Nickname
              </h3>
              <p className="text-[11px] font-serif text-ink-muted italic leading-tight mt-1.5">
                This nickname override is visible exclusively to you. Clear the input to restore their default display name.
              </p>
            </div>

            {/* Input field */}
            <div className="space-y-4 font-serif">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-ink-secondary mb-1">
                  Scribe Moniker
                </label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="Leave blank to restore original name..."
                  className="w-full bg-paper-surface border border-paper-border rounded px-3 py-2 text-xs text-ink-primary focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold transition-all"
                  autoFocus
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setNicknameEditingMember(null);
                    setNewNickname('');
                    audioService.playPaperShuffle();
                  }}
                  className="px-4 py-1.5 rounded border border-paper-border text-ink-muted hover:text-ink-primary text-xs hover:bg-black/5 font-serif cursor-pointer focus:outline-none transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNickname}
                  className="px-4 py-1.5 rounded bg-[#9e1b32] hover:bg-[#801426] text-[#fbf9f4] text-xs font-serif font-bold cursor-pointer focus:outline-none transition-colors shadow-sm"
                >
                  Seal Nickname
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✕ REMOVE MEMBER CONFIRMATION MODAL (Paper-Fold Style) */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div 
            className="w-full max-w-sm bg-paper-surface border-t-4 border-b-4 border-double border-[#9e1b32] shadow-depth-heavy rounded-md overflow-hidden animate-fade-in relative text-left"
            style={{
              boxShadow: '0 12px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            {/* Paper fold overlay/effects */}
            {/* Subtle horizontal fold crease lines across the middle */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-b from-black/[0.06] to-white/[0.15] border-t border-black/[0.04] pointer-events-none" />
            
            {/* Top-right folded corner visual */}
            <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#e9e1cd] border-l border-b border-paper-border/60 origin-top-left rotate-45 transform shadow-sm" />
            </div>

            <div className="p-5 md:p-6 space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[9px] uppercase tracking-widest font-black text-[#9e1b32] font-serif block">
                  ✦ Banish Scribe from Chronicle ✦
                </span>
                <div className="w-10 h-[1px] bg-gradient-to-r from-transparent via-[#9e1b32] to-transparent mx-auto my-1" />
                <h3 className="text-xs font-serif font-black text-ink-primary uppercase tracking-wide">
                  Confirm Strike Order
                </h3>
              </div>

              <div className="bg-paper-surface-dim/80 border border-dashed border-paper-border p-3.5 rounded text-center">
                <p className="text-xs font-serif text-ink-primary leading-relaxed">
                  Are you absolutely certain you wish to strike <strong className="text-[#9e1b32]">{memberToRemove.name}</strong> from this Volume register?
                </p>
                <p className="text-[10px] font-serif text-ink-muted italic leading-relaxed mt-2 border-t border-dashed border-paper-border/50 pt-2">
                  All active Visibility Grants they hold or are targets of will be instantly dissolved. They will no longer behold this layout.
                </p>
              </div>

              {/* Fold Crease warning notice */}
              <div className="bg-red-50/50 border border-[#9e1b32]/20 p-2.5 rounded text-center">
                <p className="text-[9px] uppercase tracking-wider font-bold text-[#9e1b32] font-serif">
                  ⚠️ Permanent Banishment
                </p>
              </div>

              {/* Action buttons styled with skeuomorphism */}
              <div className="flex items-center justify-between gap-3 pt-1 select-none font-serif">
                <button
                  type="button"
                  onClick={() => {
                    setMemberToRemove(null);
                    audioService.playPaperShuffle();
                  }}
                  className="flex-1 py-2 rounded bg-paper-surface hover:bg-paper-surface-dim border border-paper-border hover:border-ink-muted/30 text-ink-primary font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer text-center focus:outline-none"
                >
                  Retain Member
                </button>
                <button
                  type="button"
                  onClick={handleRemoveMember}
                  className="flex-1 py-2 rounded bg-[#9e1b32] hover:bg-[#801426] text-[#fbf9f4] font-black text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer text-center focus:outline-none border border-[#9e1b32]/20"
                >
                  Strike Name
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📖 CLOSE BOOK CONFIRMATION DIALOG */}
      {isLeaveModalOpen && activeBook && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div 
            className="w-full max-w-sm bg-paper-surface border-t-4 border-b-4 border-double border-[#9e1b32]/40 shadow-depth-heavy rounded-md overflow-hidden animate-fade-in relative text-left"
            style={{
              boxShadow: '0 12px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            {/* Top-right folded corner visual */}
            <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#e9e1cd] border-l border-b border-paper-border/60 origin-top-left rotate-45 transform shadow-sm" />
            </div>

            <div className="p-5 md:p-6 space-y-4 font-serif">
              <div className="text-center space-y-1">
                <span className="text-[9px] uppercase tracking-widest font-black text-[#9e1b32]/70 block">
                  ✦ Close Volume Spread ✦
                </span>
                <div className="w-10 h-[1px] bg-gradient-to-r from-transparent via-[#9e1b32]/40 to-transparent mx-auto my-1" />
                <h3 className="text-xs font-black text-ink-primary uppercase tracking-wide">
                  Relinquish Book Membership
                </h3>
              </div>

              {user?.id === activeBook.creatorId ? (
                // Block creator self-removal to prevent orphaned books
                <div className="space-y-4">
                  <div className="bg-paper-surface-dim/80 border border-dashed border-red-200 p-3.5 rounded text-center">
                    <p className="text-xs text-ink-primary leading-relaxed">
                      You are registered as the <strong className="text-[#9e1b32]">Creator</strong> of <strong className="italic">"{activeBook.title}"</strong>.
                    </p>
                    <p className="text-[10px] text-ink-muted leading-relaxed mt-2 border-t border-dashed border-paper-border/50 pt-2 font-normal">
                      To prevent this volume from becoming orphaned, you cannot remove yourself from its register. You must transfer ownership or delete the book instead.
                    </p>
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLeaveModalOpen(false);
                        audioService.playPaperShuffle();
                      }}
                      className="w-full py-2 rounded bg-paper-surface hover:bg-paper-surface-dim border border-paper-border hover:border-ink-muted/30 text-ink-primary font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer text-center focus:outline-none"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ) : (
                // Standard membership leave confirmation
                <div className="space-y-4">
                  <div className="bg-paper-surface-dim/80 border border-dashed border-paper-border p-3.5 rounded text-center">
                    <p className="text-xs text-ink-primary leading-relaxed">
                      Are you sure you wish to close <strong className="italic">"{activeBook.title}"</strong> and remove it from your personal shelf?
                    </p>
                    <p className="text-[10px] text-ink-muted italic leading-relaxed mt-2 border-t border-dashed border-paper-border/50 pt-2 font-normal">
                      This will only affect your own membership. You can rejoin later using the invitation code if needed.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-3 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLeaveModalOpen(false);
                        audioService.playPaperShuffle();
                      }}
                      className="flex-1 py-2 rounded bg-paper-surface hover:bg-paper-surface-dim border border-paper-border hover:border-ink-muted/30 text-ink-primary font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer text-center focus:outline-none"
                      disabled={isLeavingBook}
                    >
                      Retain Book
                    </button>
                    <button
                      type="button"
                      onClick={handleLeaveBook}
                      className="flex-1 py-2 rounded bg-[#9e1b32] hover:bg-[#801426] text-[#fbf9f4] font-black text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer text-center focus:outline-none border border-[#9e1b32]/20 flex items-center justify-center gap-1"
                      disabled={isLeavingBook}
                    >
                      {isLeavingBook ? 'Leaving...' : 'Close Book'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🗑 DELETE ACTIVE BOOK CONFIRMATION DIALOG */}
      {isDeleteActiveBookModalOpen && activeBook && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div 
            className="w-full max-w-sm bg-red-50/95 border-t-4 border-b-4 border-double border-red-600/40 shadow-depth-heavy rounded-md overflow-hidden animate-fade-in relative text-left"
            style={{
              boxShadow: '0 12px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            {/* Top-right folded corner visual */}
            <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 border-l border-b border-red-200 origin-top-left rotate-45 transform shadow-sm" />
            </div>

            <div className="p-5 md:p-6 space-y-4 font-serif">
              <div className="text-center space-y-1">
                <span className="text-[9px] uppercase tracking-widest font-black text-red-700 block animate-pulse">
                  ✦ DISSOLVE VOLUME ✦
                </span>
                <div className="w-10 h-[1px] bg-gradient-to-r from-transparent via-red-600/40 to-transparent mx-auto my-1" />
                <h3 className="text-xs font-black text-red-950 uppercase tracking-wide">
                  Permanent Volume Destruction
                </h3>
              </div>

              <div className="space-y-4">
                <div className="bg-white/80 border border-dashed border-red-200 p-3.5 rounded text-center text-xs leading-relaxed text-red-950">
                  <p>
                    Are you absolutely certain you want to destroy and delete <strong className="italic font-bold">"{activeBook.title}"</strong>?
                  </p>
                  <p className="text-[10px] text-red-800 font-bold mt-2 border-t border-dashed border-red-200/60 pt-2 font-normal">
                    ⚠️ This permanently erases the volume, its archives, messages, and bookmarks for <strong className="font-bold">ALL members</strong>. This action is irreversible.
                  </p>
                </div>

                <div className="bg-paper-surface border border-red-200 p-3 rounded shadow-inner text-center italic text-xs text-ink-muted">
                  <p className="mb-2 text-[10px] text-red-800 non-italic font-sans uppercase font-bold tracking-wider">
                    Verify Dissolution Signature
                  </p>
                  <p className="text-[10.5px]">
                    Type exact title <strong className="text-ink-primary font-bold not-italic font-serif">"{activeBook.title}"</strong> below:
                  </p>
                  <input
                    type="text"
                    value={confirmActiveBookTitle}
                    onChange={(e) => setConfirmActiveBookTitle(e.target.value)}
                    placeholder="Type volume title..."
                    className="w-full mt-2 bg-[#faf8f4] border border-[#d3c2a3] rounded px-3 py-1.5 text-center text-xs font-handwritten text-ink-primary placeholder-ink-muted/30 focus:outline-none focus:border-red-500/50 transition-all"
                  />
                  {activeBookDeleteError && (
                    <p className="text-[10px] text-red-700 font-sans font-bold not-italic mt-2">
                      ✦ {activeBookDeleteError}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteActiveBookModalOpen(false);
                      setConfirmActiveBookTitle('');
                      setActiveBookDeleteError(null);
                      audioService.playPaperShuffle();
                    }}
                    className="flex-1 py-2 rounded bg-paper-surface hover:bg-paper-surface-dim border border-paper-border hover:border-ink-muted/30 text-ink-primary font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer text-center focus:outline-none"
                    disabled={isDeletingActiveBook}
                  >
                    Retain Book
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteActiveBook}
                    disabled={confirmActiveBookTitle !== activeBook.title || isDeletingActiveBook}
                    className={`flex-1 py-2 rounded font-black text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer text-center focus:outline-none border flex items-center justify-center gap-1 ${
                      confirmActiveBookTitle === activeBook.title && !isDeletingActiveBook
                        ? 'bg-red-700 hover:bg-red-800 text-white border-red-800'
                        : 'bg-red-100 text-red-900/30 border-red-200 cursor-not-allowed'
                    }`}
                  >
                    {isDeletingActiveBook ? 'Dissolving...' : 'Dissolve 🕳'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 EXPANDED FOLIO IMAGE LIGHTBOX MODAL */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex flex-col items-center justify-center p-4 animate-fade-in select-none"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[88vh] bg-paper-surface p-3.5 rounded-lg border-2 border-leather-border-gold shadow-2xl flex flex-col items-center text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-paper-border text-xs font-serif text-ink-primary">
              <span className="font-bold flex items-center gap-1.5 text-accent-red">
                ⚜ {lightboxImage.title || 'Inscribed Folio Image Attachment'}
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="text-accent-red font-bold text-sm px-2 py-0.5 rounded hover:bg-black/5 transition-colors cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <img 
              src={lightboxImage.url} 
              alt={lightboxImage.title || 'Full view'} 
              className="max-h-[72vh] w-auto max-w-full object-contain rounded border border-paper-border/60"
            />
            <div className="w-full pt-2 mt-2 border-t border-paper-border/40 flex items-center justify-between text-[11px] font-serif text-ink-muted">
              <span>Folio Attachment Preview</span>
              <a
                href={lightboxImage.url}
                download={lightboxImage.title || 'folio-image'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-accent-gold/20 hover:bg-accent-gold/40 text-ink-primary font-bold rounded border border-accent-gold/40 transition-colors"
              >
                Download Original ⤓
              </a>
            </div>
          </div>
        </div>
      )}

      <FountainPenCursor />
    </div>
  );
}

