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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Save, AlertCircle, ExternalLink, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatClass } from '@/lib/class-utils'
import { getTermsForClass } from '@/lib/terms'
import { getSubjectById } from '@/lib/subjects'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AcademicYear {
  id: string
  year: string
  isActive: boolean
}

interface Student {
  id: string
  name: string
  regNo: string
  class: string
}

interface SubjectMark {
  subjectCode: string
  marks: number
  maxMarks: number
  grade: string | null
}

interface StudentData {
  studentId: string
  remarks: string | null
  subjects: SubjectMark[]
}

interface RemarksEntry {
  studentId: string
  remarks: string
}

interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function ClassRemarksPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [classTeacherInfo, setClassTeacherInfo] = useState<{
    isClassTeacher: boolean
    class?: string
    message?: string
  } | null>(null)
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [remarksData, setRemarksData] = useState<Map<string, RemarksEntry>>(new Map())
  const [studentMarksData, setStudentMarksData] = useState<Map<string, SubjectMark[]>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)
  const [terms, setTerms] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [paginationParams, setPaginationParams] = useState({
    page: 1,
    limit: 20,
  })
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  })
  const [pageInput, setPageInput] = useState('1')

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (
      classTeacherInfo?.isClassTeacher &&
      activeYear &&
      selectedTerm
    ) {
      fetchStudentsAndRemarks()
    }
  }, [selectedTerm, paginationParams.page, paginationParams.limit, searchQuery])

  useEffect(() => {
    setPageInput(paginationParams.page.toString())
  }, [paginationParams.page])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [statusRes, yearRes] = await Promise.all([
        fetch('/api/teacher/class-teacher-status'),
        fetch('/api/academic-years'),
      ])

      if (!statusRes.ok) {
        throw new Error('Failed to fetch class teacher status')
      }

      const statusData = await statusRes.json()
      setClassTeacherInfo(statusData)

      if (!statusData.isClassTeacher) {
        setLoading(false)
        return
      }

      // Get active year
      const yearsData = await yearRes.json()
      const years = yearsData.academicYears || []
      const active = years.find((y: AcademicYear) => y.isActive)
      
      if (active) {
        setActiveYear(active)
      }

      // Get terms for the class
      const classTerms = getTermsForClass(statusData.class)
      // Filter out Final Term
      const availableTerms = classTerms.filter(
        (t) => t.name !== 'Final Term'
      )
      setTerms(availableTerms)

      // Set default term to first available
      if (availableTerms.length > 0 && !selectedTerm) {
        setSelectedTerm(availableTerms[0].name)
      }
    } catch (error) {
      toast.error('Failed to load data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentsAndRemarks = async () => {
    if (!classTeacherInfo?.class || !activeYear || !selectedTerm) {
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({
        class: classTeacherInfo.class,
        status: 'ACTIVE',
        page: paginationParams.page.toString(),
        limit: paginationParams.limit.toString(),
      })

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      const [studentsRes, remarksRes] = await Promise.all([
        fetch(`/api/students?${params.toString()}`),
        fetch(
          `/api/teacher/class-remarks?class=${classTeacherInfo.class}&term=${selectedTerm}&academicYear=${activeYear.year}`
        ),
      ])

      if (!studentsRes.ok || !remarksRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const studentsData = await studentsRes.json()
      const remarksDataFromAPI = await remarksRes.json()

      // Get students array from API response
      const studentsArray = studentsData.students || studentsData || []
      setStudents(studentsArray)
      setPagination(
        studentsData.pagination || {
          total: studentsArray.length,
          page: paginationParams.page,
          limit: paginationParams.limit,
          totalPages: studentsArray.length > 0 ? 1 : 0,
        }
      )

      // Initialize remarks data and marks data
      const newRemarksMap = new Map<string, RemarksEntry>()
      const newMarksMap = new Map<string, SubjectMark[]>()
      
      // Ensure remarksDataFromAPI is an array
      const remarksArray = Array.isArray(remarksDataFromAPI) ? remarksDataFromAPI : []
      
      studentsArray.forEach((student: Student) => {
        const existingData = remarksArray.find(
          (r: StudentData) => r.studentId === student.id
        )

        newRemarksMap.set(student.id, {
          studentId: student.id,
          remarks: existingData?.remarks || '',
        })

        newMarksMap.set(student.id, existingData?.subjects || [])
      })

      setRemarksData(newRemarksMap)
      setStudentMarksData(newMarksMap)
      setHasChanges(false)
    } catch (error) {
      toast.error('Failed to fetch students and remarks')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const updateRemarks = (studentId: string, remarks: string) => {
    const newRemarksMap = new Map(remarksData)
    const entry = newRemarksMap.get(studentId)
    
    if (entry) {
      entry.remarks = remarks
      newRemarksMap.set(studentId, entry)
      setRemarksData(newRemarksMap)
      setHasChanges(true)
    }
  }

  const handleTermChange = (term: string) => {
    if (hasChanges) {
      toast.error('Please save your changes before changing term')
      return
    }

    setSelectedTerm(term)
    setSearchQuery('')
    setPaginationParams((prev) => ({ ...prev, page: 1 }))
  }

  const handleSearchChange = (value: string) => {
    if (hasChanges) {
      toast.error('Please save your changes before searching')
      return
    }

    setSearchQuery(value)
    setPaginationParams((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (nextPage: number) => {
    if (hasChanges) {
      toast.error('Please save your changes before changing page')
      return
    }

    setPaginationParams((prev) => {
      const safeTotal = pagination.totalPages || 1
      const clamped = Math.min(Math.max(1, nextPage), safeTotal)
      return { ...prev, page: clamped }
    })
  }

  const handleLimitChange = (value: string) => {
    if (hasChanges) {
      toast.error('Please save your changes before changing page size')
      return
    }

    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) return
    setPaginationParams((prev) => ({ ...prev, limit: numeric, page: 1 }))
  }

  const handlePageInputSubmit = () => {
    const numeric = Number(pageInput)
    if (!Number.isFinite(numeric)) return
    handlePageChange(numeric)
  }

  const pageStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const pageEnd = Math.min(pagination.page * pagination.limit, pagination.total)

  const handleSaveRemarks = async () => {
    if (!activeYear || !selectedTerm) {
      toast.error('Please select a term')
      return
    }

    // Only send remarks that have been entered (non-empty)
    const remarksArray = Array.from(remarksData.values())
      .filter((entry) => entry.remarks && entry.remarks.trim() !== '')
      .map((entry) => ({
        ...entry,
        term: selectedTerm,
        academicYear: activeYear.year,
      }))

    if (remarksArray.length === 0) {
      toast.error('No remarks to save. Please enter at least one remark.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/teacher/class-remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: remarksArray }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save remarks')
      }

      toast.success(data.message || 'Remarks saved successfully!')
      await fetchStudentsAndRemarks()
      setHasChanges(false)
    } catch (error: any) {
      console.error('Save error:', error) // Debug log
      toast.error(error.message || 'Failed to save remarks')
    } finally {
      setSaving(false)
    }
  }

  const getSubjectName = (subjectCode: string) => {
    if (!classTeacherInfo?.class) return subjectCode
    const subject = getSubjectById(classTeacherInfo.class, subjectCode)
    return subject?.name || subjectCode
  }

  if (loading && !classTeacherInfo) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!classTeacherInfo?.isClassTeacher) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {classTeacherInfo?.message || 'You are not assigned as a class teacher.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Class Remarks Entry</h1>
        <p className="text-gray-500 mt-1">
          Manage remarks for your class: {formatClass(classTeacherInfo.class!)} • {activeYear?.year || 'Not set'}
        </p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Remarks can only be entered for the first 3 terms (1st Unit Test, Mid Term, 2nd Unit Test). 
          Final Term remarks are not allowed.
        </AlertDescription>
      </Alert>

      {/* Remarks Table */}
      <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              {/* Top row: title + save button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Student Remarks</CardTitle>
                  <CardDescription>
                    Enter remarks for each student
                    {selectedTerm ? ` for ${selectedTerm}` : ''}
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveRemarks}
                  disabled={saving || !hasChanges || !selectedTerm}
                  size="sm"
                  className="gap-2 sm:shrink-0"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save All Remarks
                    </>
                  )}
                </Button>
              </div>
              {/* Filter row: term selector + search */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={selectedTerm} onValueChange={handleTermChange}>
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.name} value={term.name}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    placeholder="Search by name or reg no…"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTerm ? (
              <p className="text-center text-gray-500 py-8">Select a term to view students</p>
            ) : loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No students found for this class
              </p>
            ) : (
              <div className="space-y-6">
                {students.map((student) => {
                  const entry = remarksData.get(student.id)
                  const marks = studentMarksData.get(student.id) || []
                  
                  return (
                    <div key={student.id} className="border rounded-lg p-4 space-y-3">
                      {/* Student Info */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{student.name}</h3>
                          <p className="text-sm text-gray-500">Reg No: {student.regNo}</p>
                        </div>
                        {activeYear && (
                          <a
                            href={`/result/${student.id}?year=${activeYear.year}&term=${encodeURIComponent(selectedTerm)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <ExternalLink className="h-3.5 w-3.5" />
                              View Result
                            </Button>
                          </a>
                        )}
                      </div>

                      {/* Marks Summary */}
                      {marks.length > 0 && (() => {
                        const numericMarks = marks.filter((m) => {
                          const sub = getSubjectById(classTeacherInfo?.class || '', m.subjectCode)
                          return !sub || sub.dataType !== 'string'
                        })
                        const totalObtained = numericMarks.reduce((sum, m) => sum + m.marks, 0)
                        const totalMax = numericMarks.reduce((sum, m) => sum + m.maxMarks, 0)
                        const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0'
                        return (
                          <div className="bg-gray-50 rounded-md p-3 flex items-center gap-6">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Marks</p>
                              <p className="text-lg font-bold text-gray-900">{totalObtained} / {totalMax}</p>
                            </div>
                            <div className="border-l pl-6">
                              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Percentage</p>
                              <p className="text-lg font-bold text-blue-700">{percentage}%</p>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Remarks Input */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Teacher Remarks
                        </label>
                        <Textarea
                          value={entry?.remarks || ''}
                          onChange={(e) =>
                            updateRemarks(student.id, e.target.value)
                          }
                          placeholder="Enter remarks for this student..."
                          className="min-h-20 resize-none"
                          maxLength={500}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {entry?.remarks?.length || 0}/500 characters
                        </p>
                      </div>
                    </div>
                  )
                })}

                <div className="border-t pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {pageStart}-{pageEnd} of {pagination.total} students
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={paginationParams.limit.toString()} onValueChange={handleLimitChange}>
                      <SelectTrigger className="h-9 w-28">
                        <SelectValue placeholder="Rows" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.page <= 1}
                        aria-label="First page"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                        onBlur={handlePageInputSubmit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handlePageInputSubmit()
                          }
                        }}
                        className="h-9 w-16 text-center"
                        aria-label="Page number"
                      />
                      <span className="text-sm text-muted-foreground">/ {Math.max(pagination.totalPages, 1)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handlePageChange(pagination.totalPages)}
                        disabled={pagination.page >= pagination.totalPages}
                        aria-label="Last page"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  )
}
