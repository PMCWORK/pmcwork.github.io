import React, { useRef } from 'react';

export default function PinInput({ length = 6, value, onChange, onComplete }) {
  const inputRefs = useRef([]);
  const digits = value && value.length === length ? value : Array(length).fill('');
  const last = length - 1;

  const handleChange = (index, e) => {
    const rawVal = e.target.value;
    const sanitized = rawVal.replace(/\D/g, '').slice(-1);
    const newPin = [...digits];
    newPin[index] = sanitized;
    onChange?.(newPin);

    // Auto-advance to next input
    if (sanitized && index < last) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }

    // Check completion
    if (newPin.every(d => d !== '')) {
      onComplete?.(newPin.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newPin = [...digits];
        newPin[index - 1] = '';
        onChange?.(newPin);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < last) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted.length > 0) {
      const newPin = Array(length).fill('');
      for (let i = 0; i < pasted.length; i++) {
        newPin[i] = pasted[i];
      }
      onChange?.(newPin);
      const nextFocus = Math.min(pasted.length, last);
      inputRefs.current[nextFocus]?.focus();
      if (pasted.length === length) {
        onComplete?.(pasted);
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((digit, idx) => {
        const isFilled = Boolean(digit);
        return (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            aria-label={`PIN digit ${idx + 1} of ${length}`}
            maxLength={1}
            value={digit || ''}
            onChange={(e) => handleChange(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className={`w-9 h-12 sm:w-11 sm:h-14 text-center font-display font-extrabold text-xl rounded-xl border-2 transition-all outline-none bg-default-50 text-foreground ${
              isFilled
                ? 'border-primary shadow-sm shadow-primary/20 bg-primary-50/20 text-primary'
                : 'border-default-200 hover:border-default-300 focus:border-primary'
            }`}
          />
        );
      })}
    </div>
  );
}
