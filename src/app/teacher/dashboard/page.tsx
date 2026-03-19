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
    regNo: string
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
  // const [recentMarks, setRecentMarks] = useState<RecentMark[]>([])
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
      setSubjects(data.teacher.subjects || [])
      // setRecentMarks(data.recentMarks)
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
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Teacher Dashboard</h1>
        <p className="text-slate-500 mt-1">Academic Year: {activeYear || 'Not set'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">TOTAL STUDENTS</p>
                <p className="text-3xl font-semibold mt-1 text-slate-900">{stats?.totalStudents || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Across classes assigned</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">CLASSES</p>
                <p className="text-3xl font-semibold mt-1 text-slate-900">{stats?.totalClasses || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Assigned to you</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">SUBJECTS</p>
                <p className="text-3xl font-semibold mt-1 text-slate-900">{stats?.totalSubjects || 0}</p>
                <p className="text-xs text-slate-500 mt-1">You are teaching</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="secondary" className="gap-2 bg-white text-slate-900 border-slate-200 hover:bg-slate-100">
            <Link href="/teacher/marks-entry">
              <ClipboardEdit className="h-4 w-4" />
              Enter Marks
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Assigned Classes */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Assigned Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stats?.studentCounts.map((item) => (
              <div
                key={item.class}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white"
              >
                <div>
                  <p className="font-medium text-slate-900">Class {formatClass(item.class)}</p>
                  <p className="text-sm text-slate-500">{item.count} students</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subjects */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Your Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white"
              >
                <div>
                  <p className="font-medium text-slate-900">{subject.name}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Marks Entries
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
                      {mark.student.name} ({mark.student.regNo})
                    </p>
                    <p className="text-sm text-gray-500">
                      {getSubjectById(mark.student.class, mark.subject.name)?.name || 'Unknown Subject'} • {mark.term} • Class {formatClass(mark.student.class)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {mark.marks} / {getTermsForClass(mark.student.class).find(term => term.name === mark.term)?.maxMarks || 'N/A'}
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
      </Card> */}
    </div>
  )
}
