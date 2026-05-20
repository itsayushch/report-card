'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2, Save, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { getSubjectsByPrefixes } from '@/lib/subjects'
import { formatClass } from '@/lib/class-utils'

interface StudentRow {
  id: string
  name: string
  regNo: string
  class: string
  secondLanguageSubject?: string | null
  thirdLanguageSubject?: string | null
  sixthSubject?: string | null
  valueFaithSubject?: string | null
}

interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
}

const noneValue = '__none__'

export default function SubjectChoicesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [classTeacherInfo, setClassTeacherInfo] = useState<{
    isClassTeacher: boolean
    class?: string
    message?: string
  } | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [choicesMap, setChoicesMap] = useState<Map<string, StudentRow>>(new Map())
  const [dirtyStudents, setDirtyStudents] = useState<Set<string>>(new Set())
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
    fetchClassTeacherStatus()
  }, [])

  useEffect(() => {
    if (classTeacherInfo?.isClassTeacher) {
      fetchStudents()
    }
  }, [classTeacherInfo?.isClassTeacher, paginationParams.page, paginationParams.limit, searchQuery])

  useEffect(() => {
    setPageInput(paginationParams.page.toString())
  }, [paginationParams.page])

  const fetchClassTeacherStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teacher/class-teacher-status')
      if (!response.ok) {
        throw new Error('Failed to fetch class teacher status')
      }
      const data = await response.json()
      setClassTeacherInfo(data)
    } catch (error) {
      toast.error('Failed to load class teacher status')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    if (!classTeacherInfo?.class) return

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

      const response = await fetch(`/api/students?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }

      const data = await response.json()
      const studentsArray: StudentRow[] = data.students || data || []

      setStudents(studentsArray)
      setPagination(
        data.pagination || {
          total: studentsArray.length,
          page: paginationParams.page,
          limit: paginationParams.limit,
          totalPages: studentsArray.length > 0 ? 1 : 0,
        }
      )

      const nextMap = new Map<string, StudentRow>()
      studentsArray.forEach((student) => {
        nextMap.set(student.id, {
          ...student,
          secondLanguageSubject: student.secondLanguageSubject || null,
          thirdLanguageSubject: student.thirdLanguageSubject || null,
          sixthSubject: student.sixthSubject || null,
          valueFaithSubject: student.valueFaithSubject || null,
        })
      })

      setChoicesMap(nextMap)
      setDirtyStudents(new Set())
    } catch (error) {
      toast.error('Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  const updateChoice = (studentId: string, key: keyof StudentRow, value: string) => {
    setChoicesMap((prev) => {
      const next = new Map(prev)
      const entry = next.get(studentId)
      if (!entry) return next
      next.set(studentId, {
        ...entry,
        [key]: value === noneValue ? null : value,
      })
      return next
    })

    setDirtyStudents((prev) => {
      const next = new Set(prev)
      next.add(studentId)
      return next
    })
  }

  const handleSave = async () => {
    if (dirtyStudents.size === 0) {
      toast.error('No changes to save')
      return
    }

    try {
      setSaving(true)

      const updates = Array.from(dirtyStudents).map((studentId) => {
        const entry = choicesMap.get(studentId)
        return {
          studentId,
          secondLanguageSubject: entry?.secondLanguageSubject ?? null,
          thirdLanguageSubject: entry?.thirdLanguageSubject ?? null,
          sixthSubject: entry?.sixthSubject ?? null,
          valueFaithSubject: entry?.valueFaithSubject ?? null,
        }
      })

      const response = await fetch('/api/teacher/student-subjects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save changes')
      }

      toast.success('Subject choices updated')
      setDirtyStudents(new Set())
      fetchStudents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleSearchChange = (value: string) => {
    if (dirtyStudents.size > 0) {
      toast.error('Save changes before searching')
      return
    }

    setSearchQuery(value)
    setPaginationParams((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (nextPage: number) => {
    if (dirtyStudents.size > 0) {
      toast.error('Save changes before changing page')
      return
    }

    setPaginationParams((prev) => {
      const safeTotal = pagination.totalPages || 1
      const clamped = Math.min(Math.max(1, nextPage), safeTotal)
      return { ...prev, page: clamped }
    })
  }

  const handleLimitChange = (value: string) => {
    if (dirtyStudents.size > 0) {
      toast.error('Save changes before changing page size')
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

  const classValue = classTeacherInfo?.class || ''

  const secondLanguageOptions = useMemo(
    () => (classValue ? getSubjectsByPrefixes(classValue, ['2ND-LANG-']) : []),
    [classValue]
  )
  const thirdLanguageOptions = useMemo(
    () => (classValue ? getSubjectsByPrefixes(classValue, ['3RD-LANG-']) : []),
    [classValue]
  )
  const sixthSubjectOptions = useMemo(
    () => (classValue ? getSubjectsByPrefixes(classValue, ['6TH-SUB-']) : []),
    [classValue]
  )
  const valueFaithOptions = useMemo(
    () => (classValue ? getSubjectsByPrefixes(classValue, ['VAL-EDU-', 'FAITH-EDU-']) : []),
    [classValue]
  )

  const showSecondLanguage = secondLanguageOptions.length > 0
  const showThirdLanguage = thirdLanguageOptions.length > 0
  const showSixthSubject = sixthSubjectOptions.length > 0
  const showValueFaith = valueFaithOptions.length > 0

  if (loading && students.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
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
            <CardTitle>Subject Choices</CardTitle>
            <CardDescription>
              {classTeacherInfo?.message || 'You are not assigned as a class teacher.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const pageStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const pageEnd = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="py-6 px-3 lg:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Subject Choices</h1>
          <p className="text-gray-600 mt-1">Class {formatClass(classValue)}</p>
        </div>
        <Button onClick={handleSave} disabled={saving || dirtyStudents.size === 0}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader className='px-4 !important'>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                Showing {pageStart} - {pageEnd} of {pagination.total} students
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by name or reg no"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-56"
              />
              <Select value={paginationParams.limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 50].map((value) => (
                    <SelectItem key={value} value={value.toString()}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className='px-3 !important'>
          <div className="space-y-3 md:hidden">
            {students.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                No students found
              </div>
            ) : (
              students.map((student) => {
                const entry = choicesMap.get(student.id)
                return (
                  <div key={student.id} className="rounded-lg border bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">Reg. No {student.regNo}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {showSecondLanguage && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-gray-600">2nd Language</span>
                          <Select
                            value={entry?.secondLanguageSubject || noneValue}
                            onValueChange={(value) => updateChoice(student.id, 'secondLanguageSubject', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={noneValue}>None</SelectItem>
                              {secondLanguageOptions.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {showThirdLanguage && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-gray-600">3rd Language</span>
                          <Select
                            value={entry?.thirdLanguageSubject || noneValue}
                            onValueChange={(value) => updateChoice(student.id, 'thirdLanguageSubject', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={noneValue}>None</SelectItem>
                              {thirdLanguageOptions.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {showSixthSubject && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-gray-600">6th Subject</span>
                          <Select
                            value={entry?.sixthSubject || noneValue}
                            onValueChange={(value) => updateChoice(student.id, 'sixthSubject', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={noneValue}>None</SelectItem>
                              {sixthSubjectOptions.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {showValueFaith && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-gray-600">Value / Faith</span>
                          <Select
                            value={entry?.valueFaithSubject || noneValue}
                            onValueChange={(value) => updateChoice(student.id, 'valueFaithSubject', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={noneValue}>None</SelectItem>
                              {valueFaithOptions.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="hidden md:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Reg. No</TableHead>
                  {showSecondLanguage && <TableHead>2nd Language</TableHead>}
                  {showThirdLanguage && <TableHead>3rd Language</TableHead>}
                  {showSixthSubject && <TableHead>6th Subject</TableHead>}
                  {showValueFaith && <TableHead>Value / Faith</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2 + Number(showSecondLanguage) + Number(showThirdLanguage) + Number(showSixthSubject) + Number(showValueFaith)} className="text-center py-8 text-gray-500">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => {
                    const entry = choicesMap.get(student.id)
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="font-mono text-sm">{student.regNo}</TableCell>
                        {showSecondLanguage && (
                          <TableCell>
                            <Select
                              value={entry?.secondLanguageSubject || noneValue}
                              onValueChange={(value) => updateChoice(student.id, 'secondLanguageSubject', value)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={noneValue}>None</SelectItem>
                                {secondLanguageOptions.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                        {showThirdLanguage && (
                          <TableCell>
                            <Select
                              value={entry?.thirdLanguageSubject || noneValue}
                              onValueChange={(value) => updateChoice(student.id, 'thirdLanguageSubject', value)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={noneValue}>None</SelectItem>
                                {thirdLanguageOptions.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                        {showSixthSubject && (
                          <TableCell>
                            <Select
                              value={entry?.sixthSubject || noneValue}
                              onValueChange={(value) => updateChoice(student.id, 'sixthSubject', value)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={noneValue}>None</SelectItem>
                                {sixthSubjectOptions.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                        {showValueFaith && (
                          <TableCell>
                            <Select
                              value={entry?.valueFaithSubject || noneValue}
                              onValueChange={(value) => updateChoice(student.id, 'valueFaithSubject', value)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={noneValue}>None</SelectItem>
                                {valueFaithOptions.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
            <div className="text-sm text-gray-600">
              Showing {pageStart} - {pageEnd} of {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={pagination.page <= 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  onBlur={handlePageInputSubmit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handlePageInputSubmit()
                    }
                  }}
                  className="w-14 text-center"
                />
                <span className="text-sm text-gray-600">of {pagination.totalPages || 1}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
