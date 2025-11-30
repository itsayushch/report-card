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
  }
  academicYear: string
  term: string
  marks: Array<{
    subject: string
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
  const [initialLoading, setInitialLoading] = useState(true)

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
    } finally {
      setInitialLoading(false)
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {initialLoading ? (
        <>
          {/* Loading Header */}
          <div className="space-y-2">
            <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-96 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Loading Year Selector */}
          <Card className="border-2">
            <CardHeader className="border-b bg-gray-50/50">
              <div className="space-y-2">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-11 w-full max-w-sm bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>

          {/* Loading Message */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-gray-600 font-medium">Loading academic years...</p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Report Cards</h1>
              <p className="text-gray-600 mt-1">
                View and download your academic performance reports
              </p>
            </div>
            {selectedYear && (
              <Badge variant="outline" className="text-lg px-4 py-2 font-semibold border-2">
                {selectedYear}
              </Badge>
            )}
          </div>

          {/* Year Selector */}
          <Card className="border-2">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Academic Year</CardTitle>
                  <CardDescription>Select the academic year to view report cards</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="max-w-sm">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.year}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{year.year}</span>
                          {year.isActive && (
                            <Badge className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                              Current
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {loading && (
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                  <p className="text-gray-600 font-medium">Loading report cards...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Term Reports Grid */}
          {!loading && termReports.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Term Reports ({termReports.length})
                </h2>
                <p className="text-sm text-gray-500">
                  {termReports.filter(r => r.isPublished).length} Published
                </p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {termReports.map((termReport) => (
                  <Card 
                    key={termReport.term} 
                    className={`flex flex-col border-2 transition-all ${
                      termReport.isPublished 
                        ? 'hover:shadow-xl hover:border-indigo-300' 
                        : 'bg-gray-50/30'
                    }`}
                  >
                    <CardHeader className="border-b pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-900">
                            {termReport.term}
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            {selectedYear}
                          </p>
                        </div>
                        {termReport.isPublished ? (
                          <Badge className="bg-green-600 hover:bg-green-600 text-white">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1.5 bg-gray-200">
                            <Lock className="h-3.5 w-3.5" />
                            Locked
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col justify-between pt-6">
                      {termReport.loading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                      ) : termReport.isPublished && termReport.data ? (
                        <>
                          <div className="space-y-4 mb-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="border-2 border-indigo-200 bg-indigo-50 p-4 rounded-lg">
                                <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-1">
                                  Percentage
                                </p>
                                <p className="text-2xl font-bold text-indigo-900">
                                  {termReport.data.summary.percentage}%
                                </p>
                              </div>
                              <div className={`border-2 p-4 rounded-lg ${
                                termReport.data.summary.result === 'PASS' 
                                  ? 'border-green-200 bg-green-50' 
                                  : 'border-red-200 bg-red-50'
                              }`}>
                              <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                                termReport.data.summary.result === 'PASS' 
                                  ? 'text-green-700' 
                                  : 'text-red-700'
                              }`}>
                                Result
                              </p>
                              <p className={`text-xl font-bold ${
                                termReport.data.summary.result === 'PASS' 
                                  ? 'text-green-900' 
                                  : 'text-red-900'
                              }`}>
                                {termReport.data.summary.result}
                              </p>
                              </div>
                            </div>
                            
                            {/* Total Marks */}
                            <div className="border-2 bg-white p-4 rounded-lg">
                              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                                Total Marks
                              </p>
                              <p className="text-xl font-bold text-gray-900">
                                {termReport.data.summary.totalObtained} 
                                <span className="text-gray-400 font-medium"> / </span>
                                {termReport.data.summary.totalMax}
                              </p>
                            </div>


                            {/* Subject Count */}
                            <div className="flex items-center justify-center gap-2 pt-2">
                              <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                              <p className="text-sm font-medium text-gray-700">
                                {termReport.data.marks.length} Subjects Evaluated
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <Button 
                            onClick={() => handleViewFullReport(termReport.term)}
                            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-semibold"
                            size="lg"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Full Report
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-200 mb-4">
                            <Lock className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">Not Published Yet</h3>
                          <p className="text-sm text-gray-500">
                            Report will be available once published
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Reports */}
          {!loading && termReports.length === 0 && selectedYear && (
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gray-100 mb-4">
                    <FileX className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    No Terms Found
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    No terms are configured for the selected academic year. Please check back later.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
