import { useState, useEffect } from 'react'

/**
 * Utilidad para generar IDs únicos de manera consistente
 * Evita problemas de hidratación en SSR
 */

let idCounter = 0

/**
 * Genera un ID único usando un contador incremental
 * Más predecible que Math.random() para SSR
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${++idCounter}`
}

/**
 * Genera un ID único usando timestamp y contador
 * Para casos donde se necesita más unicidad
 */
export function generateUniqueId(prefix: string = 'unique'): string {
  return `${prefix}-${Date.now()}-${++idCounter}`
}

/**
 * Hook para generar IDs únicos en componentes React
 * Se ejecuta solo en el cliente para evitar problemas de hidratación
 */
export function useUniqueId(prefix: string = 'component'): string {
  const [id, setId] = useState('')
  
  useEffect(() => {
    setId(generateId(prefix))
  }, [prefix])
  
  return id
}

// Para usar en componentes que no son hooks
export function createClientSideId(prefix: string = 'client'): string {
  if (typeof window === 'undefined') {
    return '' // En el servidor, devolver string vacío
  }
  return generateId(prefix)
}