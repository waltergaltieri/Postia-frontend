'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/common'
import { loginSchema, type LoginFormData } from '@/utils/validations'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)

    try {
      const success = await login(data.email, data.password)

      if (success) {
        toast.success('¡Bienvenido a Postia!')
        router.push('/dashboard')
      } else {
        setError('root', {
          message: 'Credenciales inválidas. Usa admin@agency.com / password123',
        })
      }
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
            Bienvenido a Postia
          </h2>
          <p className="text-secondary-600">
            Inicia sesión para acceder a tu cuenta
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-secondary-100 p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <Input
                {...register('email')}
                type="email"
                label="Email"
                placeholder="tu@email.com"
                error={errors.email?.message}
                required
                autoComplete="email"
              />

              <Input
                {...register('password')}
                type="password"
                label="Contraseña"
                placeholder="••••••••"
                error={errors.password?.message}
                required
                autoComplete="current-password"
              />
            </div>

            {errors.root && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700">{errors.root.message}</p>
              </div>
            )}

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              size="lg"
            >
              Iniciar Sesión
            </Button>
          </form>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-secondary-600">
            ¿No tienes cuenta?{' '}
            <Link
              href="/register"
              className="text-primary-600 hover:text-primary-700 hover:underline font-semibold transition-colors duration-200"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>

        {/* Development helper */}
        <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-200">
          <p className="text-xs text-primary-700 font-semibold mb-2">
            Credenciales de prueba (Agencia Demo):
          </p>
          <p className="text-xs text-primary-600">Email: admin@agency.com</p>
          <p className="text-xs text-primary-600">Contraseña: password123</p>
          <p className="text-xs text-primary-500 mt-1">
            También disponibles: member@agency.com, designer@agency.com
          </p>
        </div>
      </div>
    </div>
  )
}
