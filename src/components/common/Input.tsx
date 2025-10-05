import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils'

const inputVariants = cva(
  'flex w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-secondary-900 transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary-50',
  {
    variants: {
      variant: {
        default: 'border-secondary-200 hover:border-secondary-300',
        error: 'border-red-300 focus:ring-red-500 focus:border-transparent',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const labelVariants = cva('block text-sm font-medium text-secondary-700 mb-2', {
  variants: {
    required: {
      true: "after:content-['*'] after:ml-0.5 after:text-red-500",
      false: '',
    },
  },
  defaultVariants: {
    required: false,
  },
})

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      label,
      error,
      helperText,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`
    const hasError = Boolean(error)
    const inputVariant = hasError ? 'error' : variant

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={cn(labelVariants({ required }))}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={cn(
            inputVariants({ variant: inputVariant, size, className })
          )}
          ref={ref}
          required={required}
          {...(hasError && { 'aria-invalid': 'true' })}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-2 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="mt-2 text-sm text-secondary-500"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input, inputVariants }
