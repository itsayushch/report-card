import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminLayoutWrapper } from '@/components/layout/AdminLayoutWrapper'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <AdminLayoutWrapper
      userName={session.user.name || 'Admin'}
      userEmail={session.user.email || ''}
    >
      {children}
    </AdminLayoutWrapper>
  )
}
