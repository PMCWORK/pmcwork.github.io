import React, { useEffect, useRef, useState } from 'react';

// PIN entry: one real (invisible) input laid over N display boxes, so digits can only be
// entered in order. Typing fills the next box, Backspace clears the last one, clicking any
// box just focuses the entry, and the first box is focused automatically.
export default function PinInput({ length = 6, value, onChange, onComplete, disabled = false }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const digits = Array.isArray(value) ? value : [];
  const pin = digits.join('').replace(/\D/g, '').slice(0, length);
  const activeIndex = Math.min(pin.length, length - 1);

  // Auto-focus on mount (this component remounts after each failed attempt)
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const keepCaretAtEnd = () => {
    const el = inputRef.current;
    if (el) {
      const end = el.value.length;
      try { el.setSelectionRange(end, end); } catch (_) {}
    }
  };

  const handleChange = (e) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, length);
    const nextDigits = Array.from({ length }, (_, i) => next[i] || '');
    onChange?.(nextDigits);
    if (next.length === length && next !== pin) onComplete?.(next);
  };

  const handleKeyDown = (e) => {
    // Block moving the caret: entry is strictly sequential
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    // The invisible input covers all boxes, so tapping any box focuses the one entry field.
    <div className="relative flex items-center justify-center gap-2">
      {Array.from({ length }, (_, idx) => {
        const isFilled = idx < pin.length;
        const isActive = focused && !disabled && idx === activeIndex && pin.length < length;
        return (
          <div
            key={idx}
            aria-hidden="true"
            className={`w-9 h-12 sm:w-11 sm:h-14 flex items-center justify-center rounded-xl border-2 transition-all bg-default-50 select-none ${
              isActive
                ? 'border-primary ring-2 ring-primary/30 shadow-sm shadow-primary/20'
                : isFilled
                  ? 'border-primary/70 bg-primary-50/20'
                  : 'border-default-200'
            }`}
          >
            {isFilled ? (
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            ) : isActive ? (
              <span className="w-0.5 h-6 bg-primary animate-pulse rounded" />
            ) : null}
          </div>
        );
      })}

      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={`Staff PIN, ${length} digits`}
        maxLength={length}
        value={pin}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { setFocused(true); keepCaretAtEnd(); }}
        onBlur={() => setFocused(false)}
        onSelect={keepCaretAtEnd}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ caretColor: 'transparent' }}
      />
    </div>
  );
}
