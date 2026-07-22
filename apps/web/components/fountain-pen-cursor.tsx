import React, { useEffect, useState, useRef } from 'react';
import { useThemeStore } from '../stores/theme-store';

export function FountainPenCursor() {
  const { theme, reducedMotion } = useThemeStore();
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [trail, setTrail] = useState<Array<{ id: number; x: number; y: number; opacity: number; scale: number }>>([]);
  
  const lastPos = useRef({ x: 0, y: 0, time: 0 });
  const particleId = useRef(0);

  useEffect(() => {
    // Avoid running on mobile/touch-only devices
    if (typeof window === 'undefined') return;
    const hasHover = window.matchMedia('(hover: hover)').matches;
    if (!hasHover) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Check if mouse is inside a book page container
      const isInsidePage = target.closest('.left-page-container, .right-page-container');
      
      // Check if mouse is over an interactive element inside the page
      const isInsideInteractive = target.closest(
        'button, a, input, textarea, select, [role="button"], .cursor-pointer, .interactive, [onClick]'
      );

      const shouldShow = !!isInsidePage && !isInsideInteractive;
      setVisible(shouldShow);

      if (shouldShow) {
        const x = e.clientX;
        const y = e.clientY;
        setCoords({ x, y });

        // Calculate velocity and tilt/rotation based on movement direction
        const now = performance.now();
        const dt = now - lastPos.current.time;
        if (dt > 10) {
          const dx = x - lastPos.current.x;
          // When moving right (dx > 0), tilt slightly right. When moving left (dx < 0), tilt left.
          const targetRotation = Math.max(-15, Math.min(15, dx * 0.8));
          setRotation((prev) => prev + (targetRotation - prev) * 0.15); // Smooth interpolation
          
          // Add ink trail particle if we've moved enough
          const dist = Math.hypot(x - lastPos.current.x, y - lastPos.current.y);
          if (dist > 5 && !reducedMotion) {
            particleId.current += 1;
            setTrail((prev) => [
              ...prev,
              {
                id: particleId.current,
                x,
                y,
                opacity: 0.8,
                scale: 1.0,
              }
            ]);
          }

          lastPos.current = { x, y, time: now };
        }
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [reducedMotion]);

  // Animate and fade out ink particles over time
  useEffect(() => {
    if (trail.length === 0) return;

    const interval = setInterval(() => {
      setTrail((prev) =>
        prev
          .map((p) => ({
            ...p,
            opacity: p.opacity - 0.08,
            scale: p.scale - 0.04,
          }))
          .filter((p) => p.opacity > 0)
      );
    }, 40);

    return () => clearInterval(interval);
  }, [trail]);

  if (!visible) return null;

  // Select ink color matching the custom reading themes
  let inkColor = '#1e293b'; // Slate-800 default for classic-library
  if (theme === 'vintage-journal') {
    inkColor = '#5c4033'; // Rich Sepia Brown
  } else if (theme === 'night-reading') {
    inkColor = '#f59e0b'; // Glowing Amber
  } else if (theme === 'rainy-evening') {
    inkColor = '#0d9488'; // Deep Teal
  } else if (theme === 'fireplace') {
    inkColor = '#991b1b'; // Crimson Warmth
  } else if (theme === 'collector-edition') {
    inkColor = '#d97706'; // Golden Ink Dust
  } else if (theme === 'lined-journal') {
    inkColor = '#1d4ed8'; // Fountain Pen Royal Blue
  }

  return (
    <>
      {/* Dynamic style override to hide native cursor */}
      <style dangerouslySetInnerHTML={{ __html: `
        .left-page-container, .right-page-container {
          cursor: none !important;
        }
        .left-page-container *, .right-page-container * {
          cursor: none !important;
        }
        /* Restore pointer cursor for interactive items */
        .left-page-container button, .left-page-container a, .left-page-container input, .left-page-container textarea, .left-page-container select, .left-page-container [role="button"], .left-page-container .cursor-pointer,
        .right-page-container button, .right-page-container a, .right-page-container input, .right-page-container textarea, .right-page-container select, .right-page-container [role="button"], .right-page-container .cursor-pointer {
          cursor: pointer !important;
        }
      ` }} />

      {/* Elegant Fading Ink Trail */}
      {trail.map((p) => (
        <div
          key={p.id}
          className="fixed pointer-events-none z-50 rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: `${5 * p.scale}px`,
            height: `${5 * p.scale}px`,
            backgroundColor: inkColor,
            opacity: p.opacity,
            transform: 'translate(-50%, -50%)',
            boxShadow: theme === 'night-reading' ? `0 0 6px ${inkColor}` : 'none',
          }}
        />
      ))}

      {/* Fountain Pen Element */}
      <div
        className="fixed pointer-events-none z-50 select-none will-change-transform"
        style={{
          left: coords.x,
          top: coords.y,
          transform: `translate(-1.5px, -34.5px) rotate(${rotation + (isClicking ? -10 : 0)}deg) scale(${isClicking ? 0.9 : 1})`,
          transformOrigin: '1.5px 34.5px', // Rotates and scales precisely from the Nib tip hotspot
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="drop-shadow-lg">
          {/* Pen Barrel / Body */}
          <path
            d="M14 22 L31 5 C32 4 33.5 4 34.5 5 C35.5 6 35.5 7.5 34.5 8.5 L17.8 25.2 Z"
            fill="#1c1917"
            stroke="#292524"
            strokeWidth="0.75"
          />
          {/* Gold Accent Band */}
          <path
            d="M13 23 L16.5 19.5 L18 21 L14.5 24.5 Z"
            fill="url(#goldGradient)"
          />
          {/* Grip Section */}
          <path
            d="M8.5 27.5 L13 23 L14.5 24.5 L10 29 Z"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="0.5"
          />
          {/* Gold Nib */}
          <path
            d="M1.5 34.5 C1 35 1 35 1 35 L4.5 31.5 C5.5 31.7 6.2 31.2 6.5 31 L8.5 27.5 L10 29 L6.5 31 C6.3 31.3 5.8 32 6 33 L1.5 34.5 Z"
            fill="url(#goldGradient)"
            stroke="#b45309"
            strokeWidth="0.5"
          />
          {/* Nib details & breather hole */}
          <circle cx="5" cy="31" r="0.6" fill="#0f172a" />
          <line x1="1.5" y1="34.5" x2="5" y2="31" stroke="#b45309" strokeWidth="0.5" />
          <line x1="5" y1="31" x2="7.5" y2="28.5" stroke="#475569" strokeWidth="0.5" />

          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="50%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </>
  );
}
