'use client'

import React, { useState, useEffect } from 'react'
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin } from 'react-icons/fa'

interface PlatformDistribution {
  instagram: number
  linkedin: number
  twitter: number
  facebook: number
}

interface PlatformSelectorProps {
  distribution: PlatformDistribution
  onChange: (distribution: PlatformDistribution) => void
  error?: string
}

const platformOptions = [
  {
    key: 'instagram' as keyof PlatformDistribution,
    label: 'Instagram',
    icon: FaInstagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
  {
    key: 'linkedin' as keyof PlatformDistribution,
    label: 'LinkedIn',
    icon: FaLinkedin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    key: 'twitter' as keyof PlatformDistribution,
    label: 'Twitter',
    icon: FaTwitter,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
  },
  {
    key: 'facebook' as keyof PlatformDistribution,
    label: 'Facebook',
    icon: FaFacebook,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
]

export function PlatformSelector({
  distribution,
  onChange,
  error,
}: PlatformSelectorProps) {
  const [localDistribution, setLocalDistribution] = useState<PlatformDistribution>(distribution)
  const [isAdjusting, setIsAdjusting] = useState(false)

  // Calculate total percentage
  const totalPercentage = Object.values(localDistribution).reduce((sum, value) => sum + value, 0)
  const isValidDistribution = totalPercentage === 100

  useEffect(() => {
    setLocalDistribution(distribution)
  }, [distribution])

  const handlePercentageChange = (platform: keyof PlatformDistribution, value: number) => {
    const newValue = Math.max(0, Math.min(100, value))
    const newDistribution = { ...localDistribution, [platform]: newValue }
    
    setLocalDistribution(newDistribution)
    setIsAdjusting(true)

    // Auto-adjust other platforms if total exceeds 100%
    const newTotal = Object.values(newDistribution).reduce((sum, val) => sum + val, 0)
    
    if (newTotal > 100) {
      const excess = newTotal - 100
      const otherPlatforms = Object.keys(newDistribution).filter(key => key !== platform) as (keyof PlatformDistribution)[]
      
      // Distribute the excess proportionally among other platforms
      let remainingExcess = excess
      const adjustedDistribution = { ...newDistribution }
      
      for (const otherPlatform of otherPlatforms) {
        if (remainingExcess <= 0) break
        
        const currentValue = adjustedDistribution[otherPlatform]
        const reduction = Math.min(currentValue, remainingExcess)
        adjustedDistribution[otherPlatform] = currentValue - reduction
        remainingExcess -= reduction
      }
      
      setLocalDistribution(adjustedDistribution)
      onChange(adjustedDistribution)
    } else {
      onChange(newDistribution)
    }

    // Reset adjusting flag after a short delay
    setTimeout(() => setIsAdjusting(false), 300)
  }

  const handleAutoBalance = () => {
    const activePlatforms = platformOptions.filter(platform => localDistribution[platform.key] > 0)
    const equalPercentage = Math.floor(100 / activePlatforms.length)
    const remainder = 100 % activePlatforms.length
    
    const balancedDistribution = { ...localDistribution }
    
    // Reset all to 0 first
    Object.keys(balancedDistribution).forEach(key => {
      balancedDistribution[key as keyof PlatformDistribution] = 0
    })
    
    // Distribute equally among active platforms
    activePlatforms.forEach((platform, index) => {
      balancedDistribution[platform.key] = equalPercentage + (index < remainder ? 1 : 0)
    })
    
    setLocalDistribution(balancedDistribution)
    onChange(balancedDistribution)
  }

  const handlePresetDistribution = (preset: 'equal' | 'instagram-focused' | 'linkedin-focused') => {
    let newDistribution: PlatformDistribution

    switch (preset) {
      case 'equal':
        newDistribution = { instagram: 25, linkedin: 25, twitter: 25, facebook: 25 }
        break
      case 'instagram-focused':
        newDistribution = { instagram: 50, linkedin: 20, twitter: 20, facebook: 10 }
        break
      case 'linkedin-focused':
        newDistribution = { instagram: 20, linkedin: 50, twitter: 20, facebook: 10 }
        break
      default:
        return
    }

    setLocalDistribution(newDistribution)
    onChange(newDistribution)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-600">
          Distribuye el porcentaje de contenido entre plataformas
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handlePresetDistribution('equal')}
            className="text-xs px-2 py-1 bg-secondary-100 text-secondary-600 rounded hover:bg-secondary-200 transition-colors"
          >
            Igual
          </button>
          <button
            type="button"
            onClick={() => handlePresetDistribution('instagram-focused')}
            className="text-xs px-2 py-1 bg-secondary-100 text-secondary-600 rounded hover:bg-secondary-200 transition-colors"
          >
            Instagram+
          </button>
          <button
            type="button"
            onClick={() => handlePresetDistribution('linkedin-focused')}
            className="text-xs px-2 py-1 bg-secondary-100 text-secondary-600 rounded hover:bg-secondary-200 transition-colors"
          >
            LinkedIn+
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platformOptions.map(({ key, label, icon: Icon, color, bgColor, borderColor }) => (
          <div
            key={key}
            className={`p-4 border rounded-lg transition-all duration-200 ${
              localDistribution[key] > 0
                ? `${bgColor} ${borderColor}`
                : 'border-secondary-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Icon className={`w-5 h-5 mr-2 ${color}`} />
                <span className="font-medium text-secondary-900">{label}</span>
              </div>
              <span className="text-sm font-medium text-secondary-600">
                {localDistribution[key]}%
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={localDistribution[key]}
                onChange={(e) => handlePercentageChange(key, parseInt(e.target.value))}
                className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer slider"
                aria-label={`Porcentaje para ${label}`}
              />
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={localDistribution[key]}
                  onChange={(e) => handlePercentageChange(key, parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  aria-label={`Porcentaje numérico para ${label}`}
                />
                <span className="text-sm text-secondary-500">%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Distribution Summary */}
      <div className={`p-4 rounded-lg border ${
        isValidDistribution 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              isValidDistribution ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span className="text-sm font-medium">
              Total: {totalPercentage}%
            </span>
          </div>
          
          {!isValidDistribution && (
            <button
              type="button"
              onClick={handleAutoBalance}
              className="text-sm px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              Auto-balancear
            </button>
          )}
        </div>
        
        {!isValidDistribution && (
          <p className="text-xs text-yellow-700 mt-1">
            {totalPercentage > 100 
              ? `Excede por ${totalPercentage - 100}%. Ajusta los valores.`
              : `Faltan ${100 - totalPercentage}% para completar la distribución.`
            }
          </p>
        )}
      </div>

      {/* Visual Distribution Bar */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-secondary-700">Vista previa de distribución:</p>
        <div className="h-4 bg-secondary-200 rounded-full overflow-hidden flex">
          {platformOptions.map(({ key, color }) => {
            const percentage = localDistribution[key]
            if (percentage === 0) return null
            
            return (
              <div
                key={key}
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: key === 'instagram' ? '#e91e63' : 
                                   key === 'linkedin' ? '#0077b5' : 
                                   key === 'twitter' ? '#1da1f2' : 
                                   key === 'facebook' ? '#1877f2' : '#6b7280'
                }}
                title={`${key}: ${percentage}%`}
              />
            )
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}
    </div>
  )
}