import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

  // Fetch teacher profile picture
  const teacher = await prisma.teacher.findUnique({
    where: { id: session.user.id },
    select: { profilePicture: true },
  })

  return (
    <TeacherLayoutWrapper
      userName={session.user.name || 'Teacher'}
      userEmail={session.user.email || ''}
      profilePicture={teacher?.profilePicture || null}
    >
      {children}
    </TeacherLayoutWrapper>
  )
}
