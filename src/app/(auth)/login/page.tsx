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
    setValue,
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

  // Quick access functions
  const fillCredentials = (email: string, password: string) => {
    setValue('email', email)
    setValue('password', password)
  }

  const quickLogin = async (email: string, password: string) => {
    fillCredentials(email, password)
    await onSubmit({ email, password })
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

          {/* Quick Access Buttons */}
          <div className="mt-6 pt-6 border-t border-secondary-200">
            <p className="text-sm font-semibold text-secondary-700 mb-3 text-center">
              🚀 Acceso Rápido (Desarrollo)
            </p>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-left justify-start"
                onClick={() => quickLogin('admin-cq2z7t@miagencia.com', 'password123')}
                disabled={isLoading}
              >
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="font-medium text-green-700">✨ Cuenta Limpia (Recomendada)</div>
                    <div className="text-xs text-secondary-500">admin-cq2z7t@miagencia.com</div>
                  </div>
                  <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    0 templates
                  </div>
                </div>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-left justify-start"
                onClick={() => quickLogin('admin-dcr96g@miagencia.com', 'password123')}
                disabled={isLoading}
              >
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="font-medium text-blue-700">📊 Cuenta Original</div>
                    <div className="text-xs text-secondary-500">admin-dcr96g@miagencia.com</div>
                  </div>
                  <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Con datos
                  </div>
                </div>
              </Button>
            </div>
            
            <div className="mt-3 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fillCredentials('admin-cq2z7t@miagencia.com', 'password123')}
                disabled={isLoading}
                className="text-xs"
              >
                Solo llenar campos (cuenta limpia)
              </Button>
            </div>
          </div>
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

        {/* Development Info */}
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-xs text-amber-700 font-semibold mb-2">
            💡 Información de Desarrollo:
          </p>
          <p className="text-xs text-amber-600">
            • Cuenta limpia: Perfecta para pruebas desde cero
          </p>
          <p className="text-xs text-amber-600">
            • Cuenta original: Con datos existentes para comparar
          </p>
          <p className="text-xs text-amber-500 mt-1">
            Los botones de acceso rápido son temporales para desarrollo
          </p>
        </div>
      </div>
    </div>
  )
}
