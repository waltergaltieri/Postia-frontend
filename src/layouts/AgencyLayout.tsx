'use client'

import React, { ReactNode, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Dropdown } from '@/components/common'
import { cn } from '@/utils'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  HiHome,
  HiCog,
  HiMenu,
  HiX,
  HiChevronDown,
  HiLogout,
  HiUser,
  HiOfficeBuilding,
} from 'react-icons/hi'

interface AgencyLayoutProps {
  children: ReactNode
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HiHome, current: true },
  { name: 'Configuración de Agencia', href: '/agency-settings', icon: HiCog },
]

export function AgencyLayout({ children }: AgencyLayoutProps) {
  const { user, logout } = useAuth()
  const { workspaces, switchWorkspace } = useWorkspace()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada correctamente')
    router.push('/login')
  }

  const handleWorkspaceSelect = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (workspace) {
      switchWorkspace(workspaceId)
      toast.success(`Cambiando a: ${workspace.name}`)
      router.push(`/workspace/${workspaceId}/dashboard`)
    }
  }

  const workspaceOptions = workspaces.map(workspace => ({
    value: workspace.id,
    label: workspace.name,
    icon: <HiOfficeBuilding className="h-4 w-4 text-secondary-500" />,
  }))

  return (
    <div className="min-h-screen bg-secondary-50/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden border-r border-secondary-100',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-secondary-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-9 w-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">P</span>
              </div>
            </div>
            <span className="ml-3 text-xl font-bold text-secondary-900">
              Postia
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-all duration-200"
            aria-label="Cerrar menú"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-4">
          {navigation.map(item => (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-4 py-3 text-sm font-medium rounded-xl mb-2 transition-all duration-200',
                item.current
                  ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-600 shadow-sm'
                  : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5',
                  item.current
                    ? 'text-primary-600'
                    : 'text-secondary-400 group-hover:text-secondary-600'
                )}
              />
              {item.name}
            </a>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-secondary-100 shadow-lg">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-secondary-100 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-9 w-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
              </div>
              <span className="ml-3 text-xl font-bold text-secondary-900">
                Postia
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex-1 px-4 space-y-2">
            {navigation.map(item => (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                  item.current
                    ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-600 shadow-sm'
                    : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5',
                    item.current
                      ? 'text-primary-600'
                      : 'text-secondary-400 group-hover:text-secondary-600'
                  )}
                />
                {item.name}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow-sm border-b border-secondary-100">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 lg:hidden transition-all duration-200"
              aria-label="Abrir menú"
            >
              <HiMenu className="h-5 w-5" />
            </button>

            {/* Workspace selector */}
            <div className="flex-1 max-w-xs lg:max-w-sm ml-4 lg:ml-0">
              <Dropdown
                options={workspaceOptions}
                placeholder="Seleccionar espacio de trabajo"
                onSelect={handleWorkspaceSelect}
                searchable
              />
            </div>

            {/* User menu */}
            <div className="relative ml-4">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-2 rounded-lg text-secondary-700 hover:text-secondary-900 hover:bg-secondary-100 transition-all duration-200"
              >
                <div className="h-9 w-9 bg-gradient-to-br from-secondary-200 to-secondary-300 rounded-full flex items-center justify-center shadow-sm">
                  <HiUser className="h-4 w-4 text-secondary-600" />
                </div>
                <span className="hidden sm:block text-sm font-medium">
                  {user?.email}
                </span>
                <HiChevronDown className="h-4 w-4" />
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-secondary-100 py-2 z-20">
                  <div className="px-4 py-3 border-b border-secondary-100">
                    <p className="text-sm font-medium text-secondary-900">
                      {user?.email}
                    </p>
                    <p className="text-xs text-secondary-500 mt-1">
                      Administrador de Agencia
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-sm text-secondary-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                  >
                    <HiLogout className="mr-3 h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>

      {/* Click outside handler for user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  )
}
