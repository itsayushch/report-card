'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Download, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { formatClass } from '@/lib/class-utils'

interface AcademicYear {
  year: string
  isActive: boolean
}

export default function MarksSheetPage() {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [classTeacherInfo, setClassTeacherInfo] = useState<{
    isClassTeacher: boolean
    class?: string
    message?: string
  } | null>(null)
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [statusRes, yearsRes] = await Promise.all([
        fetch('/api/teacher/class-teacher-status'),
        fetch('/api/academic-years'),
      ])

      if (!statusRes.ok) {
        throw new Error('Failed to fetch class teacher status')
      }

      const statusData = await statusRes.json()
      setClassTeacherInfo(statusData)

      if (yearsRes.ok) {
        const yearsData = await yearsRes.json()
        const active = (yearsData.academicYears || []).find((year: AcademicYear) => year.isActive)
        setActiveYear(active || null)
      }
    } catch (error) {
      toast.error('Failed to load marks sheet details')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!activeYear?.year) {
      toast.error('Active academic year not found')
      return
    }

    try {
      setExporting(true)
      const response = await fetch(`/api/teacher/marks-sheet?academicYear=${activeYear.year}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to download marks sheet')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `class_${classTeacherInfo?.class || 'class'}_marks_${activeYear.year}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast.error(error.message || 'Failed to download marks sheet')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Marks Sheet</CardTitle>
            <CardDescription>Loading details...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing page
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!classTeacherInfo?.isClassTeacher) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Marks Sheet</CardTitle>
            <CardDescription>
              {classTeacherInfo?.message || 'You are not assigned as a class teacher.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Marks Sheet</h1>
        <p className="text-gray-500 mt-1">
          Class {formatClass(classTeacherInfo.class || '')} • {activeYear?.year || 'Year not set'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Download Full Marks Sheet</CardTitle>
          <CardDescription>
            Download an Excel Sheet with all students and their marks across every term.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownload} disabled={exporting} className="gap-2">
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download XLSX
              </>
            )}
          </Button>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <FileSpreadsheet className="h-4 w-4" />
            Opens in Excel, Numbers, or Google Sheets.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
