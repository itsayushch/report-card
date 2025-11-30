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

interface AcademicYear {
  id: string
  year: string
  isActive: boolean
  terms: { name: string }[]
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
  section: string
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
        console.log('Subjects from teacher:', teacherResponse.teacher.subjects)

        // API returns {academicYears: []} so extract the array
        const years = yearsData.academicYears || []
        
        setAcademicYears(years)
        setTeacherData(teacherResponse)
        
        // Access subjects from the teacher object in the response
        setSubjects(teacherResponse.teacher.subjects || [])

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

  const handleExportMarks = async () => {
    if (!selectedYear || !selectedTerm || !selectedClass || !selectedSubject) {
      toast.error('Please select all filters to export')
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

      toast.success('Marks exported successfully')
    } catch (error) {
      toast.error('Failed to export marks')
    }
  }

  const handleImportMarks = async (file: File) => {
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
            throw new Error(result.error || 'Failed to import marks')
          }

          toast.success(`Imported ${result.success} marks successfully`)
          if (result.failed > 0) {
            toast.error(`Failed to import ${result.failed} marks`)
          }

          fetchStudentsAndMarks() // Refresh data
        } catch (error: any) {
          toast.error(error.message || 'Failed to import marks')
        }
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`)
      },
    })
  }
  const selectedYearData = academicYears.find((y) => y.year === selectedYear)
  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject)
  const terms = activeYear?.terms || []
  const assignedClasses = teacherData?.teacher?.assignedClasses || []

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
            <h1 className="text-3xl font-bold text-gray-900">Marks Entry</h1>
            <p className="text-gray-500 mt-2">
              {activeYear ? `Academic Year: ${activeYear.year}` : 'No active academic year'}
            </p>
          </div>

          {/* Show class selection cards if no class is selected */}
          {!selectedClass && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Class to Enter Marks</CardTitle>
                  <CardDescription>
                    Choose from your assigned classes for {activeYear?.year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {assignedClasses.map((className: string) => (
                      <Card key={className} className="hover:shadow-lg transition-shadow cursor-pointer border-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xl">{className}</CardTitle>
                          <CardDescription>Select term and subject</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Term</label>
                            <Select onValueChange={(term) => {
                              const tempTerm = term
                              const select = document.getElementById(`subject-${className}`) as any
                              if (select) {
                                select.dataset.term = tempTerm
                              }
                            }}>
                              <SelectTrigger>
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
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Subject</label>
                            <Select 
                              onValueChange={(subjectId) => {
                                const select = document.getElementById(`subject-${className}`) as any
                                const term = select?.dataset.term
                                if (term) {
                                  handleClassSelect(className, term, subjectId)
                                } else {
                                  toast.error('Please select a term first')
                                }
                              }}
                            >
                              <SelectTrigger id={`subject-${className}`}>
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {assignedClasses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No classes assigned to you yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Show marks entry table when class is selected */}
          {selectedClass && selectedTerm && selectedSubject && (
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white">Class {selectedClass}</Badge>
                    <Badge variant="outline" className="bg-white">{selectedTerm}</Badge>
                    <Badge variant="outline" className="bg-white">
                      {subjects.find(s => s.id === selectedSubject)?.name}
                    </Badge>
                  </div>
                  {selectedSubjectData && (
                    <p className="text-sm text-blue-900">
                      Max Marks: {selectedSubjectData.maxMarks} • Passing Marks: {selectedSubjectData.passingMarks}
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedClass('')
                    setSelectedTerm('')
                    setSelectedSubject('')
                  }}
                  className="bg-white"
                >
                  Change Selection
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enter Marks</CardTitle>
                  <CardDescription>
                    {students.length} students in Class {selectedClass}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleExportMarks} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <label htmlFor="import-marks">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </span>
                    </Button>
                    <input
                      id="import-marks"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImportMarks(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <Button onClick={handleSaveMarks} disabled={saving || loading}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Marks
                      </>
                    )}
                  </Button>
                </div>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Roll No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="w-32">Marks</TableHead>
                        <TableHead className="w-24">Grade</TableHead>
                        <TableHead className="min-w-[200px]">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => {
                        const entry = marksData.get(student.id)
                        if (!entry) return null

                        return (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.rollNo}
                            </TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={selectedSubjectData?.maxMarks}
                                value={entry.marks}
                                onChange={(e) =>
                                  updateMark(student.id, 'marks', e.target.value)
                                }
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Badge className={getGradeColor(entry.grade)}>
                                {entry.grade}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Textarea
                                value={entry.teacherRemarks}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                  updateMark(
                                    student.id,
                                    'teacherRemarks',
                                    e.target.value
                                  )
                                }
                                placeholder="Optional remarks"
                                className="min-h-[60px]"
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
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
