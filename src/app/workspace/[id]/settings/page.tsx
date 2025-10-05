'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { WorkspaceLayout } from '@/layouts'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Button } from '@/components/common'
import { toast } from 'react-hot-toast'
import {
  HiCog,
  HiTrash,
  HiExclamationCircle,
  HiCheckCircle,
  HiXCircle,
  HiExternalLink,
  HiRefresh,
} from 'react-icons/hi'
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin } from 'react-icons/fa'
import type { SocialNetwork, SocialAccount } from '@/types'

const socialNetworkConfig = {
  facebook: {
    name: 'Facebook',
    icon: FaFacebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  instagram: {
    name: 'Instagram',
    icon: FaInstagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
  twitter: {
    name: 'Twitter',
    icon: FaTwitter,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: FaLinkedin,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
}

export default function WorkspaceSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string
  const {
    currentWorkspace,
    switchWorkspace,
    workspaces,
    updateWorkspace,
    removeWorkspace,
  } = useWorkspace()

  const [isConnecting, setIsConnecting] = useState<
    Record<SocialNetwork, boolean>
  >({
    facebook: false,
    instagram: false,
    twitter: false,
    linkedin: false,
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Ensure we have the correct workspace selected
  useEffect(() => {
    if (
      workspaceId &&
      (!currentWorkspace || currentWorkspace.id !== workspaceId)
    ) {
      const workspace = workspaces.find(w => w.id === workspaceId)
      if (workspace) {
        switchWorkspace(workspaceId)
      }
    }
  }, [workspaceId, currentWorkspace, switchWorkspace, workspaces])

  const handleConnectSocial = async (platform: SocialNetwork) => {
    setIsConnecting(prev => ({ ...prev, [platform]: true }))

    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update workspace with new social account
      const newSocialAccount: SocialAccount = {
        id: `${platform}-${Date.now()}`,
        platform,
        accountId: `${platform}_account_${Math.random().toString(36).substr(2, 9)}`,
        accountName: `Mi Cuenta ${socialNetworkConfig[platform].name}`,
        isConnected: true,
        connectedAt: new Date(),
      }

      const updatedSocialAccounts = [
        ...currentWorkspace!.socialAccounts.filter(
          acc => acc.platform !== platform
        ),
        newSocialAccount,
      ]

      await updateWorkspace(workspaceId, {
        socialAccounts: updatedSocialAccounts,
      })

      toast.success(
        `${socialNetworkConfig[platform].name} conectado exitosamente`
      )
    } catch (error) {
      console.error(`Error connecting ${platform}:`, error)
      toast.error(`Error al conectar ${socialNetworkConfig[platform].name}`)
    } finally {
      setIsConnecting(prev => ({ ...prev, [platform]: false }))
    }
  }

  const handleDisconnectSocial = async (platform: SocialNetwork) => {
    try {
      const updatedSocialAccounts = currentWorkspace!.socialAccounts.filter(
        acc => acc.platform !== platform
      )

      await updateWorkspace(workspaceId, {
        socialAccounts: updatedSocialAccounts,
      })

      toast.success(`${socialNetworkConfig[platform].name} desconectado`)
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error)
      toast.error(`Error al desconectar ${socialNetworkConfig[platform].name}`)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (deleteConfirmText !== currentWorkspace?.name) {
      toast.error('El nombre del espacio de trabajo no coincide')
      return
    }

    setIsDeleting(true)
    try {
      await removeWorkspace(workspaceId)
      toast.success('Espacio de trabajo eliminado exitosamente')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error deleting workspace:', error)
      toast.error('Error al eliminar el espacio de trabajo')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const getSocialAccountByPlatform = (
    platform: SocialNetwork
  ): SocialAccount | undefined => {
    return currentWorkspace?.socialAccounts.find(
      acc => acc.platform === platform && acc.isConnected
    )
  }

  const allSocialConnected = Object.keys(socialNetworkConfig).every(platform =>
    getSocialAccountByPlatform(platform as SocialNetwork)
  )

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">
            Cargando espacio de trabajo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId}>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900">
              Configuración del Espacio
            </h1>
            <p className="text-secondary-600 mt-2">
              Gestiona las conexiones y configuración de {currentWorkspace.name}
            </p>
          </div>

          <div className="space-y-8">
            {/* Social Media Connections */}
            <div className="bg-white rounded-xl shadow-sm border border-secondary-100 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <HiCog className="h-5 w-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-secondary-900">
                  Conexiones de Redes Sociales
                </h2>
              </div>

              {/* Connection Status Summary */}
              {allSocialConnected && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <HiCheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-green-800 font-medium">
                      ¡Todas las redes sociales están conectadas!
                    </p>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    Ya puedes programar publicaciones en todas las plataformas.
                  </p>
                </div>
              )}

              {/* Social Networks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(socialNetworkConfig) as SocialNetwork[]).map(
                  platform => {
                    const config = socialNetworkConfig[platform]
                    const account = getSocialAccountByPlatform(platform)
                    const isConnected = !!account
                    const isLoading = isConnecting[platform]
                    const IconComponent = config.icon

                    return (
                      <div
                        key={platform}
                        className={`border rounded-lg p-4 transition-all duration-200 ${
                          isConnected
                            ? `${config.bgColor} ${config.borderColor} border-2`
                            : 'border-secondary-200 hover:border-secondary-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-lg ${isConnected ? 'bg-white' : 'bg-secondary-100'}`}
                            >
                              <IconComponent
                                className={`h-6 w-6 ${isConnected ? config.color : 'text-secondary-500'}`}
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-secondary-900">
                                {config.name}
                              </h3>
                              {isConnected ? (
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                    <span className="text-sm text-secondary-600">
                                      {account.accountName}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-secondary-500">
                                  No conectado
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {isConnected ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDisconnectSocial(platform)
                                  }
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <HiXCircle className="h-4 w-4 mr-1" />
                                  Desconectar
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConnectSocial(platform)}
                                loading={isLoading}
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <>
                                    <HiRefresh className="h-4 w-4 mr-1 animate-spin" />
                                    Conectando...
                                  </>
                                ) : (
                                  <>
                                    <HiExternalLink className="h-4 w-4 mr-1" />
                                    Conectar
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {isConnected && account.connectedAt && (
                          <div className="mt-3 pt-3 border-t border-secondary-200">
                            <p className="text-xs text-secondary-500">
                              Conectado el{' '}
                              {new Date(account.connectedAt).toLocaleDateString(
                                'es-ES',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                }
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  }
                )}
              </div>

              {/* Connection Instructions */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  ¿Cómo funciona la conexión?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Al hacer clic en "Conectar", se enviará un enlace de
                    autorización
                  </li>
                  <li>
                    • Deberás autorizar el acceso desde la plataforma
                    correspondiente
                  </li>
                  <li>
                    • Una vez conectado, podrás programar publicaciones
                    automáticamente
                  </li>
                </ul>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <HiExclamationCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-red-900">
                  Zona de Peligro
                </h2>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">
                  Eliminar Espacio de Trabajo
                </h3>
                <p className="text-red-800 text-sm mb-4">
                  Esta acción eliminará permanentemente el espacio de trabajo "
                  {currentWorkspace.name}" y todos sus datos asociados
                  (campañas, recursos, templates, etc.). Esta acción no se puede
                  deshacer.
                </p>

                <Button
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <HiTrash className="h-4 w-4 mr-2" />
                  Eliminar Espacio de Trabajo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <HiExclamationCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900">
                Confirmar Eliminación
              </h3>
            </div>

            <p className="text-secondary-600 mb-4">
              Para confirmar la eliminación, escribe el nombre del espacio de
              trabajo:
            </p>

            <div className="mb-4">
              <p className="text-sm font-medium text-secondary-700 mb-2">
                Nombre del espacio:{' '}
                <span className="font-bold">{currentWorkspace.name}</span>
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Escribe el nombre del espacio"
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteWorkspace}
                loading={isDeleting}
                disabled={
                  deleteConfirmText !== currentWorkspace.name || isDeleting
                }
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <HiTrash className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  )
}
