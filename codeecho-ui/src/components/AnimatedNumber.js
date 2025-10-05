import React, { useEffect, useRef, useState } from 'react';

/*
 * AnimatedNumber
 * Smoothly transitions from previous numeric value to new value using a duration-based tween.
 * Adds a subtle scale bump animation when value changes.
 * Non-numeric values (like '—' or 'Processing...') are rendered directly with no animation.
 */
export const AnimatedNumber = ({ value, duration = 600, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const frameRef = useRef();
  const startTimeRef = useRef();
  const fromRef = useRef(value);
  const bumpRef = useRef(null);

  const isNumeric = typeof value === 'number' && !isNaN(value);
  const prevIsNumeric = typeof previousValueRef.current === 'number' && !isNaN(previousValueRef.current);

  useEffect(() => {
    if (!isNumeric || !prevIsNumeric) {
      // Direct set if either old or new is non-numeric
      previousValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    if (value === previousValueRef.current) return; // No change

    cancelAnimationFrame(frameRef.current);
    startTimeRef.current = undefined;
    fromRef.current = previousValueRef.current;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplayValue(Math.round(current));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    previousValueRef.current = value;

    // Trigger bump animation via class toggle
    if (bumpRef.current) {
      bumpRef.current.classList.remove('anim-bump');
      // Force reflow to restart animation
      // eslint-disable-next-line no-unused-expressions
      bumpRef.current.offsetWidth;
      bumpRef.current.classList.add('anim-bump');
    }

    return () => cancelAnimationFrame(frameRef.current);
  }, [value, isNumeric, prevIsNumeric, duration]);

  return (
    <span ref={bumpRef} className={`inline-block transition-colors ${className}`}>
      {displayValue}
    </span>
  );
};

export default AnimatedNumber;
