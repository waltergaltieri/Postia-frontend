'use client'

import { forwardRef } from 'react'
import { Input } from './Input'

interface ColorPickerProps {
  label: string
  placeholder?: string
  error?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ label, placeholder, error, value, onChange, className }, ref) => {
    const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value)
    }

    const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value)
    }

    return (
      <div className={className}>
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          {label}
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="color"
            value={value}
            onChange={handleColorChange}
            className="h-11 w-16 rounded-lg border border-secondary-300 cursor-pointer bg-white"
            aria-label={`Selector de ${label.toLowerCase()}`}
          />
          <Input
            ref={ref}
            placeholder={placeholder}
            error={error}
            value={value}
            onChange={handleTextChange}
            className="flex-1"
          />
        </div>
      </div>
    )
  }
)

ColorPicker.displayName = 'ColorPicker'