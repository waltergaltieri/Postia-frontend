import { PublicationRepository } from '../repositories/PublicationRepository'
import { CampaignRepository } from '../repositories/CampaignRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import { SocialAccountRepository } from '../repositories/SocialAccountRepository'
import { ResourceRepository } from '../repositories/ResourceRepository'
import { TemplateRepository } from '../repositories/TemplateRepository'
import {
  Publication,
  CreatePublicationData,
  UpdatePublicationData,
  SocialNetwork,
  RegenerationHistory,
  CreateRegenerationHistoryData,
  GenerationMetadata,
} from '../types'

/**
 * Business service for publication management with intelligent scheduling and calendar optimization
 */
export class PublicationService {
  private publicationRepo: PublicationRepository
  private campaignRepo: CampaignRepository
  private workspaceRepo: WorkspaceRepository
  private socialAccountRepo: SocialAccountRepository
  private resourceRepo: ResourceRepository
  private templateRepo: TemplateRepository

  constructor() {
    this.publicationRepo = new PublicationRepository()
    this.campaignRepo = new CampaignRepository()
    this.workspaceRepo = new WorkspaceRepository()
    this.socialAccountRepo = new SocialAccountRepository()
    this.resourceRepo = new ResourceRepository()
    this.templateRepo = new TemplateRepository()
  }

  /**
   * Create publication with comprehensive validation
   */
  public createPublication(
    publicationData: CreatePublicationData,
    agencyId: string
  ): Publication {
    // Validate campaign access
    const campaign = this.campaignRepo.findById(publicationData.campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Validate workspace access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        campaign.workspaceId,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    // Validate publication data
    this.validatePublicationData(publicationData, campaign.workspaceId)

    // Check for scheduling conflicts
    this.validateSchedulingConflicts(publicationData)

    // Create publication
    const publication = this.publicationRepo.create(publicationData)

    return publication
  }

  /**
   * Reschedule publication with intelligent conflict resolution
   */
  public reschedulePublication(
    publicationId: string,
    newScheduledDate: Date,
    agencyId: string,
    options?: {
      resolveConflicts?: boolean
      suggestAlternatives?: boolean
    }
  ): {
    publication: Publication
    conflicts?: Array<{
      id: string
      scheduledDate: Date
      socialNetwork: SocialNetwork
    }>
    suggestions?: Date[]
  } {
    const publication = this.publicationRepo.findByIdWithContext(publicationId)
    if (!publication) {
      throw new Error('Publication not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        publication.workspace.id,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    // Validate publication can be rescheduled
    if (publication.status !== 'scheduled') {
      throw new Error('Can only reschedule publications with scheduled status')
    }

    // Validate new date is in the future
    if (newScheduledDate <= new Date()) {
      throw new Error('New scheduled date must be in the future')
    }

    // Check for conflicts
    const conflicts = this.findSchedulingConflicts(
      publication.socialNetwork,
      newScheduledDate,
      publication.workspace.id,
      publicationId
    )

    if (conflicts.length > 0 && !options?.resolveConflicts) {
      let suggestions: Date[] = []

      if (options?.suggestAlternatives) {
        suggestions = this.suggestAlternativeSchedules(
          publication.socialNetwork,
          newScheduledDate,
          publication.workspace.id
        )
      }

      return {
        publication,
        conflicts,
        suggestions,
      }
    }

    // Reschedule publication
    const rescheduledPublication = this.publicationRepo.reschedule(
      publicationId,
      newScheduledDate
    )
    if (!rescheduledPublication) {
      throw new Error('Failed to reschedule publication')
    }

    return { publication: rescheduledPublication }
  }

  /**
   * Cancel publication with validation
   */
  public cancelPublication(
    publicationId: string,
    agencyId: string
  ): Publication {
    const publication = this.publicationRepo.findByIdWithContext(publicationId)
    if (!publication) {
      throw new Error('Publication not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        publication.workspace.id,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    // Validate publication can be cancelled
    if (publication.status !== 'scheduled') {
      throw new Error('Can only cancel publications with scheduled status')
    }

    const cancelledPublication = this.publicationRepo.cancel(publicationId)
    if (!cancelledPublication) {
      throw new Error('Failed to cancel publication')
    }

    return cancelledPublication
  }

  /**
   * Get calendar view with optimized queries
   */
  public getCalendarView(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    agencyId: string,
    filters?: {
      socialNetwork?: SocialNetwork
      campaignId?: string
      status?: Publication['status']
    }
  ): {
    publications: Array<
      Publication & {
        campaignName: string
        workspaceName: string
      }
    >
    summary: Array<{
      date: string
      publicationCount: number
      publishedCount: number
      scheduledCount: number
      failedCount: number
    }>
    statistics: {
      totalInRange: number
      scheduledInRange: number
      publishedInRange: number
      failedInRange: number
    }
  } {
    // Validate access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    // Get publications in date range
    let publications = this.publicationRepo.findByDateRange(
      workspaceId,
      startDate,
      endDate
    )

    // Apply filters
    if (filters?.socialNetwork) {
      publications = publications.filter(
        pub => pub.socialNetwork === filters.socialNetwork
      )
    }

    if (filters?.campaignId) {
      publications = publications.filter(
        pub => pub.campaignId === filters.campaignId
      )
    }

    if (filters?.status) {
      publications = publications.filter(pub => pub.status === filters.status)
    }

    // Get calendar summary
    const summary = this.publicationRepo.getCalendarData(
      workspaceId,
      startDate,
      endDate
    )

    // Calculate statistics
    const statistics = {
      totalInRange: publications.length,
      scheduledInRange: publications.filter(pub => pub.status === 'scheduled')
        .length,
      publishedInRange: publications.filter(pub => pub.status === 'published')
        .length,
      failedInRange: publications.filter(pub => pub.status === 'failed').length,
    }

    return {
      publications,
      summary,
      statistics,
    }
  }

  /**
   * Get publications due for publishing
   */
  public getPublicationsDue(
    beforeDate?: Date,
    limit?: number
  ): Array<
    Publication & {
      campaign: { id: string; name: string; workspaceId: string }
      workspace: { id: string; name: string; agencyId: string }
      socialAccount?: { id: string; accountName: string; isConnected: boolean }
    }
  > {
    const duePublications =
      this.publicationRepo.findDueForPublishing(beforeDate)

    if (limit) {
      duePublications.splice(limit)
    }

    return duePublications.map(publication => {
      const context = this.publicationRepo.findByIdWithContext(publication.id)
      if (!context) {
        throw new Error(
          `Failed to get context for publication ${publication.id}`
        )
      }

      // Get social account info
      const socialAccounts = this.socialAccountRepo.findAll(
        {
          workspaceId: context.workspace.id,
          platform: publication.socialNetwork,
          isConnected: true,
        } as any,
        { limit: 1 }
      )

      return {
        ...publication,
        campaign: context.campaign,
        workspace: context.workspace,
        socialAccount: socialAccounts[0]
          ? {
              id: socialAccounts[0].id,
              accountName: socialAccounts[0].accountName,
              isConnected: socialAccounts[0].isConnected,
            }
          : undefined,
      }
    })
  }

  /**
   * Mark publication as published
   */
  public markAsPublished(
    publicationId: string,
    externalPostId: string,
    agencyId: string
  ): Publication {
    const publication = this.publicationRepo.findByIdWithContext(publicationId)
    if (!publication) {
      throw new Error('Publication not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        publication.workspace.id,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    // Validate publication can be marked as published
    if (publication.status !== 'scheduled') {
      throw new Error('Can only mark scheduled publications as published')
    }

    const publishedPublication = this.publicationRepo.markAsPublished(
      publicationId,
      externalPostId
    )
    if (!publishedPublication) {
      throw new Error('Failed to mark publication as published')
    }

    return publishedPublication
  }

  /**
   * Mark publication as failed
   */
  public markAsFailed(
    publicationId: string,
    errorMessage: string,
    agencyId: string
  ): Publication {
    const publication = this.publicationRepo.findByIdWithContext(publicationId)
    if (!publication) {
      throw new Error('Publication not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        publication.workspace.id,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    const failedPublication = this.publicationRepo.markAsFailed(
      publicationId,
      errorMessage
    )
    if (!failedPublication) {
      throw new Error('Failed to mark publication as failed')
    }

    return failedPublication
  }

  /**
   * Bulk reschedule publications
   */
  public bulkReschedule(
    publicationIds: string[],
    newStartDate: Date,
    intervalHours: number,
    agencyId: string
  ): Array<{
    id: string
    oldDate: Date
    newDate: Date
    success: boolean
    error?: string
  }> {
    const results: Array<{
      id: string
      oldDate: Date
      newDate: Date
      success: boolean
      error?: string
    }> = []
    let currentDate = new Date(newStartDate)

    for (const publicationId of publicationIds) {
      try {
        const publication =
          this.publicationRepo.findByIdWithContext(publicationId)
        if (!publication) {
          results.push({
            id: publicationId,
            oldDate: new Date(),
            newDate: currentDate,
            success: false,
            error: 'Publication not found',
          })
          continue
        }

        // Validate access
        if (
          !this.workspaceRepo.validateAgencyOwnership(
            publication.workspace.id,
            agencyId
          )
        ) {
          results.push({
            id: publicationId,
            oldDate: publication.scheduledDate,
            newDate: currentDate,
            success: false,
            error: 'Access denied',
          })
          continue
        }

        const oldDate = publication.scheduledDate
        const rescheduledPublication = this.publicationRepo.reschedule(
          publicationId,
          currentDate
        )

        if (rescheduledPublication) {
          results.push({
            id: publicationId,
            oldDate,
            newDate: currentDate,
            success: true,
          })
        } else {
          results.push({
            id: publicationId,
            oldDate,
            newDate: currentDate,
            success: false,
            error: 'Failed to reschedule',
          })
        }

        // Increment date for next publication
        currentDate = new Date(
          currentDate.getTime() + intervalHours * 60 * 60 * 1000
        )
      } catch (error) {
        results.push({
          id: publicationId,
          oldDate: new Date(),
          newDate: currentDate,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  /**
   * Get publication analytics for workspace
   */
  public getPublicationAnalytics(
    workspaceId: string,
    agencyId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): {
    overview: {
      totalPublications: number
      scheduledPublications: number
      publishedPublications: number
      failedPublications: number
      publicationsThisMonth: number
    }
    byNetwork: Record<
      SocialNetwork,
      {
        total: number
        published: number
        scheduled: number
        failed: number
      }
    >
    timeline: Array<{
      date: string
      published: number
      scheduled: number
      failed: number
    }>
    performance: {
      successRate: number
      averagePublicationsPerDay: number
      mostActiveNetwork: SocialNetwork | null
    }
  } {
    // Validate access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    // Get overview statistics
    const overview = this.publicationRepo.getWorkspaceStatistics(workspaceId)

    // Get publications for analysis
    const startDate =
      dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const endDate = dateRange?.endDate || new Date()

    const publications = this.publicationRepo.findByDateRange(
      workspaceId,
      startDate,
      endDate
    )

    // Calculate by network statistics
    const byNetwork: Record<
      SocialNetwork,
      { total: number; published: number; scheduled: number; failed: number }
    > = {
      facebook: { total: 0, published: 0, scheduled: 0, failed: 0 },
      instagram: { total: 0, published: 0, scheduled: 0, failed: 0 },
      twitter: { total: 0, published: 0, scheduled: 0, failed: 0 },
      linkedin: { total: 0, published: 0, scheduled: 0, failed: 0 },
    }

    publications.forEach(pub => {
      byNetwork[pub.socialNetwork].total++
      if (pub.status === 'published') {
        byNetwork[pub.socialNetwork].published++
      } else if (pub.status === 'scheduled') {
        byNetwork[pub.socialNetwork].scheduled++
      } else if (pub.status === 'failed') {
        byNetwork[pub.socialNetwork].failed++
      }
    })

    // Calculate timeline data
    const timeline = this.calculateTimelineData(
      publications,
      startDate,
      endDate
    )

    // Calculate performance metrics
    const totalAttempted =
      overview.publishedPublications + overview.failedPublications
    const successRate =
      totalAttempted > 0
        ? (overview.publishedPublications / totalAttempted) * 100
        : 0

    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const averagePublicationsPerDay =
      daysDiff > 0 ? publications.length / daysDiff : 0

    const mostActiveNetwork = this.getMostActiveNetwork(byNetwork)

    return {
      overview,
      byNetwork,
      timeline,
      performance: {
        successRate: Math.round(successRate * 100) / 100,
        averagePublicationsPerDay:
          Math.round(averagePublicationsPerDay * 100) / 100,
        mostActiveNetwork,
      },
    }
  }

  /**
   * Suggest optimal publication times
   */
  public suggestOptimalTimes(
    workspaceId: string,
    socialNetwork: SocialNetwork,
    agencyId: string,
    targetDate?: Date
  ): Array<{
    time: Date
    score: number
    reason: string
  }> {
    // Validate access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    const baseDate = targetDate || new Date()
    const suggestions: Array<{ time: Date; score: number; reason: string }> = []

    // Get optimal times based on social network best practices
    const optimalTimes = this.getOptimalTimesByNetwork(socialNetwork)

    for (const timeSlot of optimalTimes) {
      const suggestedTime = new Date(baseDate)
      suggestedTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0)

      // Ensure it's in the future
      if (suggestedTime <= new Date()) {
        suggestedTime.setDate(suggestedTime.getDate() + 1)
      }

      // Check for conflicts
      const conflicts = this.findSchedulingConflicts(
        socialNetwork,
        suggestedTime,
        workspaceId
      )
      const conflictPenalty = conflicts.length * 20 // Reduce score by 20 per conflict

      suggestions.push({
        time: suggestedTime,
        score: Math.max(0, timeSlot.score - conflictPenalty),
        reason:
          conflicts.length > 0
            ? `${timeSlot.reason} (${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''})`
            : timeSlot.reason,
      })
    }

    // Sort by score (highest first)
    return suggestions.sort((a, b) => b.score - a.score)
  }

  // Private helper methods

  private validatePublicationData(
    data: CreatePublicationData,
    workspaceId: string
  ): void {
    // Validate scheduled date is in the future
    if (data.scheduledDate <= new Date()) {
      throw new Error('Scheduled date must be in the future')
    }

    // Validate resource belongs to workspace
    const resource = this.resourceRepo.findById(data.resourceId)
    if (!resource || resource.workspaceId !== workspaceId) {
      throw new Error('Resource not found or access denied')
    }

    // Validate template belongs to workspace
    const template = this.templateRepo.findById(data.templateId)
    if (!template || template.workspaceId !== workspaceId) {
      throw new Error('Template not found or access denied')
    }

    // Validate template supports the social network
    if (!template.socialNetworks.includes(data.socialNetwork)) {
      throw new Error(`Template does not support ${data.socialNetwork}`)
    }

    // Validate content length
    if (!data.content || data.content.trim().length === 0) {
      throw new Error('Publication content cannot be empty')
    }

    // Validate content length by social network
    const maxLengths = {
      twitter: 280,
      instagram: 2200,
      facebook: 63206,
      linkedin: 3000,
    }

    if (data.content.length > maxLengths[data.socialNetwork]) {
      throw new Error(
        `Content exceeds maximum length for ${data.socialNetwork} (${maxLengths[data.socialNetwork]} characters)`
      )
    }
  }

  private validateSchedulingConflicts(data: CreatePublicationData): void {
    const conflicts = this.findSchedulingConflicts(
      data.socialNetwork,
      data.scheduledDate,
      // We need to get workspace ID from campaign
      this.campaignRepo.findById(data.campaignId)?.workspaceId || ''
    )

    if (conflicts.length > 0) {
      throw new Error(
        `Scheduling conflict detected. Another publication is scheduled for ${data.socialNetwork} at ${data.scheduledDate.toISOString()}`
      )
    }
  }

  private findSchedulingConflicts(
    socialNetwork: SocialNetwork,
    scheduledDate: Date,
    workspaceId: string,
    excludePublicationId?: string
  ): Array<{ id: string; scheduledDate: Date; socialNetwork: SocialNetwork }> {
    // Check for publications within 15 minutes of the scheduled time
    const bufferMinutes = 15
    const startTime = new Date(
      scheduledDate.getTime() - bufferMinutes * 60 * 1000
    )
    const endTime = new Date(
      scheduledDate.getTime() + bufferMinutes * 60 * 1000
    )

    const publications = this.publicationRepo.findByDateRange(
      workspaceId,
      startTime,
      endTime
    )

    return publications
      .filter(
        pub =>
          pub.socialNetwork === socialNetwork &&
          pub.status === 'scheduled' &&
          pub.id !== excludePublicationId
      )
      .map(pub => ({
        id: pub.id,
        scheduledDate: pub.scheduledDate,
        socialNetwork: pub.socialNetwork,
      }))
  }

  private suggestAlternativeSchedules(
    socialNetwork: SocialNetwork,
    preferredDate: Date,
    workspaceId: string,
    count: number = 3
  ): Date[] {
    const suggestions: Date[] = []
    const baseDate = new Date(preferredDate)

    // Try different time slots around the preferred date
    const timeOffsets = [30, 60, 90, 120, -30, -60, -90] // minutes

    for (const offset of timeOffsets) {
      if (suggestions.length >= count) break

      const candidateDate = new Date(baseDate.getTime() + offset * 60 * 1000)

      // Skip if in the past
      if (candidateDate <= new Date()) continue

      const conflicts = this.findSchedulingConflicts(
        socialNetwork,
        candidateDate,
        workspaceId
      )

      if (conflicts.length === 0) {
        suggestions.push(candidateDate)
      }
    }

    return suggestions
  }

  private calculateTimelineData(
    publications: Publication[],
    startDate: Date,
    endDate: Date
  ): Array<{
    date: string
    published: number
    scheduled: number
    failed: number
  }> {
    const timeline: Record<
      string,
      { published: number; scheduled: number; failed: number }
    > = {}

    // Initialize all dates in range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      timeline[dateStr] = { published: 0, scheduled: 0, failed: 0 }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Count publications by date and status
    publications.forEach(pub => {
      const dateStr = pub.scheduledDate.toISOString().split('T')[0]
      if (timeline[dateStr]) {
        if (pub.status === 'published') {
          timeline[dateStr].published++
        } else if (pub.status === 'scheduled') {
          timeline[dateStr].scheduled++
        } else if (pub.status === 'failed') {
          timeline[dateStr].failed++
        }
      }
    })

    return Object.entries(timeline).map(([date, counts]) => ({
      date,
      ...counts,
    }))
  }

  private getMostActiveNetwork(
    byNetwork: Record<
      SocialNetwork,
      { total: number; published: number; scheduled: number; failed: number }
    >
  ): SocialNetwork | null {
    let maxTotal = 0
    let mostActive: SocialNetwork | null = null

    for (const [network, stats] of Object.entries(byNetwork)) {
      if (stats.total > maxTotal) {
        maxTotal = stats.total
        mostActive = network as SocialNetwork
      }
    }

    return mostActive
  }

  private getOptimalTimesByNetwork(socialNetwork: SocialNetwork): Array<{
    hour: number
    minute: number
    score: number
    reason: string
  }> {
    const optimalTimes = {
      facebook: [
        { hour: 9, minute: 0, score: 90, reason: 'Peak morning engagement' },
        { hour: 13, minute: 0, score: 85, reason: 'Lunch break activity' },
        { hour: 15, minute: 0, score: 80, reason: 'Afternoon engagement' },
      ],
      instagram: [
        { hour: 11, minute: 0, score: 95, reason: 'Peak visual content time' },
        { hour: 14, minute: 0, score: 90, reason: 'Afternoon scroll time' },
        { hour: 17, minute: 0, score: 85, reason: 'Evening engagement' },
      ],
      twitter: [
        { hour: 8, minute: 0, score: 90, reason: 'Morning news consumption' },
        { hour: 12, minute: 0, score: 85, reason: 'Lunch break browsing' },
        { hour: 19, minute: 0, score: 80, reason: 'Evening discussion time' },
      ],
      linkedin: [
        {
          hour: 8,
          minute: 30,
          score: 95,
          reason: 'Professional morning routine',
        },
        { hour: 12, minute: 0, score: 85, reason: 'Business lunch break' },
        {
          hour: 17,
          minute: 30,
          score: 80,
          reason: 'End of workday networking',
        },
      ],
    }

    return optimalTimes[socialNetwork]
  }

  /**
   * Regenerate publication content with history tracking
   */
  public regeneratePublication(
    publicationId: string,
    newContent: string,
    newImageUrls: string[],
    newMetadata: GenerationMetadata,
    agencyId: string,
    customPrompt?: string,
    reason: 'user_request' | 'error_recovery' | 'content_improvement' = 'user_request'
  ): Publication {
    const publication = this.publicationRepo.findByIdWithContext(publicationId)
    if (!publication) {
      throw new Error('Publication not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        publication.workspace.id,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    // Validate publication can be regenerated
    if (publication.status === 'published') {
      throw new Error('Cannot regenerate a published publication')
    }

    // Store previous content in history
    const historyData: CreateRegenerationHistoryData = {
      publicationId,
      previousContent: publication.content,
      previousImageUrls: publication.generatedImageUrls || [],
      previousMetadata: publication.generationMetadata,
      newContent,
      newImageUrls,
      newMetadata,
      customPrompt,
      reason,
      regeneratedAt: new Date()
    }

    // Create regeneration history record
    this.createRegenerationHistory(historyData)

    // Update publication with new content
    const updateData: UpdatePublicationData = {
      content: newContent,
      generatedText: newContent,
      generatedImageUrls: newImageUrls,
      generationMetadata: newMetadata,
      generationStatus: 'completed'
    }

    const updatedPublication = this.publicationRepo.update(publicationId, updateData)
    if (!updatedPublication) {
      throw new Error('Failed to update publication')
    }

    return updatedPublication
  }

  /**
   * Get regeneration history for a publication
   */
  public getRegenerationHistory(
    publicationId: string,
    agencyId: string
  ): RegenerationHistory[] {
    const publication = this.publicationRepo.findByIdWithContext(publicationId)
    if (!publication) {
      throw new Error('Publication not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        publication.workspace.id,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    return this.getRegenerationHistoryByPublicationId(publicationId)
  }

  /**
   * Create regeneration history record
   */
  private createRegenerationHistory(data: CreateRegenerationHistoryData): RegenerationHistory {
    // This would be implemented in the repository layer
    // For now, return a placeholder
    const history: RegenerationHistory = {
      id: `regen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    console.log('📝 Creating regeneration history:', history)
    // TODO: Implement actual database insertion
    
    return history
  }

  /**
   * Get regeneration history by publication ID
   */
  private getRegenerationHistoryByPublicationId(publicationId: string): RegenerationHistory[] {
    console.log(`📊 Getting regeneration history for publication: ${publicationId}`)
    // TODO: Implement actual database query
    // For now, return empty array
    return []
  }

  /**
   * Get regeneration statistics for workspace
   */
  public getRegenerationStatistics(
    workspaceId: string,
    agencyId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): {
    totalRegenerations: number
    regenerationsByReason: Record<string, number>
    mostRegeneratedPublications: Array<{
      publicationId: string
      campaignName: string
      regenerationCount: number
      lastRegeneratedAt: Date
    }>
    regenerationTrends: Array<{
      date: string
      count: number
    }>
  } {
    // Validate access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    // TODO: Implement actual statistics calculation
    console.log(`📊 Getting regeneration statistics for workspace: ${workspaceId}`)
    
    return {
      totalRegenerations: 0,
      regenerationsByReason: {
        user_request: 0,
        error_recovery: 0,
        content_improvement: 0
      },
      mostRegeneratedPublications: [],
      regenerationTrends: []
    }
  }

  /**
   * Get publication with full context (campaign, workspace, etc.)
   */
  public async getPublicationWithContext(
    publicationId: string,
    agencyId: string
  ): Promise<Publication & {
    campaign: { id: string; name: string; resources?: any[]; templates?: any[] }
    workspace: { id: string; name: string; agencyId: string; branding: any }
  } | null> {
    const publication = this.publicationRepo.findByIdWithContext(publicationId)
    if (!publication) {
      return null
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        publication.workspace.id,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    return publication as any
  }

  /**
   * Update publication generation status
   */
  public async updatePublicationStatus(
    publicationId: string,
    status: 'pending' | 'generating' | 'completed' | 'failed',
    agencyId: string
  ): Promise<void> {
    const publication = this.publicationRepo.findByIdWithContext(publicationId)
    if (!publication) {
      throw new Error('Publication not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        publication.workspace.id,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    const updateData: UpdatePublicationData = {
      generationStatus: status
    }

    this.publicationRepo.update(publicationId, updateData)
  }

  /**
   * Get publication by ID with access validation
   */
  public async getPublicationById(
    publicationId: string,
    agencyId: string
  ): Promise<Publication | null> {
    const publication = this.publicationRepo.findByIdWithContext(publicationId)
    if (!publication) {
      return null
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        publication.workspace.id,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    return publication
  }
}
