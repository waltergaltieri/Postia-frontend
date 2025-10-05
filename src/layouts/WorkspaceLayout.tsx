'use client'

import React, { ReactNode, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Dropdown } from '@/components/common'
import { cn } from '@/utils'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  HiHome,
  HiPhotograph,
  HiTemplate,
  HiSpeakerphone,
  HiCalendar,
  HiColorSwatch,
  HiCog,
  HiMenu,
  HiX,
  HiChevronDown,
  HiLogout,
  HiUser,
  HiOfficeBuilding,
  HiChevronRight,
} from 'react-icons/hi'

interface WorkspaceLayoutProps {
  children: ReactNode
  workspaceId: string
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
}

interface BreadcrumbItem {
  name: string
  href?: string
  current?: boolean
}

export function WorkspaceLayout({
  children,
  workspaceId,
}: WorkspaceLayoutProps) {
  const { user, logout } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Generate navigation items based on current workspace
  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: `/workspace/${workspaceId}/dashboard`,
      icon: HiHome,
      current: pathname === `/workspace/${workspaceId}/dashboard`,
    },
    {
      name: 'Recursos',
      href: `/workspace/${workspaceId}/resources`,
      icon: HiPhotograph,
      current: pathname === `/workspace/${workspaceId}/resources`,
    },
    {
      name: 'Templates',
      href: `/workspace/${workspaceId}/templates`,
      icon: HiTemplate,
      current: pathname === `/workspace/${workspaceId}/templates`,
    },
    {
      name: 'Campañas',
      href: `/workspace/${workspaceId}/campaigns`,
      icon: HiSpeakerphone,
      current: pathname.startsWith(`/workspace/${workspaceId}/campaigns`),
    },
    {
      name: 'Calendario',
      href: `/workspace/${workspaceId}/calendar`,
      icon: HiCalendar,
      current: pathname === `/workspace/${workspaceId}/calendar`,
    },
    {
      name: 'Branding',
      href: `/workspace/${workspaceId}/branding`,
      icon: HiColorSwatch,
      current: pathname === `/workspace/${workspaceId}/branding`,
    },
    {
      name: 'Configuración',
      href: `/workspace/${workspaceId}/settings`,
      icon: HiCog,
      current: pathname === `/workspace/${workspaceId}/settings`,
    },
  ]

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Dashboard Agencia', href: '/dashboard' },
    ]

    if (currentWorkspace) {
      breadcrumbs.push({
        name: currentWorkspace.name,
        href: `/workspace/${workspaceId}/dashboard`,
      })

      // Add specific page breadcrumb based on pathname
      const pathSegments = pathname.split('/').filter(Boolean)
      const lastSegment = pathSegments[pathSegments.length - 1]

      switch (lastSegment) {
        case 'dashboard':
          breadcrumbs.push({ name: 'Dashboard', current: true })
          break
        case 'resources':
          breadcrumbs.push({ name: 'Recursos', current: true })
          break
        case 'templates':
          breadcrumbs.push({ name: 'Templates', current: true })
          break
        case 'campaigns':
          breadcrumbs.push({ name: 'Campañas', current: true })
          break
        case 'new':
          if (pathname.includes('/campaigns/')) {
            breadcrumbs.push({
              name: 'Campañas',
              href: `/workspace/${workspaceId}/campaigns`,
            })
            breadcrumbs.push({ name: 'Nueva Campaña', current: true })
          }
          break
        case 'calendar':
          breadcrumbs.push({ name: 'Calendario', current: true })
          break
        case 'branding':
          breadcrumbs.push({ name: 'Branding', current: true })
          break
        case 'settings':
          breadcrumbs.push({ name: 'Configuración', current: true })
          break
        default:
          breadcrumbs.push({ name: 'Página', current: true })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada correctamente')
    router.push('/login')
  }

  const handleWorkspaceSelect = (selectedWorkspaceId: string) => {
    if (selectedWorkspaceId !== workspaceId) {
      const workspace = workspaces.find(w => w.id === selectedWorkspaceId)
      if (workspace) {
        switchWorkspace(selectedWorkspaceId)
        toast.success(`Cambiando a: ${workspace.name}`)
        router.push(`/workspace/${selectedWorkspaceId}/dashboard`)
      }
    }
  }

  const workspaceOptions = workspaces.map(workspace => ({
    value: workspace.id,
    label: workspace.name,
    icon: <HiOfficeBuilding className="h-4 w-4 text-secondary-500" />,
  }))

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-secondary-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-secondary-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
            </div>
            <span className="ml-2 text-lg font-semibold text-secondary-900">
              Postia
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md text-secondary-400 hover:text-secondary-500 hover:bg-secondary-100"
            aria-label="Cerrar menú"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace info in mobile sidebar */}
        {currentWorkspace && (
          <div className="px-4 py-3 border-b border-secondary-200 bg-secondary-50">
            <p className="text-xs font-medium text-secondary-500 uppercase tracking-wide">
              Espacio de Trabajo
            </p>
            <p className="text-sm font-medium text-secondary-900 truncate">
              {currentWorkspace.name}
            </p>
          </div>
        )}

        <nav className="mt-5 px-2">
          {navigation.map(item => (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1',
                item.current
                  ? 'bg-primary-100 text-primary-900'
                  : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5',
                  item.current
                    ? 'text-primary-500'
                    : 'text-secondary-400 group-hover:text-secondary-500'
                )}
              />
              {item.name}
            </a>
          ))}
        </nav>

        {/* Back to Agency Dashboard link in mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-secondary-200">
          <a
            href="/dashboard"
            className="flex items-center text-sm text-secondary-600 hover:text-secondary-900"
          >
            <HiHome className="mr-2 h-4 w-4" />
            Dashboard de Agencia
          </a>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-secondary-200 shadow-sm">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-secondary-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
              </div>
              <span className="ml-2 text-lg font-semibold text-secondary-900">
                Postia
              </span>
            </div>
          </div>

          {/* Workspace info */}
          {currentWorkspace && (
            <div className="px-4 py-3 border-b border-secondary-200 bg-secondary-50">
              <p className="text-xs font-medium text-secondary-500 uppercase tracking-wide">
                Espacio de Trabajo
              </p>
              <p className="text-sm font-medium text-secondary-900 truncate">
                {currentWorkspace.name}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map(item => (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                  item.current
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5',
                    item.current
                      ? 'text-primary-500'
                      : 'text-secondary-400 group-hover:text-secondary-500'
                  )}
                />
                {item.name}
              </a>
            ))}
          </nav>

          {/* Back to Agency Dashboard */}
          <div className="p-4 border-t border-secondary-200">
            <a
              href="/dashboard"
              className="flex items-center text-sm text-secondary-600 hover:text-secondary-900"
            >
              <HiHome className="mr-2 h-4 w-4" />
              Dashboard de Agencia
            </a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-secondary-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-secondary-400 hover:text-secondary-500 hover:bg-secondary-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <HiMenu className="h-5 w-5" />
            </button>

            {/* Workspace selector */}
            <div className="flex-1 max-w-xs lg:max-w-sm ml-4 lg:ml-0">
              <Dropdown
                options={workspaceOptions}
                value={workspaceId}
                placeholder="Seleccionar espacio de trabajo"
                onSelect={handleWorkspaceSelect}
                searchable
              />
            </div>

            {/* User menu */}
            <div className="relative ml-4">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-md text-secondary-700 hover:text-secondary-900 hover:bg-secondary-100"
              >
                <div className="h-8 w-8 bg-secondary-200 rounded-full flex items-center justify-center">
                  <HiUser className="h-4 w-4 text-secondary-600" />
                </div>
                <span className="hidden sm:block text-sm font-medium">
                  {user?.email}
                </span>
                <HiChevronDown className="h-4 w-4" />
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-secondary-200 py-1 z-20">
                  <div className="px-4 py-2 border-b border-secondary-200">
                    <p className="text-sm font-medium text-secondary-900">
                      {user?.email}
                    </p>
                    <p className="text-xs text-secondary-500">
                      Administrador de Agencia
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                  >
                    <HiLogout className="mr-3 h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="bg-white border-b border-secondary-200 px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              {breadcrumbs.map((item, index) => (
                <li key={item.name}>
                  <div className="flex items-center">
                    {index > 0 && (
                      <HiChevronRight className="flex-shrink-0 h-4 w-4 text-secondary-400 mr-2" />
                    )}
                    {item.current ? (
                      <span className="text-sm font-medium text-secondary-900">
                        {item.name}
                      </span>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm font-medium text-secondary-500 hover:text-secondary-700"
                      >
                        {item.name}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </nav>
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
