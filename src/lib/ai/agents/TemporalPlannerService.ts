export interface TimeSlot {
  id: string
  timestamp: Date
  scheduledDate: string
  order: number
}

export interface TemporalPlan {
  campaignId: string
  totalSlots: number
  slots: TimeSlot[]
  startDate: Date
  endDate: Date
  intervalHours: number
  timezone: string
}

export interface TemporalPlannerParams {
  campaignId: string
  startDate: string
  endDate: string
  intervalHours: number
  timezone?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export class TemporalPlannerService {
  private readonly DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires'

  /**
   * Función determinística para calcular slots de publicación
   * No utiliza IA, solo cálculos matemáticos precisos
   */
  calculatePublicationSlots(params: TemporalPlannerParams): TemporalPlan {
    console.log('📅 TemporalPlannerService: Calculating publication slots...')

    // Validar parámetros de entrada
    const validation = this.validateParameters(params)
    if (!validation.isValid) {
      throw new Error(`Parámetros inválidos: ${validation.errors.join(', ')}`)
    }

    const { campaignId, startDate, endDate, intervalHours, timezone = this.DEFAULT_TIMEZONE } = params

    // Convertir fechas a objetos Date
    const startDateTime = new Date(startDate)
    const endDateTime = new Date(endDate)

    console.log('📊 Temporal calculation params:', {
      campaignId,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      interval: intervalHours,
      timezone
    })

    // Calcular slots
    const slots = this.generateTimeSlots(startDateTime, endDateTime, intervalHours)

    const temporalPlan: TemporalPlan = {
      campaignId,
      totalSlots: slots.length,
      slots,
      startDate: startDateTime,
      endDate: endDateTime,
      intervalHours,
      timezone
    }

    console.log('✅ Temporal plan generated:', {
      totalSlots: temporalPlan.totalSlots,
      firstSlot: slots[0]?.scheduledDate,
      lastSlot: slots[slots.length - 1]?.scheduledDate
    })

    return temporalPlan
  }

  private validateParameters(params: TemporalPlannerParams): ValidationResult {
    const errors: string[] = []

    // Validar campaignId
    if (!params.campaignId || params.campaignId.trim().length === 0) {
      errors.push('Campaign ID es requerido')
    }

    // Validar fechas
    if (!params.startDate) {
      errors.push('Fecha de inicio es requerida')
    }

    if (!params.endDate) {
      errors.push('Fecha de fin es requerida')
    }

    // Validar intervalo
    if (!params.intervalHours || params.intervalHours <= 0) {
      errors.push('Intervalo debe ser mayor a 0 horas')
    }

    // Validar rango de fechas
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate)
      const end = new Date(params.endDate)

      if (isNaN(start.getTime())) {
        errors.push('Fecha de inicio inválida')
      }

      if (isNaN(end.getTime())) {
        errors.push('Fecha de fin inválida')
      }

      if (start.getTime() >= end.getTime()) {
        errors.push('Fecha de fin debe ser posterior a fecha de inicio')
      }

      // Validar que la campaña no sea excesivamente larga
      const durationMs = end.getTime() - start.getTime()
      const maxDurationMs = 365 * 24 * 60 * 60 * 1000 // 1 año
      
      if (durationMs > maxDurationMs) {
        errors.push('Duración de campaña no puede exceder 1 año')
      }
    }

    // Validar intervalo razonable
    if (params.intervalHours && (params.intervalHours < 0.5 || params.intervalHours > 168)) {
      errors.push('Intervalo debe estar entre 0.5 y 168 horas (1 semana)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private generateTimeSlots(startDate: Date, endDate: Date, intervalHours: number): TimeSlot[] {
    const slots: TimeSlot[] = []
    const intervalMs = intervalHours * 60 * 60 * 1000 // Convertir horas a milisegundos

    let currentTime = new Date(startDate.getTime())
    let slotIndex = 0

    // Incluir el primer slot si coincide con la fecha de inicio
    if (currentTime.getTime() <= endDate.getTime()) {
      slots.push({
        id: `slot-${slotIndex}`,
        timestamp: new Date(currentTime),
        scheduledDate: currentTime.toISOString(),
        order: slotIndex
      })
      slotIndex++
    }

    // Generar slots siguientes
    while (true) {
      currentTime = new Date(currentTime.getTime() + intervalMs)
      
      // Verificar que no supere la fecha de fin
      if (currentTime.getTime() > endDate.getTime()) {
        break
      }

      slots.push({
        id: `slot-${slotIndex}`,
        timestamp: new Date(currentTime),
        scheduledDate: currentTime.toISOString(),
        order: slotIndex
      })
      
      slotIndex++

      // Límite de seguridad para evitar loops infinitos
      if (slotIndex > 10000) {
        console.warn('⚠️ Límite de slots alcanzado (10,000), deteniendo generación')
        break
      }
    }

    return slots
  }

  /**
   * Ajustar slots a franjas horarias preferidas
   * Útil para optimizar horarios de publicación
   */
  adjustSlotsToPreferredHours(
    slots: TimeSlot[], 
    preferredHours: number[] = [9, 12, 15, 18, 21]
  ): TimeSlot[] {
    return slots.map(slot => {
      const currentHour = slot.timestamp.getHours()
      
      // Encontrar la hora preferida más cercana
      const closestHour = preferredHours.reduce((closest, hour) => {
        const currentDiff = Math.abs(currentHour - closest)
        const newDiff = Math.abs(currentHour - hour)
        return newDiff < currentDiff ? hour : closest
      })

      // Crear nueva fecha con la hora ajustada
      const adjustedDate = new Date(slot.timestamp)
      adjustedDate.setHours(closestHour, 0, 0, 0)

      return {
        ...slot,
        timestamp: adjustedDate,
        scheduledDate: adjustedDate.toISOString()
      }
    })
  }

  /**
   * Validar que no haya conflictos con slots existentes
   */
  validateSlotConflicts(newSlots: TimeSlot[], existingSlots: TimeSlot[] = []): ValidationResult {
    const errors: string[] = []
    const conflictThresholdMs = 30 * 60 * 1000 // 30 minutos

    for (const newSlot of newSlots) {
      for (const existingSlot of existingSlots) {
        const timeDiff = Math.abs(newSlot.timestamp.getTime() - existingSlot.timestamp.getTime())
        
        if (timeDiff < conflictThresholdMs) {
          errors.push(`Conflicto detectado: slot ${newSlot.id} muy cercano a slot existente ${existingSlot.id}`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Obtener estadísticas del plan temporal
   */
  getPlanStatistics(plan: TemporalPlan): {
    totalDurationHours: number
    averageIntervalHours: number
    slotsPerDay: number
    weekdaySlots: number
    weekendSlots: number
    peakHourSlots: number
    offPeakSlots: number
  } {
    const totalDurationMs = plan.endDate.getTime() - plan.startDate.getTime()
    const totalDurationHours = totalDurationMs / (60 * 60 * 1000)

    const averageIntervalHours = plan.totalSlots > 1 
      ? totalDurationHours / (plan.totalSlots - 1)
      : plan.intervalHours

    const slotsPerDay = plan.totalSlots / (totalDurationHours / 24)

    let weekdaySlots = 0
    let weekendSlots = 0
    let peakHourSlots = 0
    let offPeakSlots = 0

    plan.slots.forEach(slot => {
      const dayOfWeek = slot.timestamp.getDay()
      const hour = slot.timestamp.getHours()

      // Contar días de semana vs fin de semana
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        weekdaySlots++
      } else {
        weekendSlots++
      }

      // Contar horas pico vs no pico (9-12, 15-18, 20-22)
      if ((hour >= 9 && hour <= 12) || (hour >= 15 && hour <= 18) || (hour >= 20 && hour <= 22)) {
        peakHourSlots++
      } else {
        offPeakSlots++
      }
    })

    return {
      totalDurationHours,
      averageIntervalHours,
      slotsPerDay,
      weekdaySlots,
      weekendSlots,
      peakHourSlots,
      offPeakSlots
    }
  }

  /**
   * Exportar plan temporal a diferentes formatos
   */
  exportPlan(plan: TemporalPlan, format: 'json' | 'csv' | 'calendar' = 'json'): string {
    switch (format) {
      case 'csv':
        return this.exportToCSV(plan)
      case 'calendar':
        return this.exportToCalendar(plan)
      case 'json':
      default:
        return JSON.stringify(plan, null, 2)
    }
  }

  private exportToCSV(plan: TemporalPlan): string {
    const headers = ['Slot ID', 'Order', 'Scheduled Date', 'Day of Week', 'Hour', 'Timezone']
    const rows = plan.slots.map(slot => [
      slot.id,
      slot.order.toString(),
      slot.scheduledDate,
      slot.timestamp.toLocaleDateString('es-ES', { weekday: 'long' }),
      slot.timestamp.getHours().toString(),
      plan.timezone
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  private exportToCalendar(plan: TemporalPlan): string {
    // Formato iCalendar básico
    let ical = 'BEGIN:VCALENDAR\n'
    ical += 'VERSION:2.0\n'
    ical += 'PRODID:-//PostIA//Campaign Planner//ES\n'

    plan.slots.forEach(slot => {
      ical += 'BEGIN:VEVENT\n'
      ical += `UID:${slot.id}@postia.com\n`
      ical += `DTSTART:${slot.timestamp.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`
      ical += `SUMMARY:Publicación programada - ${plan.campaignId}\n`
      ical += `DESCRIPTION:Slot ${slot.order + 1} de campaña\n`
      ical += 'END:VEVENT\n'
    })

    ical += 'END:VCALENDAR\n'
    return ical
  }
}