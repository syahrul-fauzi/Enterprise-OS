"use client";

import React, { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";

type FieldSize = "sm" | "md" | "lg";

interface BaseFieldProps {
  readonly label?: string;
  readonly helperText?: string;
  readonly error?: string;
  readonly size?: FieldSize;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly options?: Array<{ value: string; label: string }>;
}

const sizeClasses: Record<FieldSize, string> = {
  sm: "h-9 px-3 text-sm rounded-sm",
  md: "h-11 px-4 text-sm rounded-md",
  lg: "h-12 px-4 text-base rounded-md",
};

const textareaSizeClasses: Record<FieldSize, string> = {
  sm: "px-3 py-2 text-sm rounded-sm",
  md: "px-4 py-3 text-sm rounded-md",
  lg: "px-4 py-3.5 text-base rounded-md",
};

const baseFieldClasses = [
  "w-full bg-surface text-text-primary",
  "border border-surface-border",
  "placeholder:text-text-muted",
  "transition-all duration-eos-fast ease-eos-standard",
  "focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20",
  "focus-visible:outline-none focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/20",
  "disabled:bg-surface-sunken disabled:text-text-disabled disabled:cursor-not-allowed",
  "aria-[invalid=true]:border-status-danger aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-status-danger/20",
].join(" ");

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "required">, Omit<BaseFieldProps, "placeholder" | "options"> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helperText,
    error,
    size = "md",
    required,
    className = "",
    id,
    "aria-invalid": ariaInvalid,
    ...rest
  },
  ref
) {
  const fieldId = id ?? React.useId();
  const helperId = helperText || error ? `${fieldId}-helper` : undefined;
  const hasError = !!error;
  const invalid = ariaInvalid ?? hasError;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
        >
          {label}
          {required && <span className="ml-1 text-status-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={invalid}
        aria-describedby={helperId}
        className={[baseFieldClasses, sizeClasses[size], className].join(" ")}
        {...rest}
      />
      {(helperText || error) && (
        <p
          id={helperId}
          className={[
            "text-xs",
            error ? "text-status-danger" : "text-text-muted",
          ].join(" ")}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
});

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size" | "required">, Omit<BaseFieldProps, "placeholder" | "options"> {}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    label,
    helperText,
    error,
    size = "md",
    required,
    className = "",
    id,
    "aria-invalid": ariaInvalid,
    ...rest
  },
  ref
) {
  const fieldId = id ?? React.useId();
  const helperId = helperText || error ? `${fieldId}-helper` : undefined;
  const hasError = !!error;
  const invalid = ariaInvalid ?? hasError;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
        >
          {label}
          {required && <span className="ml-1 text-status-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={invalid}
        aria-describedby={helperId}
        className={[baseFieldClasses, textareaSizeClasses[size], "resize-y min-h-[96px]", className].join(" ")}
        {...rest}
      />
      {(helperText || error) && (
        <p
          id={helperId}
          className={[
            "text-xs",
            error ? "text-status-danger" : "text-text-muted",
          ].join(" ")}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
});

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "required">, Omit<BaseFieldProps, "placeholder" | "options"> {
  readonly options?: readonly SelectOption[];
  readonly placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    helperText,
    error,
    size = "md",
    required,
    className = "",
    id,
    children,
    placeholder,
    options,
    "aria-invalid": ariaInvalid,
    value,
    ...rest
  },
  ref
) {
  const fieldId = id ?? React.useId();
  const helperId = helperText || error ? `${fieldId}-helper` : undefined;
  const hasError = !!error;
  const invalid = ariaInvalid ?? hasError;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
        >
          {label}
          {required && <span className="ml-1 text-status-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={invalid}
        aria-describedby={helperId}
        value={value}
        className={[baseFieldClasses, "text-text-muted", sizeClasses[size], "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2024%2024%22%20stroke=%22currentColor%22%3E%3Cpath%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%222%22%20d=%22M19%209l-7%207-7-7%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25rem] pr-10", className].join(" ")}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options ? options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        )) : children}
      </select>
      {(helperText || error) && (
        <p
          id={helperId}
          className={[
            "text-xs",
            error ? "text-status-danger" : "text-text-muted",
          ].join(" ")}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
});

export default Input;