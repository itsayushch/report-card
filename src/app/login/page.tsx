import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import { auth } from '@/lib/auth'

function getDashboardByRole(role: string) {
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'TEACHER') return '/teacher/dashboard'
  return '/student/dashboard'
}

export default async function LoginPage() {
  const session = await auth()

  if (session?.user?.role) {
    redirect(getDashboardByRole(session.user.role))
  }

  return <LoginForm />
}
