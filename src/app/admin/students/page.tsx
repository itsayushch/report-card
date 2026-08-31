'use client'

import { useCallback, useEffect, useState } from 'react'
import { Student } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StudentTable } from '@/components/admin/students/StudentTable'
import { StudentForm } from '@/components/admin/students/StudentForm'
import { StudentFilters } from '@/components/admin/students/StudentFilters'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Layers, Loader2, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { useQuery } from '@tanstack/react-query'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface StudentsResponse {
  students: Student[]
  pagination: PaginationInfo
}

interface SectionsResponse {
  sections: Array<{ id: string; name: string }>
}

const STUDENTS_PAGE_SIZE = 20

// Fetcher function for students
const fetchStudentsData = async (params: { page: number, limit: number, search: string, classFilter: string, sectionFilter: string, statusFilter: string }): Promise<StudentsResponse> => {
  const urlParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  })

  if (params.search) urlParams.append('search', params.search)
  if (params.classFilter && params.classFilter !== 'all') urlParams.append('class', params.classFilter)
  if (params.sectionFilter && params.sectionFilter !== 'all') urlParams.append('section', params.sectionFilter)
  if (params.statusFilter && params.statusFilter !== 'all') urlParams.append('status', params.statusFilter)

  const response = await fetch(`/api/students?${urlParams}`)
  if (!response.ok) throw new Error('Failed to fetch students')
  return response.json() as Promise<StudentsResponse>
}

export default function StudentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [loadedStudents, setLoadedStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [allMatchingSelected, setAllMatchingSelected] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false)
  const [bulkRestoreDialogOpen, setBulkRestoreDialogOpen] = useState(false)
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState('')
  const [assigningSection, setAssigningSection] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null)
  const [studentToPermanentDelete, setStudentToPermanentDelete] = useState<string | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: STUDENTS_PAGE_SIZE,
    totalPages: 0,
  })

  // Filters
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: sectionsData } = useQuery<SectionsResponse>({
    queryKey: ['sections', classFilter],
    queryFn: async () => {
      if (!classFilter || classFilter === 'all') return { sections: [] }
      const response = await fetch(`/api/admin/sections?class=${classFilter}&activeOnly=true`)
      if (!response.ok) throw new Error('Failed to fetch sections')
      return response.json() as Promise<SectionsResponse>
    },
  })

  const loadStudents = useCallback(async (page = 1, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      const data = await fetchStudentsData({
        page,
        limit: STUDENTS_PAGE_SIZE,
        search,
        classFilter,
        sectionFilter,
        statusFilter,
      })

      setLoadedStudents((prev) => {
        if (!append) return data.students ?? []

        const seen = new Set(prev.map((student) => student.id))
        const nextStudents = (data.students ?? []).filter((student) => !seen.has(student.id))
        return [...prev, ...nextStudents]
      })
      setPagination(data.pagination ?? {
        total: data.students?.length ?? 0,
        page,
        limit: STUDENTS_PAGE_SIZE,
        totalPages: (data.students?.length ?? 0) > 0 ? 1 : 0,
      })
    } catch {
      toast.error('Failed to fetch students')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [classFilter, search, sectionFilter, statusFilter])

  useEffect(() => {
    setSelectedStudents([])
    setAllMatchingSelected(false)
    void loadStudents(1, false)
  }, [loadStudents])

  const hasMore = pagination.page < pagination.totalPages
  const loadMoreRef = useInfiniteScroll({
    hasMore,
    isLoading: isLoading || isLoadingMore,
    onLoadMore: () => {
      void loadStudents(pagination.page + 1, true)
    },
  })

  const students: Student[] = loadedStudents.slice().sort((a, b) => {
    const classA = Number.parseInt(a.class, 10)
    const classB = Number.parseInt(b.class, 10)

    if (Number.isNaN(classA) && !Number.isNaN(classB)) return 1
    if (!Number.isNaN(classA) && Number.isNaN(classB)) return -1
    
    if (classA !== classB) {
      if (!Number.isNaN(classA) && !Number.isNaN(classB)) {
        return classB - classA
      }
    }

    const sectionA = a.section || ''
    const sectionB = b.section || ''
    if (sectionA !== sectionB) return sectionA.localeCompare(sectionB)

    return a.name.localeCompare(b.name)
  })
  const loadedStudentIds = students.map((student) => student.id)
  const allLoadedSelected = loadedStudentIds.length > 0 && loadedStudentIds.every((id) => selectedStudents.includes(id))
  const loadedSelectedInactiveCount = students.filter(
    (student) => selectedStudents.includes(student.id) && student.status === 'INACTIVE'
  ).length
  const canBulkRestore = allMatchingSelected ? statusFilter !== 'ACTIVE' : loadedSelectedInactiveCount > 0
  const hasSelectedStudents = allMatchingSelected || selectedStudents.length > 0
  const sectionActionClass = classFilter && classFilter !== 'all' ? classFilter : ''
  const targetSectionLabel = allMatchingSelected
    ? `${pagination.total} matching student${pagination.total === 1 ? '' : 's'}`
    : `${selectedStudents.length} selected student${selectedStudents.length === 1 ? '' : 's'}`

  const clearSelection = () => {
    setSelectedStudents([])
    setAllMatchingSelected(false)
  }

  const openSectionDialog = () => {
    if (!hasSelectedStudents) {
      toast.error('Please select students first')
      return
    }

    if (!sectionActionClass) {
      toast.error('Please filter by one class before adding students to a section')
      return
    }

    if ((sectionsData?.sections || []).length === 0) {
      toast.error('No active sections found for this class')
      return
    }

    setSelectedSection('')
    setSectionDialogOpen(true)
  }

  const handleEdit = (student: Student) => {
    setSelectedStudent(student)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setStudentToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!studentToDelete) return

    try {
      const response = await fetch(`/api/students/${studentToDelete}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Student deleted successfully')
        void loadStudents(1, false)
      } else {
        toast.error('Failed to delete student')
      }
    } catch {
      toast.error('Failed to delete student')
    } finally {
      setDeleteDialogOpen(false)
      setStudentToDelete(null)
    }
  }

  const handleFormSuccess = () => {
    void loadStudents(1, false)
    setSelectedStudent(null)
  }

  const handleRestore = async (id: string) => {
    try {
      const response = await fetch(`/api/students/${id}/restore`, {
        method: 'PATCH',
      })

      if (response.ok) {
        toast.success('Student restored successfully')
        void loadStudents(1, false)
      } else {
        toast.error('Failed to restore student')
      }
    } catch (error) {
      toast.error('Failed to restore student')
    }
  }

  const handlePermanentDelete = (id: string) => {
    setStudentToPermanentDelete(id)
    setPermanentDeleteDialogOpen(true)
  }

  const confirmPermanentDelete = async () => {
    if (!studentToPermanentDelete) return

    try {
      const response = await fetch(`/api/students/${studentToPermanentDelete}/permanent`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Student permanently deleted')
        void loadStudents(1, false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to permanently delete student')
      }
    } catch (error) {
      toast.error('Failed to permanently delete student')
    } finally {
      setPermanentDeleteDialogOpen(false)
      setStudentToPermanentDelete(null)
    }
  }

  const handleBulkRestore = () => {
    if (!allMatchingSelected && selectedStudents.length === 0) {
      toast.error('Please select students to restore')
      return
    }
    setBulkRestoreDialogOpen(true)
  }

  const confirmBulkRestore = async () => {
    try {
      const response = await fetch('/api/students/bulk-restore', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allMatchingSelected
          ? {
              allMatching: true,
              filters: {
                search,
                classFilter,
                sectionFilter,
                statusFilter,
              },
            }
          : {
              studentIds: selectedStudents,
            }
        ),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${data.count ?? selectedStudents.length} student(s) restored successfully`)
        clearSelection()
        void loadStudents(1, false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to restore students')
      }
    } catch (error) {
      toast.error('Failed to restore students')
    } finally {
      setBulkRestoreDialogOpen(false)
    }
  }

  const handleAssignSection = async () => {
    if (!selectedSection) {
      toast.error('Please select a section')
      return
    }

    try {
      setAssigningSection(true)
      const response = await fetch('/api/students/bulk-section', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allMatchingSelected
          ? {
              allMatching: true,
              className: sectionActionClass,
              section: selectedSection,
              filters: {
                search,
                sectionFilter,
                statusFilter,
              },
            }
          : {
              studentIds: selectedStudents,
              className: sectionActionClass,
              section: selectedSection,
            }
        ),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign section')
      }

      toast.success(`${data.count ?? 0} student(s) added to Section ${selectedSection}`)
      setSectionDialogOpen(false)
      setSelectedSection('')
      clearSelection()
      void loadStudents(1, false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign section')
    } finally {
      setAssigningSection(false)
    }
  }

  const handleSelectAll = () => {
    setAllMatchingSelected(false)

    if (allLoadedSelected) {
      setSelectedStudents((prev) => prev.filter((id) => !loadedStudentIds.includes(id)))
    } else {
      setSelectedStudents((prev) => Array.from(new Set([...prev, ...loadedStudentIds])))
    }
  }

  const handleSelectStudent = (id: string) => {
    if (allMatchingSelected) {
      setAllMatchingSelected(false)
      setSelectedStudents(loadedStudentIds.filter((studentId) => studentId !== id))
      return
    }

    setSelectedStudents(prev => 
      prev.includes(id) 
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    )
  }

  const handleAddNew = () => {
    setSelectedStudent(null)
    setIsFormOpen(true)
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (classFilter && classFilter !== 'all') params.append('class', classFilter)
      if (sectionFilter && sectionFilter !== 'all') params.append('section', sectionFilter)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/students/export?${params}`)
      const data = await response.json()

      const csv = Papa.unparse(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `students_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success('Students exported successfully')
    } catch (error) {
      toast.error('Failed to export students')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-gray-600 mt-1">Manage student records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Link href="/admin/students/import">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </Link> */}
          <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Students ({pagination.total})</CardTitle>
              <CardDescription>
                Showing {students.length} of {pagination.total} students
              </CardDescription>
            </div>
            {hasSelectedStudents && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  onClick={openSectionDialog}
                  variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                >
                  <Layers className="mr-2 h-4 w-4" />
                  Add to Section
                </Button>
                {canBulkRestore && (
                <Button 
                  onClick={handleBulkRestore} 
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:text-green-700 hover:bg-green-50 hover:border-green-300"
                >
                  {allMatchingSelected
                    ? 'Restore Matching Inactive Students'
                    : `Restore ${loadedSelectedInactiveCount} Student${loadedSelectedInactiveCount > 1 ? 's' : ''}`}
                </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="pb-4 border-b">
            <StudentFilters
              search={search}
              classFilter={classFilter}
              sectionFilter={sectionFilter}
              statusFilter={statusFilter}
              sections={sectionsData?.sections || []}
              onSearchChange={(value) => {
                setSearch(value)
              }}
              onClassChange={(value) => {
                setClassFilter(value)
                setSectionFilter('')
              }}
              onSectionChange={(value) => {
                setSectionFilter(value)
              }}
              onStatusChange={(value) => {
                setStatusFilter(value)
              }}
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="border-b bg-muted/50 p-4">
                  <div className="grid grid-cols-6 gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="border-b p-4">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-16" />
                      <div className="flex gap-2 justify-end">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {(allLoadedSelected || allMatchingSelected) && pagination.total > students.length && (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  {allMatchingSelected ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span>All {pagination.total} students matching the current filters are selected.</span>
                      <Button variant="link" size="sm" className="h-auto p-0 text-blue-900" onClick={clearSelection}>
                        Clear selection
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span>All {students.length} loaded students are selected.</span>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-blue-900"
                          onClick={() => {
                            setAllMatchingSelected(true)
                            setSelectedStudents(loadedStudentIds)
                          }}
                        >
                          Select all {pagination.total} matching students
                        </Button>
                        <Button variant="link" size="sm" className="h-auto p-0 text-blue-900" onClick={clearSelection}>
                          Clear selection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <StudentTable
                students={students}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
                selectedStudents={selectedStudents}
                allMatchingSelected={allMatchingSelected}
                onSelectStudent={handleSelectStudent}
                onSelectAll={handleSelectAll}
              />

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
            </>
          )}
        </CardContent>
      </Card>

      <StudentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        student={selectedStudent}
        onSuccess={handleFormSuccess}
      />

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Students to Section</DialogTitle>
            <DialogDescription>
              Assign {targetSectionLabel} from Class {sectionActionClass} to a section.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="bulk-section">Section</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger id="bulk-section">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {(sectionsData?.sections || []).map((section) => (
                  <SelectItem key={section.id} value={section.name}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)} disabled={assigningSection}>
              Cancel
            </Button>
            <Button onClick={handleAssignSection} disabled={assigningSection || !selectedSection}>
              {assigningSection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the student as inactive. You can restore them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Mark Inactive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkRestoreDialogOpen} onOpenChange={setBulkRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Students?</AlertDialogTitle>
            <AlertDialogDescription>
              {allMatchingSelected
                ? 'Are you sure you want to restore all inactive students matching the current filters to active status?'
                : `Are you sure you want to restore ${selectedStudents.filter((id) => students.find((student) => student.id === id)?.status === 'INACTIVE').length} inactive student(s) to active status?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkRestore} className="bg-green-600 hover:bg-green-700">
              Restore Students
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this student from the database. This action cannot be undone and all associated data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPermanentDelete} className="bg-red-600 hover:bg-red-700">
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
