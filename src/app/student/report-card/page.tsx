'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Download, Printer, Loader2, FileX, Eye, Lock } from 'lucide-react'
import { generateReportCardPDF } from '@/lib/pdf-generator'
import { getGradeColor } from '@/lib/calculations'

interface ReportData {
  student: {
    name: string
    rollNo: string
    class: string
    section: string
    photo?: string
  }
  academicYear: string
  term: string
  marks: Array<{
    subject: string
    subjectCode: string
    maxMarks: number
    obtainedMarks: number
    grade: string
    remarks: string
  }>
  summary: {
    totalObtained: number
    totalMax: number
    percentage: number
    gpa: number
    result: string
  }
  promotionStatus: string
  isPublished: boolean
}

interface TermReport {
  term: string
  data: ReportData | null
  isPublished: boolean
  loading: boolean
}

export default function ReportCardPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [studentId, setStudentId] = useState<string>('')
  const [termReports, setTermReports] = useState<TermReport[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedYear && studentId) {
      fetchAllReports()
    }
  }, [selectedYear, studentId])

  const fetchInitialData = async () => {
    try {
      const results = await Promise.allSettled([
        fetch('/api/academic-years'),
        fetch('/api/student/dashboard'),
      ])

      if (results[0].status === 'fulfilled' && results[1].status === 'fulfilled') {
        const yearsData = await results[0].value.json()
        const dashboard = await results[1].value.json()

        const years = yearsData.academicYears || []
        setAcademicYears(years)
        setStudentId(dashboard.student.id)

        const activeYear = years.find((y: any) => y.isActive)
        if (activeYear) {
          setSelectedYear(activeYear.year)
        }
      } else {
        toast.error('Failed to fetch initial data')
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error)
      toast.error('Failed to fetch initial data')
    }
  }

  const fetchAllReports = async () => {
    setLoading(true)
    
    const selectedYearData = academicYears.find((y) => y.year === selectedYear)
    if (!selectedYearData || !selectedYearData.terms) {
      setLoading(false)
      return
    }

    const terms = selectedYearData.terms.map((t: any) => t.name)
    
    // Initialize term reports
    const initialReports: TermReport[] = terms.map((term: string) => ({
      term,
      data: null,
      isPublished: false,
      loading: true,
    }))
    setTermReports(initialReports)

    // Fetch all reports in parallel
    const reportPromises = terms.map(async (term: string, index: number) => {
      try {
        const response = await fetch(
          `/api/reports/student/${studentId}?term=${term}&academicYear=${selectedYear}`
        )

        if (response.status === 403) {
          return {
            term,
            data: null,
            isPublished: false,
            loading: false,
          }
        }

        if (!response.ok) {
          return {
            term,
            data: null,
            isPublished: false,
            loading: false,
          }
        }

        const data = await response.json()
        return {
          term,
          data,
          isPublished: data.isPublished,
          loading: false,
        }
      } catch (error) {
        console.error(`Error fetching report for ${term}:`, error)
        return {
          term,
          data: null,
          isPublished: false,
          loading: false,
        }
      }
    })

    const results = await Promise.allSettled(reportPromises)
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        const termName = selectedYear ? academicYears.find(y => y.year === selectedYear)?.terms[index]?.name || '' : ''
        return {
          term: termName,
          data: null,
          isPublished: false,
          loading: false,
        }
      }
    })
    setTermReports(processedResults)
    setLoading(false)
  }

  const handleDownloadPDF = (reportData: ReportData) => {
    if (!reportData) return

    const pdf = generateReportCardPDF(reportData)
    pdf.save(`report-card-${reportData.student.rollNo}-${reportData.term}.pdf`)
    toast.success('Report card downloaded successfully!')
  }
  
  const handleViewFullReport = (term: string) => {
    if (!studentId || !selectedYear) return
    
    const url = `/result/${studentId}?term=${encodeURIComponent(term)}&year=${encodeURIComponent(selectedYear)}`
    window.open(url, '_blank')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Report Cards</h1>
        <p className="text-gray-500 mt-2">
          View all your report cards for the academic year
        </p>
      </div>

      {/* Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Year</CardTitle>
          <CardDescription>Select the academic year to view report cards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.year}>
                    {year.year} {year.isActive && '(Current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Term Reports Grid */}
      {!loading && termReports.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {termReports.map((termReport) => (
            <Card key={termReport.term} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{termReport.term}</CardTitle>
                  {termReport.isPublished ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Not Published
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                {termReport.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : termReport.isPublished && termReport.data ? (
                  <>
                    <div className="space-y-4 mb-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Percentage</p>
                          <p className="text-xl font-bold text-gray-900">
                            {termReport.data.summary.percentage}%
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">GPA</p>
                          <p className="text-xl font-bold text-gray-900">
                            {termReport.data.summary.gpa}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Total Marks</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {termReport.data.summary.totalObtained} / {termReport.data.summary.totalMax}
                        </p>
                      </div>

                      <div 
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: termReport.data.summary.result === 'PASS' ? '#dcfce7' : '#fee2e2',
                        }}
                      >
                        <p className="text-xs text-gray-600 mb-1">Result</p>
                        <p 
                          className="text-lg font-bold"
                          style={{
                            color: termReport.data.summary.result === 'PASS' ? '#15803d' : '#991b1b',
                          }}
                        >
                          {termReport.data.summary.result}
                        </p>
                      </div>

                      {/* Subject Count */}
                      <div className="text-sm text-gray-600">
                        {termReport.data.marks.length} Subjects
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={() => handleViewFullReport(termReport.term)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Report
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FileX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      Not yet published
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Reports */}
      {!loading && termReports.length === 0 && selectedYear && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileX className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Terms Found
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                No terms are configured for the selected academic year.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
