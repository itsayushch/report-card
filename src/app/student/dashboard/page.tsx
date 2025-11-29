'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Link from 'next/link'
import { FileText, TrendingUp, User, GraduationCap, Award } from 'lucide-react'

interface DashboardData {
  student: {
    id: string
    name: string
    rollNo: string
    class: string
    section: string
    email: string
    photo: string | null
    academicYear: string
    promotionStatus: string
  }
  activeYear: {
    year: string
    terms: Array<{ name: string }>
  } | null
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/student/dashboard')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Failed to load dashboard data</div>
      </div>
    )
  }

  const initials = data.student.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Welcome, {data.student.name}! Here's your academic overview.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-indigo-600 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900">{data.student.name}</h2>
              <p className="text-gray-500 mt-1">
                Roll No: {data.student.rollNo} • Class: {data.student.class}-{data.student.section}
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <Badge variant="secondary">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {data.student.academicYear}
                </Badge>
                <Badge
                  className={
                    data.student.promotionStatus === 'PROMOTED'
                      ? 'bg-green-100 text-green-700'
                      : data.student.promotionStatus === 'DETAINED'
                      ? 'bg-red-100 text-red-700'
                      : ''
                  }
                >
                  {data.student.promotionStatus === 'PENDING' ? 'PROMOTION' : ''} {data.student.promotionStatus}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/student/report-card" target="_blank">
                <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  View Report Card
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Term Summary */}


      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/student/report-card" className="block" target="_blank">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Report Cards</h3>
                <p className="text-sm text-gray-500 mt-1">
                  View your term reports
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/performance" className="block">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Performance</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Track your progress
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/profile" className="block">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">My Profile</h3>
                <p className="text-sm text-gray-500 mt-1">
                  View profile details
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Academic Year Info */}
      {data.activeYear && (
        <Card>
          <CardHeader>
            <CardTitle>Current Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.activeYear.year}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {data.activeYear.terms.length} terms
                </p>
              </div>
              <div className="flex gap-2">
                {data.activeYear.terms.map((term) => (
                  <Badge key={term.name} variant="outline">
                    {term.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
