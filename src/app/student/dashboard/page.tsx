'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatClass } from '@/lib/class-utils'

interface DashboardData {
  student: {
    id: string
    name: string
    regNo: string
    class: string
    email: string
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
      // Check if we have cached data
      const cachedData = sessionStorage.getItem('student-dashboard-data')
      const cacheTimestamp = sessionStorage.getItem('student-dashboard-timestamp')
      
      // Use cache if it's less than 5 minutes old
      if (cachedData && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp)
        if (age < 5 * 60 * 1000) { // 5 minutes
          setData(JSON.parse(cachedData))
          setLoading(false)
          return
        }
      }

      // Fetch fresh data
      const response = await fetch('/api/student/dashboard')
      
      if (response.status === 404) {
        setData(null)
        setLoading(false)
        return
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const result = await response.json()
      setData(result)
      
      // Cache the data
      sessionStorage.setItem('student-dashboard-data', JSON.stringify(result))
      sessionStorage.setItem('student-dashboard-timestamp', Date.now().toString())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-9 w-64" />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <User className="h-16 w-16 text-gray-300" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No Student Found</h3>
                <p className="text-sm text-gray-500 mt-1">No student record exists for this account.</p>
                <p className="text-sm text-gray-500">Please contact your administrator for assistance.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = data?.student?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || ''


  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {data?.student?.name}!</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-indigo-600 text-white text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{data.student.name}</h2>
                <p className="text-gray-600 mt-1">
                  Class {formatClass(data.student.class)} • Reg. Number: {data.student.regNo}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Badge variant="secondary" className="font-medium">
                  <Calendar className="h-3 w-3 mr-1" />
                  {data.student.academicYear}
                </Badge>
                <Badge
                  className={
                    data.student.promotionStatus === 'PROMOTED'
                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                      : data.student.promotionStatus === 'DETAINED'
                      ? 'bg-red-100 text-red-700 hover:bg-red-100'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                  }
                >
                  {data.student.promotionStatus === 'PENDING' ? 'Promotion Pending' : data.student.promotionStatus}
                </Badge>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

    </div>
  )
}
