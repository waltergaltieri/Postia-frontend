import { PublicRoute } from '@/components/auth'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PublicRoute>
      <div className="min-h-screen bg-secondary-50">{children}</div>
    </PublicRoute>
  )
}
