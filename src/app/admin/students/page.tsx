'use client'

import { useState, useEffect, useCallback } from 'react'
import { Student } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StudentTable } from '@/components/admin/students/StudentTable'
import { StudentForm } from '@/components/admin/students/StudentForm'
import { StudentFilters } from '@/components/admin/students/StudentFilters'
import { Plus, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react'
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
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  })

  // Filters
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
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
      if (sectionFilter && sectionFilter !== 'all') params.append('section', sectionFilter)
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
  }, [pagination.page, pagination.limit, search, classFilter, sectionFilter, statusFilter])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const handleEdit = (student: Student) => {
    setSelectedStudent(student)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchStudents()
      } else {
        alert('Failed to delete student')
      }
    } catch (error) {
      alert('Failed to delete student')
    }
  }

  const handleFormSuccess = () => {
    fetchStudents()
    setSelectedStudent(null)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-gray-600 mt-1">Manage student records</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Link href="/admin/students/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </Link>
          <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter students</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentFilters
            search={search}
            classFilter={classFilter}
            sectionFilter={sectionFilter}
            statusFilter={statusFilter}
            onSearchChange={(value) => {
              setSearch(value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            onClassChange={(value) => {
              setClassFilter(value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            onSectionChange={(value) => {
              setSectionFilter(value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            onStatusChange={(value) => {
              setStatusFilter(value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Students ({pagination.total})</CardTitle>
          <CardDescription>
            Showing {students.length} of {pagination.total} students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <StudentTable
                students={students}
                onEdit={handleEdit}
                onDelete={handleDelete}
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
    </div>
  )
}
