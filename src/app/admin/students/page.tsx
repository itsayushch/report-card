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
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null)
  const [bulkInactiveDialogOpen, setBulkInactiveDialogOpen] = useState(false)
  const [bulkActiveDialogOpen, setBulkActiveDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
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

  const handleBulkMarkInactive = () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students to mark as inactive')
      return
    }
    setBulkInactiveDialogOpen(true)
  }

  const confirmBulkInactive = async () => {
    try {
      const response = await fetch('/api/students/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudents,
          status: 'INACTIVE',
        }),
      })

      if (response.ok) {
        toast.success(`${selectedStudents.length} student(s) marked as inactive`)
        setSelectedStudents([])
        fetchStudents()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update students')
      }
    } catch (error) {
      toast.error('Failed to update students')
    } finally {
      setBulkInactiveDialogOpen(false)
    }
  }

  const handleBulkMarkActive = () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students to mark as active')
      return
    }
    setBulkActiveDialogOpen(true)
  }

  const confirmBulkActive = async () => {
    try {
      const response = await fetch('/api/students/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudents,
          status: 'ACTIVE',
        }),
      })

      if (response.ok) {
        toast.success(`${selectedStudents.length} student(s) marked as active`)
        setSelectedStudents([])
        fetchStudents()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update students')
      }
    } catch (error) {
      toast.error('Failed to update students')
    } finally {
      setBulkActiveDialogOpen(false)
    }
  }

  const handleBulkDelete = () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students to delete')
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  const confirmBulkDelete = async () => {
    try {
      const response = await fetch('/api/students/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudents,
        }),
      })

      if (response.ok) {
        toast.success(`${selectedStudents.length} student(s) deleted successfully`)
        setSelectedStudents([])
        fetchStudents()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete students')
      }
    } catch (error) {
      toast.error('Failed to delete students')
    } finally {
      setBulkDeleteDialogOpen(false)
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
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const selectedStudentObjects = students.filter(s => selectedStudents.includes(s.id))
                  const activeCount = selectedStudentObjects.filter(s => s.status === 'ACTIVE').length
                  const inactiveCount = selectedStudentObjects.filter(s => s.status === 'INACTIVE').length
                  
                  // Show Mark as Active if more inactive, or if equal count, or if all are inactive
                  const showMarkAsActive = inactiveCount >= activeCount
                  
                  return showMarkAsActive ? (
                    <Button 
                      onClick={handleBulkMarkActive} 
                      variant="outline"
                      size="sm"
                    >
                      Mark {selectedStudents.length} as Active
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleBulkMarkInactive} 
                      variant="outline"
                      size="sm"
                    >
                      Mark {selectedStudents.length} as Inactive
                    </Button>
                  )
                })()}
                <Button 
                  onClick={handleBulkDelete} 
                  variant="destructive"
                  size="sm"
                >
                  Delete {selectedStudents.length}
                </Button>
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
              This will permanently delete this student. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkInactiveDialogOpen} onOpenChange={setBulkInactiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Students as Inactive?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedStudents.length} student(s) as inactive?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkInactive}>
              Mark Inactive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkActiveDialogOpen} onOpenChange={setBulkActiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Students as Active?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedStudents.length} student(s) as active?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkActive}>
              Mark Active
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Students?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedStudents.length} student(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
