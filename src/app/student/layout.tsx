import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { StudentLayoutWrapper } from '@/components/layout/StudentLayoutWrapper'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== 'STUDENT') {
    redirect('/login')
  }

  return (
    <StudentLayoutWrapper
      userName={session.user.name || 'Student'}
      userEmail={session.user.email || ''}
    >
      {children}
    </StudentLayoutWrapper>
  )
}
