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
import { Loader2, Save, Download, Upload } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { calculateGrade, getGradeColor } from '@/lib/calculations'
import Papa from 'papaparse'
import { formatClass } from '@/lib/class-utils'
import { getTermsForClass } from '@/lib/terms'

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
  rollNo: string
  class: string
}

interface MarkEntry {
  studentId: string
  subjectId: string
  marks: number
  grade: string
  teacherRemarks: string
}

interface ExistingMark {
  studentId: string
  subjectId: string
  marks: number
  grade: string
  teacherRemarks: string | null
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [teacherData, setTeacherData] = useState<any>(null)
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [cardTerms, setCardTerms] = useState<Map<string, string>>(new Map())
  const [classSubjectMap, setClassSubjectMap] = useState<Array<{ class: string; subjects: Subject[] }>>([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedYear && selectedTerm && selectedClass && selectedSubject) {
      fetchStudentsAndMarks()
    }
  }, [selectedYear, selectedTerm, selectedClass, selectedSubject])

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
        
        // Extract all subjects
        const allSubjects = teacherResponse.teacher.subjects || []
        setSubjects(allSubjects)

        // Build class-subject map
        const classSubjectPairs = teacherResponse.teacher.classSubjectPairs || []
        const assignedClasses: string[] = Array.from(new Set(classSubjectPairs.map((p: any) => p.classAssigned as string)))
        
        const classMap = assignedClasses.map((cls) => {
          // Get subject codes for this class
          const subjectCodesForClass = classSubjectPairs
            .filter((p: any) => p.classAssigned === cls)
            .map((p: any) => p.subject)
          
          // Find matching subject objects
          const subjectsForClass = allSubjects.filter((subject: Subject) => 
            subjectCodesForClass.includes(subject.code)
          )
          
          return {
            class: cls as string,
            subjects: subjectsForClass as Subject[]
          }
        })
        
        console.log('Class-subject map:', classMap)
        setClassSubjectMap(classMap)

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
      const results = await Promise.allSettled([
        fetch(`/api/students?class=${selectedClass}&status=ACTIVE`),
        fetch(
          `/api/marks?class=${selectedClass}&subject=${selectedSubject}&term=${selectedTerm}&academicYear=${selectedYear}`
        ),
      ])

      if (results[0].status === 'rejected' || results[1].status === 'rejected') {
        toast.error('Failed to fetch data')
        setLoading(false)
        return
      }

      const studentsData = await results[0].value.json()
      const marksData = await results[1].value.json()

      setStudents(studentsData.students || studentsData)

      // Initialize marks data
      const newMarksMap = new Map<string, MarkEntry>()
      
      studentsData.students?.forEach((student: Student) => {
        const existingMark = marksData.find(
          (m: ExistingMark) => m.studentId === student.id
        )

        newMarksMap.set(student.id, {
          studentId: student.id,
          subjectId: selectedSubject,
          marks: existingMark?.marks || 0,
          grade: existingMark?.grade || 'F',
          teacherRemarks: existingMark?.teacherRemarks || '',
        })
      })

      setMarksData(newMarksMap)
    } catch (error) {
      toast.error('Failed to fetch students and marks')
    } finally {
      setLoading(false)
    }
  }

  const updateMark = (studentId: string, field: keyof MarkEntry, value: any) => {
    const newMarksMap = new Map(marksData)
    const entry = newMarksMap.get(studentId)
    
    if (entry) {
      if (field === 'marks') {
        const marks = parseFloat(value) || 0
        const subject = subjects.find((s) => s.id === selectedSubject)
        
        if (subject && marks > subject.maxMarks) {
          toast.error(`Marks cannot exceed ${subject.maxMarks}`)
          return
        }
        
        entry.marks = marks
        entry.grade = calculateGrade(marks)
      } else {
        entry[field] = value
      }
      
      newMarksMap.set(studentId, entry)
      setMarksData(newMarksMap)
    }
  }

  const handleSaveMarks = async () => {
    if (!selectedYear || !selectedTerm || !selectedSubject) {
      toast.error('Please select all filters')
      return
    }

    const marksArray = Array.from(marksData.values()).map((entry) => ({
      ...entry,
      term: selectedTerm,
      academicYear: selectedYear,
    }))

    if (marksArray.length === 0) {
      toast.error('No marks to save')
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

  // Get terms for the selected class (or use first assigned class for display)
  const termsForClass = selectedClass 
    ? getTermsForClass(selectedClass)
    : (classSubjectMap.length > 0 ? getTermsForClass(classSubjectMap[0].class) : [])

  const handleClassSelect = (className: string, term: string, subjectId: string) => {
    setSelectedClass(className)
    setSelectedTerm(term)
    setSelectedSubject(subjectId)
  }
  

  return (
    <div className="p-6 space-y-6">
      {initialLoading ? (
        <>
          {/* Loading Header */}
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>

          {/* Loading Class Cards */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="border-2">
                    <CardHeader className="pb-3">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-40 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Marks Entry</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              {activeYear ? `Academic Year: ${activeYear.year}` : 'No active academic year'}
            </p>
          </div>

          {/* Show class selection cards if no class is selected */}
          {/* Show class selection cards if no class is selected */}
          {!selectedClass && (
            <div className="space-y-6">

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classSubjectMap.map((classData) => {
                      const classTerms = getTermsForClass(classData.class)
                      return (
                      <Card key={classData.class} className="hover:shadow-lg transition-shadow cursor-pointer border-2">
                        <CardHeader className="pb-0">
                          <CardTitle className="text-xl">Class {formatClass(classData.class)}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Term</label>
                            <Select onValueChange={(term) => {
                              const newTerms = new Map(cardTerms)
                              newTerms.set(classData.class, term)
                              setCardTerms(newTerms)
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select term" />
                              </SelectTrigger>
                              <SelectContent>
                                {classTerms.map((term) => (
                                  <SelectItem key={term.name} value={term.name}>
                                    {term.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Subject</label>
                            <Select 
                              disabled={!cardTerms.get(classData.class)}
                              onValueChange={(subjectId) => {
                                const term = cardTerms.get(classData.class)
                                if (term) {
                                  handleClassSelect(classData.class, term, subjectId)
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={cardTerms.get(classData.class) ? "Select subject" : "Select term first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {classData.subjects.length === 0 && <div className="px-2 py-1 text-sm text-gray-500">No subjects assigned</div>}
                                {classData.subjects.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    )})}
                  </div>
                  
                  {classSubjectMap.length === 0 && (
                    <Card>
                      <CardContent>
                        <p className="text-center text-gray-500 py-8">
                          You are not assigned to any classes. Please contact the administrator.
                        </p>
                      </CardContent>
                    </Card>
                  )}
            </div>
          )}
          {/* Show marks entry table when class is selected */}
          {selectedClass && selectedTerm && selectedSubject && (
        <div className="space-y-4">
          <Card className="border-blue-200 shadow-sm">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                      Class {formatClass(selectedClass)}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-medium">
                      {selectedTerm}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-medium">
                      {subjects.find(s => s.id === selectedSubject)?.name}
                    </Badge>
                  </div>
                  {selectedSubjectData && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Maximum Marks:</span>
                        <span className="text-blue-600 font-medium">{selectedSubjectData.maxMarks}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Passing Marks:</span>
                        <span className="text-green-600 font-medium">{selectedSubjectData.passingMarks}</span>
                      </p>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedClass('')
                    setSelectedTerm('')
                    setSelectedSubject('')
                  }}
                  className="w-full sm:w-auto hover:bg-gray-100"
                >
                  Change Class/Subject
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Student Marks Entry</CardTitle>
                  <CardDescription className="mt-1">
                    {students.length} {students.length === 1 ? 'student' : 'students'} enrolled in Class {formatClass(selectedClass)}
                  </CardDescription>
                </div>
                {students.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleDownloadMarks} variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download CSV
                    </Button>
                    <label htmlFor="upload-marks">
                      <Button variant="outline" size="sm" asChild className="gap-2 cursor-pointer">
                        <span>
                          <Upload className="h-4 w-4" />
                          Upload CSV
                        </span>
                      </Button>
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
                    <Button onClick={handleSaveMarks} disabled={saving || loading} size="sm" className="gap-2">
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save All Marks
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
                    {students.map((student) => {
                      const entry = marksData.get(student.id)
                      if (!entry) return null

                      return (
                        <Card key={student.id} className="border-2 hover:shadow-md transition-shadow">
                          <CardContent className="pt-4 pb-4">
                            <div className="space-y-3">
                              {/* Student Info */}
                              <div className="flex items-center justify-between pb-2 border-b">
                                <div>
                                  <p className="font-semibold text-base">{student.name}</p>
                                  <p className="text-sm text-muted-foreground">Roll No: {student.rollNo}</p>
                                </div>
                                <Badge className={`${getGradeColor(entry.grade)} text-lg px-3 py-1`}>
                                  {entry.grade}
                                </Badge>
                              </div>
                              
                              {/* Marks Input */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  Marks <span className="text-muted-foreground">(Max: {selectedSubjectData?.maxMarks})</span>
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  max={selectedSubjectData?.maxMarks}
                                  value={entry.marks}
                                  onChange={(e) =>
                                    updateMark(student.id, 'marks', e.target.value)
                                  }
                                  className="text-lg h-12 text-center font-semibold"
                                  placeholder="0"
                                />
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
                          <TableHead className="w-32">Roll No</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="w-40 text-center">Marks</TableHead>
                          <TableHead className="w-32 text-center">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => {
                          const entry = marksData.get(student.id)
                          if (!entry) return null

                          return (
                            <TableRow key={student.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">
                                {student.rollNo}
                              </TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max={selectedSubjectData?.maxMarks}
                                  value={entry.marks}
                                  onChange={(e) =>
                                    updateMark(student.id, 'marks', e.target.value)
                                  }
                                  className="w-28 text-center text-base font-semibold mx-auto"
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={`${getGradeColor(entry.grade)} text-base px-3 py-1`}>
                                  {entry.grade}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
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
