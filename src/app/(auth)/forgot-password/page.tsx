'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button, Input } from '@/components/common'
import { z } from 'zod'
import { toast } from 'react-hot-toast'

// Schema for forgot password form
const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setError,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock email validation - check if email exists
      const validEmails = ['admin@postia.com', 'user@example.com']

      if (!validEmails.includes(data.email)) {
        setError('email', {
          message: 'No encontramos una cuenta con este email',
        })
        return
      }

      // Simulate successful email sending
      setIsSuccess(true)
      toast.success('Email de recuperación enviado')
    } catch (error) {
      setError('root', {
        message: 'Error de conexión. Inténtalo de nuevo.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            {/* Success icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-3xl font-bold text-secondary-900 mb-2">
              Email Enviado
            </h2>
            <p className="text-secondary-600 mb-6">
              Hemos enviado las instrucciones de recuperación a{' '}
              <span className="font-medium text-secondary-900">
                {getValues('email')}
              </span>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Próximos pasos:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Revisa tu bandeja de entrada</li>
              <li>• Busca en la carpeta de spam si no lo encuentras</li>
              <li>
                • Haz clic en el enlace del email para restablecer tu contraseña
              </li>
              <li>• El enlace expira en 24 horas</li>
            </ul>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setIsSuccess(false)}
              variant="secondary"
              className="w-full"
              size="lg"
            >
              Enviar de Nuevo
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-primary-600 hover:text-primary-500 hover:underline font-medium"
              >
                ← Volver al Inicio de Sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-secondary-900">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600">
            Ingresa tu email y te enviaremos las instrucciones para restablecer
            tu contraseña
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Input
              {...register('email')}
              type="email"
              label="Email"
              placeholder="tu@email.com"
              error={errors.email?.message}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          {errors.root && (
            <div className="rounded-lg bg-error-50 p-4">
              <p className="text-sm text-error-600">{errors.root.message}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={isLoading}
            size="lg"
          >
            {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-primary-600 hover:text-primary-500 hover:underline font-medium"
            >
              ← Volver al Inicio de Sesión
            </Link>
          </div>

          {/* Development helper */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-medium mb-2">
              Emails de prueba:
            </p>
            <p className="text-xs text-blue-600">admin@postia.com</p>
            <p className="text-xs text-blue-600">user@example.com</p>
          </div>
        </form>
      </div>
    </div>
  )
}
