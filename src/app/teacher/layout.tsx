import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { TeacherLayoutWrapper } from '@/components/layout/TeacherLayoutWrapper'

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== 'TEACHER') {
    redirect('/login')
  }

  return (
    <TeacherLayoutWrapper
      userName={session.user.name || 'Teacher'}
      userEmail={session.user.email || ''}
    >
      {children}
    </TeacherLayoutWrapper>
  )
}
