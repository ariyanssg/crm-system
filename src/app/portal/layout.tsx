import { PortalSidebar } from '@/components/layouts/portal-sidebar'
import { PortalHeader } from '@/components/layouts/portal-header'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PortalSidebar />
      <div className="ml-64">
        <PortalHeader />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
