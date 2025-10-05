'use client'

import React, { ReactNode, useState, useRef, useEffect } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils'
import { HiChevronDown, HiCheck } from 'react-icons/hi'

const dropdownVariants = cva('relative inline-block text-left w-full', {
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

const triggerVariants = cva(
  'inline-flex w-full justify-between items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-secondary-300 hover:border-secondary-400',
        error: 'border-error-500',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const menuVariants = cva(
  'absolute z-10 mt-1 w-full rounded-lg bg-white shadow-strong border border-secondary-200 py-1 max-h-60 overflow-auto focus:outline-none',
  {
    variants: {
      position: {
        bottom: 'top-full',
        top: 'bottom-full mb-1',
      },
    },
    defaultVariants: {
      position: 'bottom',
    },
  }
)

const optionVariants = cva(
  'relative cursor-pointer select-none py-2 px-3 text-secondary-900 hover:bg-secondary-100 focus:bg-secondary-100 focus:outline-none flex items-center justify-between',
  {
    variants: {
      selected: {
        true: 'bg-primary-50 text-primary-900',
        false: '',
      },
      disabled: {
        true: 'cursor-not-allowed opacity-50',
        false: '',
      },
    },
    defaultVariants: {
      selected: false,
      disabled: false,
    },
  }
)

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
  icon?: ReactNode
}

export interface DropdownProps extends VariantProps<typeof dropdownVariants> {
  options: DropdownOption[]
  value?: string
  placeholder?: string
  onSelect: (value: string) => void
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  searchable?: boolean
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  placeholder = 'Seleccionar...',
  onSelect,
  disabled = false,
  error,
  label,
  required = false,
  size,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(option => option.value === value)
  const hasError = Boolean(error)
  const triggerVariant = hasError ? 'error' : 'default'

  // Filter options based on search term
  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchTerm('')
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          setIsOpen(true)
          if (searchable) {
            setTimeout(() => searchInputRef.current?.focus(), 0)
          }
        } else if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          onSelect(filteredOptions[focusedIndex].value)
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
        }
        event.preventDefault()
        break
      case 'Escape':
        setIsOpen(false)
        setSearchTerm('')
        setFocusedIndex(-1)
        triggerRef.current?.focus()
        break
      case 'ArrowDown':
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setFocusedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
        }
        event.preventDefault()
        break
      case 'ArrowUp':
        if (isOpen) {
          setFocusedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
          event.preventDefault()
        }
        break
    }
  }

  const handleOptionClick = (optionValue: string) => {
    if (disabled) return
    onSelect(optionValue)
    setIsOpen(false)
    setSearchTerm('')
    setFocusedIndex(-1)
    triggerRef.current?.focus()
  }

  const dropdownId = `dropdown-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={dropdownId}
          className={cn(
            'block text-sm font-medium text-secondary-700 mb-1',
            required && "after:content-['*'] after:ml-0.5 after:text-error-500"
          )}
        >
          {label}
        </label>
      )}

      <div ref={dropdownRef} className={cn(dropdownVariants({ size }))}>
        <button
          ref={triggerRef}
          id={dropdownId}
          type="button"
          className={cn(triggerVariants({ variant: triggerVariant, size }))}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-invalid={hasError}
          aria-describedby={error ? `${dropdownId}-error` : undefined}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <HiChevronDown
            className={cn(
              'h-4 w-4 text-secondary-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div className={cn(menuVariants({ position: 'bottom' }))}>
            {searchable && (
              <div className="p-2 border-b border-secondary-200">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      e.preventDefault()
                      handleKeyDown(e as any)
                    }
                  }}
                />
              </div>
            )}

            <div role="listbox" aria-labelledby={dropdownId}>
              {filteredOptions.length === 0 ? (
                <div className="py-2 px-3 text-sm text-secondary-500">
                  No se encontraron opciones
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    className={cn(
                      optionVariants({
                        selected: option.value === value,
                        disabled: option.disabled,
                      }),
                      focusedIndex === index && 'bg-secondary-100'
                    )}
                    onClick={() =>
                      !option.disabled && handleOptionClick(option.value)
                    }
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {option.icon}
                      {option.label}
                    </span>
                    {option.value === value && (
                      <HiCheck className="h-4 w-4 text-primary-600" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p
          id={`${dropdownId}-error`}
          className="mt-1 text-xs text-error-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export { Dropdown }
