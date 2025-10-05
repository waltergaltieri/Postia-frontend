'use client'

import React, { useState } from 'react'
import { Button, Input, Modal, Dropdown, useToast } from '@/components/common'
import { ResourceGallery } from '@/components/resources/ResourceGallery'
import { Resource } from '@/types'
import { HiPlus, HiUser, HiMail } from 'react-icons/hi'

const demoOptions = [
  { value: 'option1', label: 'Opción 1', icon: <HiUser className="h-4 w-4" /> },
  { value: 'option2', label: 'Opción 2', icon: <HiMail className="h-4 w-4" /> },
  { value: 'option3', label: 'Opción 3 (Deshabilitada)', disabled: true },
  { value: 'option4', label: 'Opción 4' },
]

// Mock resources for demo
const mockResources: Resource[] = [
  {
    id: '1',
    workspaceId: 'demo-workspace',
    name: 'Logo Demo',
    url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop',
    type: 'image',
    size: 245760,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    workspaceId: 'demo-workspace',
    name: 'Producto Hero',
    url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
    type: 'image',
    size: 512000,
    createdAt: new Date('2024-01-14'),
  },
]

export default function DemoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')
  const [dropdownValue, setDropdownValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resources, setResources] = useState<Resource[]>(mockResources)
  const toast = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Simple validation
    if (value && value.length < 3) {
      setInputError('Debe tener al menos 3 caracteres')
    } else {
      setInputError('')
    }
  }

  const handleAsyncAction = async () => {
    setIsLoading(true)

    // Simulate async operation
    const promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.3) {
          resolve('Operación completada exitosamente')
        } else {
          reject(new Error('Error simulado'))
        }
      }, 2000)
    })

    toast.promise(promise, {
      loading: 'Procesando...',
      success: 'Operación completada',
      error: 'Error en la operación',
    })

    try {
      await promise
    } catch (error) {
      // Error handled by toast
    } finally {
      setIsLoading(false)
    }
  }

  const handleResourceEdit = (id: string) => {
    const resource = resources.find(r => r.id === id)
    if (resource) {
      const newName = window.prompt('Nuevo nombre:', resource.name)
      if (newName && newName !== resource.name) {
        setResources(prev =>
          prev.map(r => (r.id === id ? { ...r, name: newName } : r))
        )
        toast.success('Recurso actualizado')
      }
    }
  }

  const handleResourceDelete = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id))
    toast.success('Recurso eliminado')
  }

  const handleResourceUpload = async (
    files: { name: string; file: File }[]
  ) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Create new resources from uploaded files
    const newResources: Resource[] = files.map((fileData, index) => ({
      id: `demo-${Date.now()}-${index}`,
      workspaceId: 'demo-workspace',
      name: fileData.name,
      url: URL.createObjectURL(fileData.file),
      type: fileData.file.type.startsWith('image/') ? 'image' : 'video',
      size: fileData.file.size,
      createdAt: new Date(),
    }))

    setResources(prev => [...newResources, ...prev])
    toast.success(`${files.length} recurso(s) subido(s) exitosamente`)
  }

  return (
    <div className="min-h-screen bg-secondary-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-secondary-900 mb-8">
          Demo de Componentes Base
        </h1>

        {/* Button Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">
            Botones
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-soft">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-secondary-600">
                  Variantes
                </h3>
                <Button variant="primary">Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="danger">Peligro</Button>
                <Button variant="ghost">Fantasma</Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-secondary-600">
                  Tamaños
                </h3>
                <Button size="sm">Pequeño</Button>
                <Button size="md">Mediano</Button>
                <Button size="lg">Grande</Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-secondary-600">
                  Estados
                </h3>
                <Button loading={isLoading}>
                  {isLoading ? 'Cargando...' : 'Con Loading'}
                </Button>
                <Button disabled>Deshabilitado</Button>
                <Button icon={<HiPlus />}>Con Icono</Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-secondary-600">
                  Acciones
                </h3>
                <Button onClick={() => toast.success('¡Éxito!')}>
                  Toast Éxito
                </Button>
                <Button
                  variant="danger"
                  onClick={() => toast.error('Error simulado')}
                >
                  Toast Error
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => toast.info('Información')}
                >
                  Toast Info
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => toast.warning('Advertencia')}
                >
                  Toast Warning
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Input Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">
            Inputs
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-soft">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="Input básico"
                  placeholder="Escribe algo..."
                  value={inputValue}
                  onChange={handleInputChange}
                  error={inputError}
                />

                <Input
                  label="Email requerido"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  helperText="Ingresa un email válido"
                />

                <Input
                  label="Input deshabilitado"
                  value="No editable"
                  disabled
                />
              </div>

              <div className="space-y-4">
                <Input
                  label="Password"
                  type="password"
                  placeholder="Tu contraseña"
                  size="lg"
                />

                <Input
                  label="Input pequeño"
                  size="sm"
                  placeholder="Tamaño pequeño"
                />

                <Input
                  label="Con error"
                  error="Este campo tiene un error"
                  placeholder="Input con error"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Dropdown Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">
            Dropdowns
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-soft">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Dropdown
                  label="Dropdown básico"
                  options={demoOptions}
                  value={dropdownValue}
                  onSelect={setDropdownValue}
                  placeholder="Selecciona una opción"
                />

                <Dropdown
                  label="Con búsqueda"
                  options={demoOptions}
                  onSelect={value => console.log('Selected:', value)}
                  searchable
                  placeholder="Buscar y seleccionar"
                />
              </div>

              <div className="space-y-4">
                <Dropdown
                  label="Requerido"
                  options={demoOptions}
                  onSelect={value => console.log('Selected:', value)}
                  required
                  placeholder="Campo requerido"
                />

                <Dropdown
                  label="Con error"
                  options={demoOptions}
                  onSelect={value => console.log('Selected:', value)}
                  error="Debes seleccionar una opción"
                  placeholder="Dropdown con error"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Modal Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">
            Modal
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-soft">
            <div className="space-x-4">
              <Button onClick={() => setIsModalOpen(true)}>Abrir Modal</Button>

              <Button
                variant="secondary"
                onClick={handleAsyncAction}
                loading={isLoading}
              >
                Acción Async con Toast
              </Button>
            </div>
          </div>
        </section>

        {/* Resource Gallery Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">
            Galería de Recursos
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-soft">
            <ResourceGallery
              resources={resources}
              onResourceEdit={handleResourceEdit}
              onResourceDelete={handleResourceDelete}
              onResourceUpload={handleResourceUpload}
              workspaceId="demo-workspace"
            />
          </div>
        </section>

        {/* Modal Component */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Modal de Demostración"
          size="md"
        >
          <div className="p-6">
            <p className="text-secondary-600 mb-4">
              Este es un modal de demostración. Puedes cerrarlo haciendo clic en
              la X, presionando Escape, o haciendo clic fuera del modal.
            </p>

            <div className="space-y-4">
              <Input label="Campo en modal" placeholder="Escribe algo..." />

              <Dropdown
                label="Dropdown en modal"
                options={demoOptions}
                onSelect={value => console.log('Modal dropdown:', value)}
                placeholder="Selecciona"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  toast.success('Modal guardado')
                  setIsModalOpen(false)
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
