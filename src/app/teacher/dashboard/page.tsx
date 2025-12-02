'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, BookOpen, GraduationCap, ClipboardEdit } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatClass } from '@/lib/class-utils'

interface TeacherStats {
  totalStudents: number
  totalClasses: number
  totalSubjects: number
  studentCounts: { class: string; count: number }[]
}

interface Subject {
  id: string
  name: string
  maxMarks: number
  passingMarks: number
}

interface RecentMark {
  id: string
  marks: number
  grade: string
  term: string
  createdAt: string
  student: {
    name: string
    rollNo: string
    class: string
  }
  subject: {
    name: string
  }
}

export default function TeacherDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TeacherStats | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [recentMarks, setRecentMarks] = useState<RecentMark[]>([])
  const [activeYear, setActiveYear] = useState<string>('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teacher/dashboard')
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const data = await response.json()
      setStats(data.stats)
      setSubjects(data.teacher.subjects)
      setRecentMarks(data.recentMarks)
      setActiveYear(data.activeYear?.year || '')
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b">
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Academic Year: {activeYear || 'Not set'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
            <p className="text-xs text-gray-500">Across all your classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <GraduationCap className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClasses || 0}</div>
            <p className="text-xs text-gray-500">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSubjects || 0}</div>
            <p className="text-xs text-gray-500">You are teaching</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/teacher/marks-entry">
              <ClipboardEdit className="mr-2 h-4 w-4" />
              Enter Marks
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teacher/analytics">View Analytics</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Assigned Classes */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stats?.studentCounts.map((item) => (
              <div
                key={item.class}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">Class {formatClass(item.class)}</p>
                  <p className="text-sm text-gray-500">{item.count} students</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subjects */}
      <Card>
        <CardHeader>
          <CardTitle>Your Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{subject.name}</p>
                  <p className="text-sm text-gray-500">Max: {subject.maxMarks} | Pass: {subject.passingMarks}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Marks Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Marks Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMarks.length > 0 ? (
            <div className="space-y-3">
              {recentMarks.map((mark) => (
                <div
                  key={mark.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {mark.student.name} ({mark.student.rollNo})
                    </p>
                    <p className="text-sm text-gray-500">
                      {mark.subject.name} • {mark.term} • Class {formatClass(mark.student.class)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {mark.marks} ({mark.grade})
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(mark.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No marks entries yet. Start entering marks for your students.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
