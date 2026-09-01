'use client';

import React, { useState } from 'react';
import type { IntentSource, IntentContext } from './types';
import { TextArea, Button } from "@repo/presentation-ui-system";

interface IntentNeedInputProps {
  onIntentCaptured: (expression: string, source: IntentSource, context?: IntentContext) => void;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
  submitLabel?: string;
  submitting?: boolean;
  submittingText?: string;
}

export const IntentNeedInput: React.FC<IntentNeedInputProps> = ({
  onIntentCaptured,
  defaultValue = '',
  placeholder = 'Apa yang perlu Anda selesaikan?',
  disabled = false,
  className = '',
  label,
  helperText,
  submitLabel = 'Pahami Kebutuhan Saya',
  submitting: externalSubmitting,
  submittingText = 'Memproses...',
}) => {
  const [expression, setExpression] = useState<string>(defaultValue);
  const [internalSubmitting, setInternalSubmitting] = useState<boolean>(false);

  const isSubmitting = externalSubmitting ?? internalSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expression.trim() || disabled || isSubmitting) return;
    
    const source: IntentSource = {
      actorType: "human",
      entryPoint: "eos-face",
      timestamp: new Date().toISOString()
    };

    const context: IntentContext = {
      domain: "legal",
      locale: "id-ID"
    };

    setInternalSubmitting(true);
    onIntentCaptured(expression.trim(), source, context);
  };

  return (
    <form onSubmit={handleSubmit} className={`w-full space-y-4 ${className}`}>
      <TextArea
        label={label}
        helperText={helperText}
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isSubmitting}
        required
        rows={4}
        aria-label="Kebutuhan yang perlu diselesaikan"
      />
      <Button
        type="submit"
        intent="primary"
        variant="solid"
        size="lg"
        block
        disabled={!expression.trim() || disabled || isSubmitting}
        loading={isSubmitting}
        loadingText={submittingText}
        rightIcon={
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
      >
        {submitLabel}
      </Button>
    </form>
  );
};

export default IntentNeedInput;