import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, GraduationCap, BookOpen, Calendar, ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/stats`, {
    cache: 'no-store',
  })
  
  if (!response.ok) {
    return {
      totalStudents: 0,
      totalTeachers: 0,
      activeAcademicYear: 'Not set',
    }
  }
  
  return response.json()
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const statCards = [
    {
      title: 'Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      href: '/admin/students',
      description: 'Total enrolled'
    },
    {
      title: 'Teachers',
      value: stats.totalTeachers,
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      href: '/admin/teachers',
      description: 'Teaching staff'
    },
    {
      title: 'Academic Year',
      value: stats.activeAcademicYear,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      href: '/admin/academic-years',
      description: 'Current session'
    },
  ]

  const quickActions = [
    { title: 'Manage Students', href: '/admin/students', icon: Users, description: 'Add, edit, or view student records' },
    { title: 'Manage Teachers', href: '/admin/teachers', icon: GraduationCap, description: 'Handle staff and assignments' },
    { title: 'Academic Years', href: '/admin/academic-years', icon: Calendar, description: 'Set up terms and sessions' },
    { title: 'Publish Reports', href: '/admin/reports', icon: TrendingUp, description: 'Manage report card publishing' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to St. Helen&apos;s School Management System</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className={`border ${card.borderColor} ${card.title === 'Academic Year' ? 'hidden md:block' : ''}`}>
              <CardContent className="px-4 py-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{card.title}</p>
                    <p className="text-2xl font-bold leading-none">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${card.bgColor} shrink-0`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription>Navigate to key management sections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.title} href={action.href}>
                  <div className="group flex items-start gap-3 rounded-lg border p-4 hover:bg-accent hover:shadow-sm transition-all cursor-pointer">
                    <div className="p-2 rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium leading-none">{action.title}</p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
