'use client'

import { useState, useEffect, useCallback } from 'react'
import { Student } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StudentTable } from '@/components/admin/students/StudentTable'
import { StudentForm } from '@/components/admin/students/StudentForm'
import { StudentFilters } from '@/components/admin/students/StudentFilters'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, ChevronLeft, ChevronRight, Download, Upload, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import Papa from 'papaparse'
import Link from 'next/link'

interface PaginationData {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false)
  const [bulkRestoreDialogOpen, setBulkRestoreDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null)
  const [studentToPermanentDelete, setStudentToPermanentDelete] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  })

  // Filters
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (search) params.append('search', search)
      if (classFilter && classFilter !== 'all') params.append('class', classFilter)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/students?${params}`)
      const data = await response.json()

      setStudents(data.students)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch students:', error)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, search, classFilter, statusFilter])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

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
        fetchStudents()
      } else {
        toast.error('Failed to delete student')
      }
    } catch (error) {
      toast.error('Failed to delete student')
    } finally {
      setDeleteDialogOpen(false)
      setStudentToDelete(null)
    }
  }

  const handleFormSuccess = () => {
    fetchStudents()
    setSelectedStudent(null)
  }

  const handleRestore = async (id: string) => {
    try {
      const response = await fetch(`/api/students/${id}/restore`, {
        method: 'PATCH',
      })

      if (response.ok) {
        toast.success('Student restored successfully')
        fetchStudents()
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
        fetchStudents()
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
    if (selectedStudents.length === 0) {
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
        body: JSON.stringify({
          studentIds: selectedStudents,
        }),
      })

      if (response.ok) {
        toast.success(`${selectedStudents.length} student(s) restored successfully`)
        setSelectedStudents([])
        fetchStudents()
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

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map(s => s.id))
    }
  }

  const handleSelectStudent = (id: string) => {
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
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Link href="/admin/students/import">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </Link>
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
            {selectedStudents.length > 0 && (() => {
              const selectedStudentObjects = students.filter(s => selectedStudents.includes(s.id))
              const inactiveCount = selectedStudentObjects.filter(s => s.status === 'INACTIVE').length
              
              return inactiveCount > 0 ? (
                <Button 
                  onClick={handleBulkRestore} 
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:text-green-700 hover:bg-green-50 hover:border-green-300"
                >
                  Restore {inactiveCount} Student{inactiveCount > 1 ? 's' : ''}
                </Button>
              ) : null
            })()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="pb-4 border-b">
            <StudentFilters
              search={search}
              classFilter={classFilter}
              statusFilter={statusFilter}
              onSearchChange={(value) => {
                setSearch(value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              onClassChange={(value) => {
                setClassFilter(value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              onStatusChange={(value) => {
                setStatusFilter(value)
                setPagination(prev => ({ ...prev, page: 1 }))
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
              <StudentTable
                students={students}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
                selectedStudents={selectedStudents}
                onSelectStudent={handleSelectStudent}
                onSelectAll={handleSelectAll}
              />

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
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
              Are you sure you want to restore {selectedStudents.filter(id => students.find(s => s.id === id)?.status === 'INACTIVE').length} inactive student(s) to active status?
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
