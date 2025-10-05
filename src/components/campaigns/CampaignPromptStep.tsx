'use client'

import React, { useState, useEffect } from 'react'
import { useGetResourcesQuery } from '@/store/api/resourcesApi'
import { useGetTemplatesQuery } from '@/store/api/templatesApi'
import { cn } from '@/utils'
import {
  HiSparkles,
  HiLightBulb,
  HiExclamationCircle,
  HiPhotograph,
  HiViewGrid,
  HiCheckCircle,
} from 'react-icons/hi'

interface CampaignPromptStepProps {
  workspaceId: string
  initialData: {
    prompt: string
  }
  selectedResources: string[]
  selectedTemplates: string[]
  contentType: 'unified' | 'optimized'
  onNext: (data: { prompt: string }) => void
  onBack: () => void
}

const PROMPT_SUGGESTIONS = {
  unified: [
    'Crea contenido atractivo y profesional que destaque los beneficios de nuestros productos/servicios, usando un tono cercano y motivador.',
    'Genera publicaciones que conecten emocionalmente con nuestra audiencia, mostrando cómo nuestros productos mejoran su vida diaria.',
    'Desarrolla contenido educativo e inspirador que posicione nuestra marca como experta en el sector, con llamadas a la acción claras.',
    'Crea posts que generen engagement y conversación, destacando testimonios de clientes y casos de éxito reales.',
  ],
  optimized: [
    'Para Facebook: Contenido que genere conversación y engagement. Para Instagram: Visual atractivo con hashtags relevantes. Para LinkedIn: Profesional y educativo.',
    'Facebook: Posts que inviten a compartir experiencias. Instagram: Contenido visual inspirador con stories. LinkedIn: Insights del sector y liderazgo de pensamiento.',
    'Facebook: Contenido comunitario y testimonios. Instagram: Lifestyle y behind-the-scenes. LinkedIn: Contenido B2B y networking profesional.',
  ],
}

const CONTENT_TYPE_GUIDANCE = {
  unified: {
    title: 'Contenido Unificado',
    description:
      'El mismo mensaje se adaptará automáticamente para todas las redes sociales seleccionadas.',
    tips: [
      'Usa un tono versátil que funcione en todas las plataformas',
      'Enfócate en el mensaje principal sin referencias específicas a la red social',
      'Incluye elementos que generen engagement universal',
    ],
  },
  optimized: {
    title: 'Contenido Optimizado',
    description:
      'Se generará contenido específico y optimizado para cada red social seleccionada.',
    tips: [
      'Puedes ser más específico sobre el tipo de contenido para cada plataforma',
      'Menciona diferentes tonos o enfoques para cada red social',
      'Considera las características únicas de cada plataforma',
    ],
  },
}

export function CampaignPromptStep({
  workspaceId,
  initialData,
  selectedResources,
  selectedTemplates,
  contentType,
  onNext,
  onBack,
}: CampaignPromptStepProps) {
  const [prompt, setPrompt] = useState(initialData.prompt)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Fetch selected resources and templates for preview
  const { data: resourcesData } = useGetResourcesQuery({ workspaceId })
  const { data: templatesData } = useGetTemplatesQuery({ workspaceId })

  const resources =
    resourcesData?.data?.filter(r => selectedResources.includes(r.id)) || []
  const templates =
    templatesData?.data?.filter(t => selectedTemplates.includes(t.id)) || []

  // Validation
  const isValid = prompt.trim().length >= 50
  const characterCount = prompt.length
  const minCharacters = 50

  const handlePromptChange = (value: string) => {
    setPrompt(value)
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setPrompt(suggestion)
    setShowSuggestions(false)
  }

  const handleNext = () => {
    if (isValid) {
      onNext({ prompt: prompt.trim() })
    }
  }

  const guidance = CONTENT_TYPE_GUIDANCE[contentType]
  const suggestions = PROMPT_SUGGESTIONS[contentType]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-secondary-900 mb-2 flex items-center gap-2">
          <HiSparkles className="w-6 h-6 text-primary-600" />
          Configuración del Prompt de IA
        </h2>
        <p className="text-secondary-600">
          Define las instrucciones para que la IA genere contenido personalizado
          para tu campaña.
        </p>
      </div>

      {/* Content Type Guidance */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <HiLightBulb className="w-5 h-5 text-primary-600 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-primary-900 mb-2">
              {guidance.title}
            </h3>
            <p className="text-primary-800 mb-3">{guidance.description}</p>
            <ul className="space-y-1">
              {guidance.tips.map((tip, index) => (
                <li
                  key={index}
                  className="text-sm text-primary-700 flex items-start gap-2"
                >
                  <span className="w-1 h-1 bg-primary-600 rounded-full mt-2 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* AI Prompt Interface */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-lg font-medium text-secondary-900">
            Prompt para la IA
          </label>
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <HiLightBulb className="w-4 h-4" />
            {showSuggestions ? 'Ocultar sugerencias' : 'Ver sugerencias'}
          </button>
        </div>

        {/* Prompt Suggestions */}
        {showSuggestions && (
          <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-secondary-900">
              Sugerencias de prompts:
            </h4>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full text-left p-3 bg-white border border-secondary-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-sm text-secondary-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={e => handlePromptChange(e.target.value)}
            placeholder="Describe cómo quieres que la IA genere el contenido para tu campaña. Sé específico sobre el tono, estilo, mensaje principal y cualquier información importante que deba incluir..."
            rows={6}
            className={cn(
              'w-full p-4 border rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors',
              isValid
                ? 'border-secondary-200'
                : characterCount > 0
                  ? 'border-warning-300 bg-warning-50'
                  : 'border-secondary-200'
            )}
          />

          {/* Character count */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {isValid && <HiCheckCircle className="w-4 h-4 text-success-500" />}
            <span
              className={cn(
                'text-xs font-medium',
                isValid
                  ? 'text-success-600'
                  : characterCount > 0
                    ? 'text-warning-600'
                    : 'text-secondary-500'
              )}
            >
              {characterCount}/{minCharacters} min
            </span>
          </div>
        </div>

        {/* Validation message */}
        {!isValid && characterCount > 0 && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <HiExclamationCircle className="w-4 h-4 text-warning-600 mt-0.5" />
              <p className="text-sm text-warning-700">
                El prompt debe tener al menos {minCharacters} caracteres para
                generar contenido de calidad. Faltan{' '}
                {minCharacters - characterCount} caracteres.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-secondary-900">
          Resumen de Selección
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selected Resources Preview */}
          <div className="bg-white border border-secondary-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <HiPhotograph className="w-5 h-5 text-primary-600" />
              <h4 className="font-medium text-secondary-900">
                Recursos Seleccionados
              </h4>
              <span className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">
                {resources.length}
              </span>
            </div>

            {resources.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {resources.slice(0, 6).map(resource => (
                  <div key={resource.id} className="aspect-square relative">
                    <img
                      src={resource.url}
                      alt={resource.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                ))}
                {resources.length > 6 && (
                  <div className="aspect-square bg-secondary-100 rounded-md flex items-center justify-center">
                    <span className="text-xs text-secondary-600 font-medium">
                      +{resources.length - 6}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-secondary-500">
                No hay recursos seleccionados
              </p>
            )}
          </div>

          {/* Selected Templates Preview */}
          <div className="bg-white border border-secondary-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <HiViewGrid className="w-5 h-5 text-primary-600" />
              <h4 className="font-medium text-secondary-900">
                Templates Seleccionados
              </h4>
              <span className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">
                {templates.length}
              </span>
            </div>

            {templates.length > 0 ? (
              <div className="space-y-2">
                {templates.slice(0, 3).map(template => (
                  <div
                    key={template.id}
                    className="flex items-center gap-3 p-2 bg-secondary-50 rounded-md"
                  >
                    <div className="w-8 h-8 bg-secondary-200 rounded flex items-center justify-center">
                      {template.type === 'carousel' ? (
                        <HiViewGrid className="w-4 h-4 text-secondary-600" />
                      ) : (
                        <HiPhotograph className="w-4 h-4 text-secondary-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 truncate">
                        {template.name}
                      </p>
                      <p className="text-xs text-secondary-500 capitalize">
                        {template.type === 'carousel'
                          ? 'Carrusel'
                          : 'Imagen única'}
                      </p>
                    </div>
                  </div>
                ))}
                {templates.length > 3 && (
                  <div className="text-center py-2">
                    <span className="text-xs text-secondary-500">
                      y {templates.length - 3} más...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-secondary-500">
                No hay templates seleccionados
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between pt-6 border-t border-secondary-200">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isValid}
          className={cn(
            'px-6 py-2 text-sm font-medium rounded-lg transition-colors',
            isValid
              ? 'text-white bg-primary-600 hover:bg-primary-700'
              : 'text-secondary-400 bg-secondary-100 cursor-not-allowed'
          )}
        >
          Crear Campaña
        </button>
      </div>
    </div>
  )
}
