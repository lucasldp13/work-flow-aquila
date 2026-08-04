"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

const fieldBaseClasses =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrapperProps>(
  ({ className, label, error, hint, required, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <input ref={ref} id={id} className={cn(fieldBaseClasses, error && "border-rose-400 focus:border-rose-500 focus:ring-rose-100", className)} {...props} />
        {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrapperProps>(
  ({ className, label, error, hint, required, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <textarea ref={ref} id={id} className={cn(fieldBaseClasses, "min-h-[90px]", error && "border-rose-400", className)} {...props} />
        {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldWrapperProps>(
  ({ className, label, error, hint, required, id, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <select ref={ref} id={id} className={cn(fieldBaseClasses, error && "border-rose-400", className)} {...props}>
          {children}
        </select>
        {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
