import React from 'react'
import toast, { Toaster, ToastOptions } from 'react-hot-toast'
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiXCircle,
} from 'react-icons/hi'
import { cn } from '@/utils'

// Custom toast component
interface CustomToastProps {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

const CustomToast: React.FC<CustomToastProps> = ({ message, type }) => {
  const icons = {
    success: <HiCheckCircle className="h-5 w-5 text-success-500" />,
    error: <HiXCircle className="h-5 w-5 text-error-500" />,
    info: <HiInformationCircle className="h-5 w-5 text-primary-500" />,
    warning: <HiExclamationCircle className="h-5 w-5 text-warning-500" />,
  }

  const bgColors = {
    success: 'bg-success-50 border-success-200',
    error: 'bg-error-50 border-error-200',
    info: 'bg-primary-50 border-primary-200',
    warning: 'bg-warning-50 border-warning-200',
  }

  const textColors = {
    success: 'text-success-800',
    error: 'text-error-800',
    info: 'text-primary-800',
    warning: 'text-warning-800',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border shadow-soft max-w-md',
        bgColors[type]
      )}
    >
      {icons[type]}
      <p className={cn('text-sm font-medium', textColors[type])}>{message}</p>
    </div>
  )
}

// Toast utility functions
const defaultOptions: ToastOptions = {
  duration: 4000,
  position: 'top-right',
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.custom(<CustomToast message={message} type="success" />, {
      ...defaultOptions,
      ...options,
    })
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.custom(<CustomToast message={message} type="error" />, {
      ...defaultOptions,
      duration: 6000,
      ...options,
    })
  },

  info: (message: string, options?: ToastOptions) => {
    return toast.custom(<CustomToast message={message} type="info" />, {
      ...defaultOptions,
      ...options,
    })
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast.custom(<CustomToast message={message} type="warning" />, {
      ...defaultOptions,
      duration: 5000,
      ...options,
    })
  },

  // Promise-based toast for async operations
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: ToastOptions
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: data => {
          const message =
            typeof messages.success === 'function'
              ? messages.success(data)
              : messages.success
          return <CustomToast message={message} type="success" />
        },
        error: error => {
          const message =
            typeof messages.error === 'function'
              ? messages.error(error)
              : messages.error
          return <CustomToast message={message} type="error" />
        },
      },
      { ...defaultOptions, ...options }
    )
  },

  // Dismiss all toasts
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId)
  },

  // Remove all toasts
  remove: (toastId?: string) => {
    toast.remove(toastId)
  },
}

// Toast provider component
export interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        gutter={8}
        containerClassName="toast-container"
        containerStyle={{
          top: 20,
          right: 20,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
            margin: 0,
          },
        }}
      />
    </>
  )
}

// Hook for using toast in components
export const useToast = () => {
  return showToast
}
