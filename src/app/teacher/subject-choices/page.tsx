'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Loader2, Save } from 'lucide-react'
import { getSubjectsByPrefixes } from '@/lib/subjects'
import { formatClassSection } from '@/lib/class-utils'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

interface StudentRow {
  id: string
  name: string
  regNo: string
  class: string
  section?: string | null
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
const STUDENTS_PAGE_SIZE = 20

export default function SubjectChoicesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [classTeacherInfo, setClassTeacherInfo] = useState<{
    isClassTeacher: boolean
    class?: string
    section?: string | null
    message?: string
  } | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [choicesMap, setChoicesMap] = useState<Map<string, StudentRow>>(new Map())
  const [dirtyStudents, setDirtyStudents] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: STUDENTS_PAGE_SIZE,
    totalPages: 0,
  })

  useEffect(() => {
    fetchClassTeacherStatus()
  }, [])

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

  const fetchStudents = useCallback(async (page = 1, append = false) => {
    if (!classTeacherInfo?.class) return

    try {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams({
        class: classTeacherInfo.class,
        status: 'ACTIVE',
        page: page.toString(),
        limit: STUDENTS_PAGE_SIZE.toString(),
      })

      if (classTeacherInfo.section) {
        params.append('section', classTeacherInfo.section)
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      const response = await fetch(`/api/students?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }

      const data = await response.json()
      const studentsArray: StudentRow[] = data.students || data || []

      setStudents((prev) => {
        if (!append) return studentsArray

        const seen = new Set(prev.map((student) => student.id))
        const nextStudents = studentsArray.filter((student) => !seen.has(student.id))
        return [...prev, ...nextStudents]
      })
      setPagination(
        data.pagination || {
          total: studentsArray.length,
          page,
          limit: STUDENTS_PAGE_SIZE,
          totalPages: studentsArray.length > 0 ? 1 : 0,
        }
      )

      setChoicesMap((prev) => {
        const nextMap = append ? new Map(prev) : new Map<string, StudentRow>()
        studentsArray.forEach((student) => {
          nextMap.set(student.id, {
            ...student,
            secondLanguageSubject: student.secondLanguageSubject || null,
            thirdLanguageSubject: student.thirdLanguageSubject || null,
            sixthSubject: student.sixthSubject || null,
            valueFaithSubject: student.valueFaithSubject || null,
          })
        })
        return nextMap
      })

      if (!append) {
        setDirtyStudents(new Set())
      }
    } catch (error) {
      toast.error('Failed to fetch students')
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }, [classTeacherInfo?.class, classTeacherInfo?.section, searchQuery])

  useEffect(() => {
    if (classTeacherInfo?.isClassTeacher) {
      void fetchStudents(1, false)
    }
  }, [classTeacherInfo?.isClassTeacher, fetchStudents])

  const hasMore = pagination.page < pagination.totalPages
  const loadMoreRef = useInfiniteScroll({
    hasMore,
    isLoading: loading || isLoadingMore,
    onLoadMore: () => {
      if (dirtyStudents.size > 0) return
      void fetchStudents(pagination.page + 1, true)
    },
  })

  const refreshStudents = () => {
    void fetchStudents(1, false)
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
      refreshStudents()
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

  return (
    <div className="py-6 px-3 lg:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Subject Choices</h1>
          <p className="text-gray-600 mt-1">{formatClassSection(classValue, classTeacherInfo.section)}</p>
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
                Showing {students.length} of {pagination.total} students
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by name or reg no"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-56"
              />
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

          <div ref={loadMoreRef} className="flex justify-center py-4 text-sm text-gray-600">
            {isLoadingMore ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more students...
              </span>
            ) : hasMore ? (
              <span>Scroll to load more students</span>
            ) : (
              <span>{pagination.total === 0 ? 'No students to show' : 'All students loaded'}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
