'use client'

import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Save, Download, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { calculateGrade, getGradeColor } from '@/lib/calculations'
import Papa from 'papaparse'
import { formatClass } from '@/lib/class-utils'
import { getTermsForClass } from '@/lib/terms'
import { getSubjectById } from '@/lib/subjects'

interface AcademicYear {
  id: string
  year: string
  isActive: boolean
}

interface Subject {
  id: string
  name: string
  code: string
  maxMarks: number
  passingMarks: number
}

interface Student {
  id: string
  name: string
  regNo: string
  class: string
}

interface MarkEntry {
  studentId: string
  subjectId: string
  marks: number | string
  grade: string
  isAbsent: boolean
  teacherRemarks: string
}

interface ExistingMark {
  studentId: string
  subjectId: string
  marks: number
  grade: string
  isAbsent?: boolean
  teacherRemarks: string | null
}

interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function MarksEntryPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [marksData, setMarksData] = useState<Map<string, MarkEntry>>(new Map())
  const [changedStudents, setChangedStudents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [teacherData, setTeacherData] = useState<any>(null)
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [cardTerms, setCardTerms] = useState<Map<string, string>>(new Map())
  const [classSubjectMap, setClassSubjectMap] = useState<Array<{ class: string; subjects: Subject[] }>>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [paginationParams, setPaginationParams] = useState({
    page: 1,
    limit: 25,
  })
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
  })
  const [pageInput, setPageInput] = useState('1')

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedYear && selectedTerm && selectedClass && selectedSubject) {
      fetchStudentsAndMarks()
    }
  }, [selectedYear, selectedTerm, selectedClass, selectedSubject, paginationParams.page, paginationParams.limit])

  useEffect(() => {
    setPageInput(paginationParams.page.toString())
  }, [paginationParams.page])

  const fetchInitialData = async () => {
    try {
      const results = await Promise.allSettled([
        fetch('/api/academic-years'),
        fetch('/api/teacher/dashboard'),
      ])

      if (results[0].status === 'fulfilled' && results[1].status === 'fulfilled') {
        const yearsData = await results[0].value.json()
        const teacherResponse = await results[1].value.json()

        console.log('Teacher dashboard response:', teacherResponse)
        console.log('Class-subject pairs from teacher:', teacherResponse.teacher.classSubjectPairs)

        // API returns {academicYears: []} so extract the array
        const years = yearsData.academicYears || []
        
        setAcademicYears(years)
        setTeacherData(teacherResponse)
        
        // Build class-subject map from classSubjectPairs using subject IDs
        const classSubjectPairs = teacherResponse.teacher.classSubjectPairs || []
        
        console.log('Class-subject pairs from teacher:', classSubjectPairs)
        
        // Group by class and get subject details
        const classMap = new Map<string, Subject[]>()
        
        classSubjectPairs.forEach((pair: any) => {
          const subjectDetail = getSubjectById(pair.classAssigned, pair.subject)
          
          if (subjectDetail) {
            const subject: Subject = {
              id: subjectDetail.id,
              name: subjectDetail.name,
              code: subjectDetail.id, // Use ID as code
              maxMarks: 0, // Will be set based on term
              passingMarks: 0, // Will be set based on term
            }
            
            if (!classMap.has(pair.classAssigned)) {
              classMap.set(pair.classAssigned, [])
            }
            
            classMap.get(pair.classAssigned)!.push(subject)
          }
        })
        
        // Convert map to array format
        const classMapArray = Array.from(classMap.entries())
          .map(([cls, subjects]) => ({
            class: cls,
            subjects: subjects
          }))
          .sort((a, b) => parseInt(a.class) - parseInt(b.class))
        
        console.log('Class-subject map:', classMapArray)
        setClassSubjectMap(classMapArray)
        setSubjects(classMapArray.flatMap(cm => cm.subjects))
        
        // Set default term to Unit Test 1
        if (!selectedTerm && classMapArray.length > 0) {
          const firstClassTerms = getTermsForClass(classMapArray[0].class)
          if (firstClassTerms.length > 0) {
            setSelectedTerm(firstClassTerms[0].name)
          }
        }

        const active = years.find((y: AcademicYear) => y.isActive)
        if (active) {
          setActiveYear(active)
          setSelectedYear(active.year)
        }
      } else {
        toast.error('Failed to fetch initial data')
      }
    } catch (error) {
      toast.error('Failed to fetch initial data')
    } finally {
      setInitialLoading(false)
    }
  }

  const fetchStudentsAndMarks = async () => {
    setLoading(true)
    try {
      const studentParams = new URLSearchParams({
        class: selectedClass,
        status: 'ACTIVE',
        page: paginationParams.page.toString(),
        limit: paginationParams.limit.toString(),
        subject: selectedSubject,
      })

      const results = await Promise.allSettled([
        fetch(`/api/students?${studentParams.toString()}`),
        fetch(
          `/api/marks?class=${selectedClass}&subject=${selectedSubject}&term=${selectedTerm}&academicYear=${selectedYear}`
        ),
      ])

      if (results[0].status === 'rejected' || results[1].status === 'rejected') {
        toast.error('Failed to fetch data')
        setLoading(false)
        return
      }

      const studentsResponse = await results[0].value.json()
      const studentsData: Student[] = studentsResponse.students || studentsResponse || []
      const marksData = await results[1].value.json()

      setStudents(studentsData)
      setPagination(
        studentsResponse.pagination || {
          total: studentsData.length,
          page: paginationParams.page,
          limit: paginationParams.limit,
          totalPages: studentsData.length > 0 ? 1 : 0,
        }
      )

      // Initialize marks data
      const newMarksMap = new Map<string, MarkEntry>()
      
      // Check if current subject is alphabetical
      const subjectDetail = getSubjectById(selectedClass, selectedSubject)
      const isAlphabetical = subjectDetail?.dataType === 'string'
      
      studentsData.forEach((student: Student) => {
        const existingMark = marksData.find(
          (m: ExistingMark) => m.studentId === student.id
        )
        const isAbsent = Boolean(existingMark?.isAbsent || existingMark?.grade === 'AB')

        // For alphabetical subjects, prioritize grade over marks
        
        newMarksMap.set(student.id, {
          studentId: student.id,
          subjectId: selectedSubject,
          marks: isAbsent ? '' : (isAlphabetical ? (existingMark?.grade || '') : (existingMark?.marks ?? '')),
          grade: isAbsent ? 'AB' : (existingMark?.grade || ''),
          isAbsent,
          teacherRemarks: existingMark?.teacherRemarks || '',
        })
      })

      setMarksData(newMarksMap)
      setHasChanges(false) // Reset changes flag when fetching fresh data
      setChangedStudents(new Set()) // Reset changed students on fresh fetch
    } catch (error) {
      toast.error('Failed to fetch students and marks')
    } finally {
      setLoading(false)
    }
  }

  const updateMark = (
    studentId: string,
    field: 'marks' | 'grade' | 'teacherRemarks',
    value: string | number
  ) => {
    const newMarksMap = new Map(marksData)
    const entry = newMarksMap.get(studentId)
    
    if (entry) {
      if (field === 'marks') {
        if (entry.isAbsent) {
          return
        }

        const normalizedValue = typeof value === 'number' ? value : Number(value)
        const marks = value === '' ? '' : normalizedValue
        
        if (marks !== '' && Number.isFinite(marks)) {
          // Get max marks from the term configuration
          const currentTerm = termsForClass.find(t => t.name === selectedTerm)
          const maxMarks = currentTerm?.maxMarks || 100

          if (marks < 0) {
            toast.error('Marks cannot be less than 0')
            return
          }
          
          if (marks > maxMarks) {
            toast.error(`Marks cannot exceed ${maxMarks}`)
            return
          }
          
          entry.marks = marks
          entry.grade = calculateGrade(marks)
        } else {
          entry.marks = ''
          if (entry.grade !== 'AB') {
            entry.grade = ''
          }
        }
      } else if (field === 'grade') {
        if (entry.isAbsent) {
          return
        }

        // For alphabetical grading subjects
        const sanitized = String(value).toUpperCase().replace(/[^A-E]/g, '')
        entry.grade = sanitized.slice(0, 1)
        // Set marks to the grade value for non-numeric subjects
        entry.marks = entry.grade
      } else if (field === 'teacherRemarks') {
        entry.teacherRemarks = String(value)
      }
      
      newMarksMap.set(studentId, entry)
      setMarksData(newMarksMap)
      setChangedStudents(prev => new Set(prev).add(studentId))
      setHasChanges(true) // Mark that changes have been made
    }
  }

  const toggleAbsent = (studentId: string, absent: boolean) => {
    const newMarksMap = new Map(marksData)
    const entry = newMarksMap.get(studentId)

    if (!entry) {
      return
    }

    entry.isAbsent = absent
    if (absent) {
      entry.grade = 'AB'
      entry.marks = ''
    } else if (entry.grade === 'AB') {
      entry.grade = ''
      entry.marks = ''
    }

    newMarksMap.set(studentId, entry)
    setMarksData(newMarksMap)
    setChangedStudents(prev => new Set(prev).add(studentId))
    setHasChanges(true)
  }

  const handleSaveMarks = async () => {
    if (!selectedYear || !selectedTerm || !selectedSubject) {
      toast.error('Please select all filters')
      return
    }

    // Only send marks for students whose marks were actually changed
    const marksArray = Array.from(marksData.entries())
      .filter(([studentId]) => changedStudents.has(studentId))
      .map(([, entry]) => ({
        ...entry,
        term: selectedTerm,
        academicYear: selectedYear,
      }))

    if (marksArray.length === 0) {
      toast.error('No changes to save')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/marks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: marksArray }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save marks')
      }

      toast.success(data.message || 'Marks saved successfully!')
      fetchStudentsAndMarks() // Refresh data
      setHasChanges(false) // Reset changes flag after successful save
      setChangedStudents(new Set()) // Clear changed students after save
    } catch (error: any) {
      toast.error(error.message || 'Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadMarks = async () => {
    if (!selectedYear || !selectedTerm || !selectedClass || !selectedSubject) {
      toast.error('Please select all filters to download')
      return
    }

    try {
      const params = new URLSearchParams({
        class: selectedClass,
        subject: selectedSubject,
        term: selectedTerm,
        academicYear: selectedYear,
      })

      const response = await fetch(`/api/marks/export?${params}`)
      const data = await response.json()

      const csv = Papa.unparse(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `marks_${selectedClass}_${selectedSubject}_${selectedTerm}_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success('Marks downloaded successfully')
    } catch (error) {
      toast.error('Failed to download marks')
    }
  }

  const handleUploadMarks = async (file: File) => {
    if (!selectedYear || !selectedTerm) {
      toast.error('Please select academic year and term first')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const response = await fetch('/api/marks/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              marks: results.data,
              term: selectedTerm,
              academicYear: selectedYear,
            }),
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Failed to upload marks')
          }

          toast.success(`Uploaded ${result.success} marks successfully`)
          if (result.failed > 0) {
            toast.error(`Failed to upload ${result.failed} marks`)
          }

          fetchStudentsAndMarks() // Refresh data
        } catch (error: any) {
          toast.error(error.message || 'Failed to upload marks')
        }
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`)
      },
    })
  }

  const selectedYearData = academicYears.find((y) => y.year === selectedYear)
  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject)
  
  // Get the current subject details including dataType
  const currentSubjectDetail = selectedClass && selectedSubject 
    ? getSubjectById(selectedClass, selectedSubject)
    : null
  const isNumericSubject = currentSubjectDetail?.dataType === 'number'

  // Get terms for the selected class (or use first assigned class for display)
  const termsForClass = selectedClass 
    ? getTermsForClass(selectedClass)
    : (classSubjectMap.length > 0 ? getTermsForClass(classSubjectMap[0].class) : [])
  
  // Get current term max marks
  const currentTerm = termsForClass.find(t => t.name === selectedTerm)
  const maxMarks = currentTerm?.maxMarks || 100

  const handleClassSelect = (className: string, term: string, subjectId: string) => {
    setSelectedClass(className)
    setSelectedTerm(term)
    setSelectedSubject(subjectId)
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
  

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {initialLoading ? (
        <>
          {/* Loading Header */}
          <div className="mb-8 space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>

          {/* Loading Tabs */}
          <div className="space-y-6">
            <div className="flex gap-2 pb-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-md" />
              ))}
            </div>

            {/* Loading Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="border border-gray-200">
                  <CardHeader className="space-y-1 pb-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">Marks Entry</h1>
            <p className="text-sm text-slate-600 mt-1.5">
              {activeYear ? `Academic Year: ${activeYear.year}` : 'No active academic year'}
            </p>
          </div>

          {/* Show class selection cards if no class is selected */}
          {!selectedClass && classSubjectMap.length > 0 && (
            <div className="space-y-6">
              {/* Term selector as button group */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {termsForClass.map((term) => (
                  <Button
                    key={term.name}
                    variant={selectedTerm === term.name ? "default" : "outline"}
                    onClick={() => setSelectedTerm(term.name)}
                    className={selectedTerm === term.name 
                      ? "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
                      : "text-slate-700 border-slate-200 hover:bg-slate-100"}
                  >
                    {term.name}
                  </Button>
                ))}
              </div>

              {/* Cards for selected term */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {classSubjectMap.flatMap((classData) => 
                  classData.subjects.map((subject) => {
                    const classTerms = getTermsForClass(classData.class)
                    const termForCard = classTerms.find(t => t.name === selectedTerm) || classTerms[0]
                    if (!termForCard) return null
                    
                    // Check if this subject is numeric
                    const subjectDetail = getSubjectById(classData.class, subject.id)
                    const isNumeric = subjectDetail?.dataType === 'number'
                    
                    return (
                      <Card 
                        key={`${classData.class}-${subject.id}`}
                        className="group relative overflow-hidden border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                        onClick={() => handleClassSelect(classData.class, termForCard.name, subject.id)}
                      >
                        <CardHeader className="pb-2.5 pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 font-medium px-2 py-0.5 text-xs mb-1.5">
                                Class {formatClass(classData.class)}
                              </Badge>
                              <CardTitle className="text-sm font-semibold text-slate-900 leading-tight">
                                {subject.name}
                              </CardTitle>
                            </div>
                            <div className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                              <span className="text-sm font-semibold text-slate-800">{formatClass(classData.class)}</span>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-2.5 pb-4">
                          {isNumeric ? (
                            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 h-[68px] flex flex-col items-center justify-center">
                              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Maximum Marks</span>
                              <span className="text-2xl font-semibold text-slate-900">{termForCard.maxMarks}</span>
                            </div>
                          ) : (
                            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 h-[68px] flex items-center justify-center">
                              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Alphabetical Grading</span>
                            </div>
                          )}
                          
                          <Button 
                            className="w-full bg-slate-900 text-white hover:bg-slate-800 font-semibold py-2 text-sm rounded-lg"
                          >
                            <span className="flex items-center justify-center gap-1.5">
                              Enter Marks
                            </span>
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )}
                  
          {classSubjectMap.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">
                  You are not assigned to any classes. Please contact the administrator.
                </p>
              </CardContent>
            </Card>
          )}
          {/* Show marks entry table when class is selected */}
          {selectedClass && selectedTerm && selectedSubject && (
        <div className="space-y-4">
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardContent className="py-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left side - Subject highlight and details */}
                <div className="flex-1 space-y-4">
                  {/* Subject name - prominently displayed */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-12 bg-slate-900 rounded-full"></div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subject</p>
                        <h2 className="text-3xl font-semibold text-slate-900">
                          {subjects.find(s => s.id === selectedSubject)?.name || 'Subject Name'}
                        </h2>
                      </div>
                    </div>
                  </div>
                  
                  {/* Details row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full">
                      <span className="text-xs font-semibold text-slate-600">Class</span>
                      <span className="text-sm font-semibold text-slate-900">{formatClass(selectedClass)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full">
                      <span className="text-xs font-semibold text-slate-600">Term</span>
                      <span className="text-sm font-semibold text-slate-900">{selectedTerm}</span>
                    </div>
                    
                    {isNumericSubject && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full">
                        <span className="text-xs font-semibold text-slate-600">Max Marks</span>
                        <span className="text-sm font-semibold text-slate-900">{maxMarks}</span>
                      </div>
                    )}
                    
                    {!isNumericSubject && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full">
                        <span className="text-xs font-semibold text-amber-800">Alphabetical Grading</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right side - Change button */}
                <div className="flex items-center justify-end lg:justify-start">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedClass('')
                      setSelectedSubject('')
                    }}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold px-6 py-5 rounded-xl shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Change Class/Subject
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Student Marks Entry</CardTitle>
                  <CardDescription className="mt-1">
                    Showing {students.length} of {pagination.total} students in Class {formatClass(selectedClass)}
                  </CardDescription>
                </div>
                {students.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {/* <Button onClick={handleDownloadMarks} variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download CSV
                    </Button> */}
                    <label htmlFor="upload-marks">
                      {/* <Button variant="outline" size="sm" asChild className="gap-2 cursor-pointer">
                        <span>
                          <Upload className="h-4 w-4" />
                          Upload CSV
                        </span>
                      </Button> */}
                      <input
                        id="upload-marks"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadMarks(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <Button onClick={handleSaveMarks} disabled={saving || loading || !hasChanges} size="sm" className="gap-2">
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes{changedStudents.size > 0 ? ` (${changedStudents.size})` : ''}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="border-b bg-muted/50 p-4">
                      <div className="grid grid-cols-5 gap-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="border-b p-4">
                        <div className="grid grid-cols-5 gap-4 items-center">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-9 w-20" />
                          <Skeleton className="h-5 w-12" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : students.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No students found in this class
                </p>
              ) : (
                <>
                  {/* Mobile view - Cards */}
                  <div className="block md:hidden space-y-3">
                    {[...students].sort((a, b) => a.name.localeCompare(b.name)).map((student) => {
                      const entry = marksData.get(student.id)
                      if (!entry) return null

                      return (
                        <Card key={student.id} className="border-2 hover:shadow-md transition-shadow">
                          <CardContent className="pt-4 pb-4">
                            <div className="space-y-3">
                              {/* Student Info */}
                              <div className="pb-2 border-b">
                                <p className="font-semibold text-base">{student.name}</p>
                                <p className="text-sm text-muted-foreground">Reg. Number: {student.regNo}</p>
                              </div>
                              
                              {/* Marks Input */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                                  {isNumericSubject ? `Marks (Max: ${maxMarks})` : 'Grade'}
                                  {entry.isAbsent && (
                                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                                      AB
                                    </span>
                                  )}
                                </label>
                                {entry.isAbsent ? (
                                  <Input
                                    type="text"
                                    value="AB"
                                    disabled
                                    className="text-lg h-12 text-center font-semibold bg-amber-50 border-amber-200 text-amber-900"
                                  />
                                ) : isNumericSubject ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    max={maxMarks}
                                    value={entry.marks}
                                    onChange={(e) =>
                                      updateMark(student.id, 'marks', e.target.value)
                                    }
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="text-lg h-12 text-center font-semibold"
                                    placeholder="0"
                                  />
                                ) : (
                                  <Input
                                    type="text"
                                    value={entry.grade}
                                    onChange={(e) =>
                                      updateMark(student.id, 'grade', e.target.value)
                                    }
                                    className="text-lg h-12 text-center font-semibold uppercase"
                                    placeholder="A/B/C"
                                    maxLength={1}
                                  />
                                )}
                              </div>

                              <div className="pt-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="default"
                                  onClick={() => toggleAbsent(student.id, !entry.isAbsent)}
                                  aria-pressed={entry.isAbsent}
                                  aria-label={entry.isAbsent ? 'Unmark absent' : 'Mark absent'}
                                  className={entry.isAbsent
                                    ? 'w-full justify-start border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 h-11 px-3'
                                    : 'w-full justify-start border-slate-200 bg-white text-slate-700 hover:bg-slate-100 h-11 px-3'}
                                >
                                  <span className="flex w-full items-center justify-between">
                                    <span className="flex items-center gap-2">
                                      <span
                                        aria-hidden="true"
                                        className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${entry.isAbsent ? 'border-amber-700 bg-amber-700 text-white' : 'border-slate-400 bg-white text-transparent'}`}
                                      >
                                        <Check className="h-3 w-3" />
                                      </span>
                                      <span className="font-medium">Mark as Absent</span>
                                    </span>
                                    <span
                                      aria-hidden="true"
                                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.isAbsent ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'}`}
                                    >
                                      {entry.isAbsent ? 'ON' : 'OFF'}
                                    </span>
                                  </span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  {/* Desktop view - Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32">Reg. Number</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="w-40 text-center">{isNumericSubject ? 'Marks' : 'Grade'}</TableHead>
                          <TableHead className="w-28 text-center">Absent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => {
                          const entry = marksData.get(student.id)
                          if (!entry) return null

                          return (
                            <TableRow key={student.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">
                                {student.regNo}
                              </TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell className="text-center">
                                {entry.isAbsent ? (
                                  <Input
                                    type="text"
                                    value="AB"
                                    disabled
                                    className="w-28 text-center text-base font-semibold mx-auto"
                                  />
                                ) : isNumericSubject ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    max={maxMarks}
                                    value={entry.marks}
                                    onChange={(e) =>
                                      updateMark(student.id, 'marks', e.target.value)
                                    }
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="w-28 text-center text-base font-semibold mx-auto"
                                    placeholder="0"
                                  />
                                ) : (
                                  <Input
                                    type="text"
                                    value={entry.grade}
                                    onChange={(e) =>
                                      updateMark(student.id, 'grade', e.target.value)
                                    }
                                    className="w-28 text-center text-base font-semibold mx-auto uppercase"
                                    placeholder="A/B/C"
                                    maxLength={1}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  type="button"
                                  variant={entry.isAbsent ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => toggleAbsent(student.id, !entry.isAbsent)}
                                  aria-pressed={entry.isAbsent}
                                  className={entry.isAbsent
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 min-w-28'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 min-w-28'}
                                >
                                  <span className="flex items-center gap-2">
                                    <span
                                      aria-hidden="true"
                                      className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${entry.isAbsent ? 'border-white bg-white text-amber-700' : 'border-slate-400 bg-white text-transparent'}`}
                                    >
                                      <Check className="h-3 w-3" />
                                    </span>
                                    Mark As Absent
                                  </span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span>
                        Showing {pageStart === 0 ? 0 : `${pageStart}-${pageEnd}`} of {pagination.total}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>Rows per page</span>
                        <Select
                          value={pagination.limit.toString()}
                          onValueChange={handleLimitChange}
                        >
                          <SelectTrigger className="h-9 w-24">
                            <SelectValue placeholder="25" />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 25, 50, 100].map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Page</span>
                        <Input
                          value={pageInput}
                          onChange={(e) => setPageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handlePageInputSubmit()
                            }
                          }}
                          className="w-16 h-9"
                          inputMode="numeric"
                        />
                        <span>of {pagination.totalPages || 1}</span>
                        <Button variant="outline" size="sm" onClick={handlePageInputSubmit}>
                          Go
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          disabled={pagination.page === 1 || loading}
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1 || loading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page >= pagination.totalPages || loading}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.totalPages)}
                          disabled={pagination.page >= pagination.totalPages || loading}
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  )
}
