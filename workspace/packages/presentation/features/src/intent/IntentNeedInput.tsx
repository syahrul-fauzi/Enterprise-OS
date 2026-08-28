'use client';

import React, { useState } from 'react';
import type { IntentSource, IntentContext } from './types';

// Reusable IntentNeedInput building block - captures raw human need as first step in Formation lifecycle
// Implements F1: Human can express need directly in a formation surface
interface IntentNeedInputProps {
  onIntentCaptured: (expression: string, source: IntentSource, context?: IntentContext) => void;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const IntentNeedInput: React.FC<IntentNeedInputProps> = ({
  onIntentCaptured,
  defaultValue = '',
  placeholder = 'Apa yang perlu Anda selesaikan?',
  disabled = false,
  className = '',
}) => {
  const [expression, setExpression] = useState<string>(defaultValue);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expression.trim() || disabled) return;
    
    // Create standard IntentContract source metadata (F3 compliance)
    const source: IntentSource = {
      actorType: "human",
      entryPoint: "eos-face",
      timestamp: new Date().toISOString()
    };

    // Set default context - will be overridden by domain-specific super actor surfaces
    const context: IntentContext = {
      domain: "legal",
      locale: "id-ID"
    };

    onIntentCaptured(expression.trim(), source, context);
  };

  const isSubmitDisabled = !expression.trim() || disabled;

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className={`relative rounded-lg border transition-all duration-200 ${
        isFocused ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'
      }`}>
        <textarea
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="w-full px-4 py-3 rounded-lg resize-none focus:outline-none text-gray-900 placeholder:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Kebutuhan yang perlu diselesaikan"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className={`w-full mt-4 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white transition-colors duration-200 ${
          isSubmitDisabled 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        }`}
      >
        Pahami Kebutuhan Saya
      </button>
    </form>
  );
};

export default IntentNeedInput;