'use client'

import React, { useState } from 'react'
import { getValidatedGeminiConfig } from '@/lib/ai/config/gemini-config'

export const GeminiTestComponent: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testGeminiConnection = async () => {
    setIsLoading(true)
    setTestResult('Probando conexión con Gemini...')

    try {
      // Verificar configuración
      const config = getValidatedGeminiConfig()
      setTestResult(prev => prev + '\n✅ Configuración válida')

      // Hacer una llamada de prueba simple
      const response = await fetch(
        `${config.baseUrl}/models/${config.defaultModel}:generateContent?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'Responde solo con "OK" si puedes leer este mensaje.'
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 10,
            }
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta'
      
      setTestResult(prev => prev + '\n✅ Conexión exitosa con Gemini')
      setTestResult(prev => prev + `\n📝 Respuesta: ${responseText}`)

    } catch (error) {
      console.error('Error en prueba de Gemini:', error)
      setTestResult(prev => prev + `\n❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Prueba de Conexión Gemini</h3>
      
      <button
        onClick={testGeminiConnection}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Probando...' : 'Probar Conexión'}
      </button>

      {testResult && (
        <div className="mt-4 p-3 bg-white border rounded">
          <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
    </div>
  )
}