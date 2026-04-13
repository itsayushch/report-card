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

import { getTermsForClass } from '@/lib/terms'

interface ReportData {
  student: {
    name: string
    regNo: string
    class: string
  }
  academicYear: string
  termReports: {
    [key: string]: {
      subjects: Array<{
        subjectCode: string
        marks: number
        maxMarks: number
        grade: string
      }>
      totalObtained: number
      totalMax: number
      percentage: number
      isPublished: boolean
    }
  }
  overallPercentage: number
  overallGrade: string
  result: string
  promotionStatus: string
  publishedTerms: string[]
}

interface TermReport {
  term: string
  termData: {
    subjects: Array<{
      subjectCode: string
      marks: number
      maxMarks: number
      grade: string
    }>
    totalObtained: number
    totalMax: number
    percentage: number
    isPublished: boolean
  } | null
  isPublished: boolean
  loading: boolean
}

export default function ReportCardPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [studentId, setStudentId] = useState<string>('')
  const [studentClass, setStudentClass] = useState<string>('')
  const [termReports, setTermReports] = useState<TermReport[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedYear && studentId && studentClass) {
      fetchAllReports()
    }
  }, [selectedYear, studentId, studentClass])


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
        setStudentClass(dashboard.student.class)

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
    
    // Get terms based on student's class
    console.log('Student class:', studentClass)
    const classTerms = getTermsForClass(studentClass)
    console.log('Class terms:', classTerms)
    let terms = classTerms.map((t) => t.name)
    console.log('Terms:', terms)

    // If local mapping doesn't exist (e.g., student was previously in class 10 but now in 11),
    // fall back to the default term sequence used server-side so we still fetch reports.
    if (terms.length === 0) {
      console.warn('No terms found for class:', studentClass, '-- falling back to default term list')
      terms = ['1st Unit Test', 'Mid Term', '2nd Unit Test', 'Final Term']
    }
    
    // Initialize term reports
    const initialReports: TermReport[] = terms.map((term: string) => ({
      term,
      termData: null,
      isPublished: false,
      loading: true,
    }))
    setTermReports(initialReports)

    try {
      // Fetch report data once for all terms
      const response = await fetch(
        `/api/reports/student/${studentId}?academicYear=${selectedYear}`
      )

      if (response.status === 403) {
        // Unauthorized - set all as unpublished
        const unpublishedReports = terms.map((term: string) => ({
          term,
          termData: null,
          isPublished: false,
          loading: false,
        }))
        setTermReports(unpublishedReports)
        setLoading(false)
        return
      }

      if (!response.ok) {
        console.error('Failed to fetch reports:', response.status)
        const errorReports = terms.map((term: string) => ({
          term,
          termData: null,
          isPublished: false,
          loading: false,
        }))
        setTermReports(errorReports)
        setLoading(false)
        return
      }

      const data = await response.json()
      
      // Map the fetched data to each term
      const processedReports = terms.map((term: string) => {
        const termData = data.termReports?.[term] || null
        
        return {
          term,
          termData,
          isPublished: termData?.isPublished || false,
          loading: false,
        }
      })
      
      setTermReports(processedReports)
    } catch (error) {
      console.error('Error fetching reports:', error)
      const errorReports = terms.map((term: string) => ({
        term,
        termData: null,
        isPublished: false,
        loading: false,
      }))
      setTermReports(errorReports)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = (term: string) => {
    // PDF download functionality - to be implemented
    toast.info('PDF download will be available soon!')
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
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Academic Performance</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {termReports.filter(r => r.isPublished).length}/{termReports.length} published
                  </p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {termReports.map((termReport, index) => (
                  <Card 
                    key={termReport.term} 
                    className={`relative overflow-hidden transition-all duration-200 ${
                      termReport.isPublished 
                        ? 'border border-gray-200 hover:shadow-md bg-white' 
                        : 'border border-gray-100 bg-gray-50/50'
                    }`}
                  >
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-bold text-gray-900 truncate">
                            {termReport.term}
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {selectedYear}
                          </p>
                        </div>
                        {termReport.isPublished ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs px-2 py-0.5 h-5">
                            Live
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 bg-gray-200 text-gray-600">
                            <Lock className="h-2.5 w-2.5 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="px-4 pb-4 pt-0">
                      {termReport.loading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : termReport.isPublished && termReport.termData ? (
                        <div className="space-y-3">
                          {/* Compact Score Display */}
                          <div className="flex items-center justify-between py-3 px-3 bg-linear-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                            <div>
                              <p className="text-xs font-medium text-indigo-700 mb-0.5">Score</p>
                              <p className="text-2xl font-bold text-indigo-900">
                                {termReport.termData.percentage.toFixed(1)}<span className="text-sm">%</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-gray-600 mb-0.5">Marks</p>
                              <p className="text-sm font-bold text-gray-900">
                                {termReport.termData.totalObtained}
                                <span className="text-gray-400 font-normal text-xs mx-0.5">/</span>
                                <span className="text-gray-600">{termReport.termData.totalMax}</span>
                              </p>
                            </div>
                          </div>


                          {/* Subjects Count */}
                          <p className="text-xs text-center text-gray-500 py-1">
                            {termReport.termData.subjects.length} subjects
                          </p>

                          {/* View Button */}
                          <Button 
                            onClick={() => handleViewFullReport(termReport.term)}
                            className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-sm font-medium"
                            size="sm"
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            View Report
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gray-100 mb-2">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                          <p className="text-xs font-medium text-gray-900 mb-1">Awaiting Publication</p>
                          <p className="text-xs text-gray-500 leading-relaxed px-2">
                            Results not published
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
