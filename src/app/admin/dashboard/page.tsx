import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, GraduationCap, BookOpen, Calendar } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

async function getStats() {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/stats`, {
    cache: 'no-store',
  })
  
  if (!response.ok) {
    return {
      totalStudents: 0,
      totalTeachers: 0,
      totalSubjects: 0,
      activeAcademicYear: 'Not set',
    }
  }
  
  return response.json()
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/admin/students',
    },
    {
      title: 'Total Teachers',
      value: stats.totalTeachers,
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      href: '/admin/teachers',
    },
    {
      title: 'Total Subjects',
      value: stats.totalSubjects,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      href: '/admin/subjects',
    },
    {
      title: 'Academic Year',
      value: stats.activeAcademicYear,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '/admin/academic-years',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of St. Helen&apos;s School</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <Link href={card.href}>
                  <Button variant="link" className="px-0 mt-2 text-indigo-600">
                    View Details →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/students">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Students
              </Button>
            </Link>
            <Link href="/admin/teachers">
              <Button variant="outline" className="w-full justify-start">
                <GraduationCap className="mr-2 h-4 w-4" />
                Manage Teachers
              </Button>
            </Link>
            <Link href="/admin/subjects">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Subjects
              </Button>
            </Link>
            <Link href="/admin/academic-years">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Manage Academic Years
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Academic Year:</span>
              <span className="font-medium">{stats.activeAcademicYear}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Students:</span>
              <span className="font-medium">{stats.totalStudents}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Teaching Staff:</span>
              <span className="font-medium">{stats.totalTeachers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subjects Offered:</span>
              <span className="font-medium">{stats.totalSubjects}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to St. Helen&apos;s School</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This is the admin dashboard for the Report Card Management System. 
            Use the navigation menu to manage students, teachers, subjects, and academic years. 
            All changes are saved automatically to the database.
          </p>
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-sm font-medium text-indigo-900">Part 1 Features:</p>
            <ul className="mt-2 text-sm text-indigo-700 space-y-1 list-disc list-inside">
              <li>Student Management with search and filters</li>
              <li>Teacher Management with subject assignments</li>
              <li>Subject Management with validation</li>
              <li>Academic Year Management with terms</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
