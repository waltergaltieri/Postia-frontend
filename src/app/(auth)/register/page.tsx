'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/common'
import { registerSchema, type RegisterFormData } from '@/utils/validations'
import { toast } from 'react-hot-toast'

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password')

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' }

    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    const labels = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte']
    const colors = [
      'bg-error-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-green-500',
      'bg-green-600',
    ]

    return {
      score,
      label: labels[score - 1] || '',
      color: colors[score - 1] || 'bg-secondary-300',
    }
  }

  const passwordStrength = getPasswordStrength(password || '')

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock registration validation
      // Check if email already exists (simulate)
      if (data.email === 'admin@postia.com') {
        setError('email', {
          message: 'Este email ya está registrado',
        })
        return
      }

      // Simulate successful registration
      toast.success('¡Registro exitoso! Ahora puedes iniciar sesión.')
      router.push('/login')
    } catch (error) {
      setError('root', {
        message: 'Error de conexión. Inténtalo de nuevo.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg mb-6">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          <h2 className="text-3xl font-bold text-secondary-900 mb-2">
            Únete a Postia
          </h2>
          <p className="text-secondary-600">
            Crea tu cuenta y comienza a generar contenido con IA
          </p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-secondary-100 p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <Input
                {...register('agencyName')}
                type="text"
                label="Nombre de la Agencia"
                placeholder="Mi Agencia de Marketing"
                error={errors.agencyName?.message}
                required
                autoComplete="organization"
              />

              <Input
                {...register('email')}
                type="email"
                label="Email"
                placeholder="tu@email.com"
                error={errors.email?.message}
                required
                autoComplete="email"
              />

              <div>
                <Input
                  {...register('password')}
                  type="password"
                  label="Contraseña"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  required
                  autoComplete="new-password"
                />

                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-secondary-600 mb-1">
                      <span>Fortaleza de la contraseña</span>
                      <span className="font-medium">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-secondary-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color} ${
                          passwordStrength.score === 1
                            ? 'w-1/5'
                            : passwordStrength.score === 2
                              ? 'w-2/5'
                              : passwordStrength.score === 3
                                ? 'w-3/5'
                                : passwordStrength.score === 4
                                  ? 'w-4/5'
                                  : passwordStrength.score === 5
                                    ? 'w-full'
                                    : 'w-0'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Input
                {...register('confirmPassword')}
                type="password"
                label="Confirmar Contraseña"
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                required
                autoComplete="new-password"
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
              Crear Cuenta
            </Button>

            <div className="text-center">
              <p className="text-sm text-secondary-600">
                ¿Ya tienes cuenta?{' '}
                <Link
                  href="/login"
                  className="text-primary-600 hover:text-primary-500 hover:underline font-medium"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>

            {/* Terms and conditions */}
            <div className="text-center">
              <p className="text-xs text-secondary-500">
                Al crear una cuenta, aceptas nuestros{' '}
                <a href="#" className="text-primary-600 hover:underline">
                  Términos de Servicio
                </a>{' '}
                y{' '}
                <a href="#" className="text-primary-600 hover:underline">
                  Política de Privacidad
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
