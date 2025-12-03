'use client'

import { useState, useEffect } from 'react'
import { AcademicYear } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { academicYearSchema, type AcademicYearFormData } from '@/lib/validations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [yearToDelete, setYearToDelete] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AcademicYearFormData>({
    resolver: zodResolver(academicYearSchema),
  })

  const fetchAcademicYears = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/academic-years')
      const data = await response.json()
      setAcademicYears(data.academicYears)
    } catch (error) {
      console.error('Failed to fetch academic years:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAcademicYears()
  }, [])

  useEffect(() => {
    if (selectedYear) {
      reset({
        year: selectedYear.year,
        startDate: new Date(selectedYear.startDate).toISOString().split('T')[0],
        endDate: new Date(selectedYear.endDate).toISOString().split('T')[0],
        isActive: selectedYear.isActive,
      })
    } else {
      reset({
        year: '',
        startDate: '',
        endDate: '',
        isActive: false,
      })
    }
  }, [selectedYear, reset])

  const handleEdit = (year: AcademicYear) => {
    setSelectedYear(year)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setYearToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!yearToDelete) return

    try {
      const response = await fetch(`/api/academic-years/${yearToDelete}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Academic year deleted successfully')
        fetchAcademicYears()
      } else {
        toast.error('Failed to delete academic year')
      }
    } catch (error) {
      toast.error('Failed to delete academic year')
    } finally {
      setDeleteDialogOpen(false)
      setYearToDelete(null)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/academic-years/${id}/activate`, { method: 'PUT' })
      if (response.ok) {
        toast.success('Academic year activated successfully')
        fetchAcademicYears()
      } else {
        toast.error('Failed to activate academic year')
      }
    } catch (error) {
      toast.error('Failed to activate academic year')
    }
  }

  const handleAddNew = () => {
    setSelectedYear(null)
    setIsFormOpen(true)
  }

  const onSubmit = async (data: AcademicYearFormData) => {
    try {
      setFormLoading(true)
      const url = selectedYear ? `/api/academic-years/${selectedYear.id}` : '/api/academic-years'
      const method = selectedYear ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save academic year')
      }

      toast.success(selectedYear ? 'Academic year updated successfully' : 'Academic year created successfully')
      fetchAcademicYears()
      setIsFormOpen(false)
      setSelectedYear(null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Years</h1>
          <p className="text-gray-600 mt-1">Manage academic years and sessions</p>
        </div>
        <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Academic Year
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Academic Years ({academicYears.length})</CardTitle>
          <CardDescription>Manage academic years and set active year</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="border-b bg-muted/50 p-4">
                  <div className="grid grid-cols-6 gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border-b p-4">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-28" />
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                      <div className="flex gap-2 justify-end">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academicYears.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No academic years found
                      </TableCell>
                    </TableRow>
                  ) : (
                    academicYears.map((year) => (
                      <TableRow key={year.id}>
                        <TableCell className="font-medium">{year.year}</TableCell>
                        <TableCell>{new Date(year.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(year.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {year.isActive ? (
                            <Badge className="bg-green-600">Active</Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivate(year.id)}
                              className="h-7"
                            >
                              Set Active
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(year)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(year.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedYear ? 'Edit Academic Year' : 'Add New Academic Year'}</DialogTitle>
            <DialogDescription>
              {selectedYear ? 'Update academic year information' : 'Create a new academic year'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year (Format: YYYY-YYYY) *</Label>
              <Input id="year" {...register('year')} placeholder="2024-2025" />
              {errors.year && <p className="text-sm text-red-600">{errors.year.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" type="date" {...register('startDate')} />
                {errors.startDate && <p className="text-sm text-red-600">{errors.startDate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input id="endDate" type="date" {...register('endDate')} />
                {errors.endDate && <p className="text-sm text-red-600">{errors.endDate.message}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={formLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedYear ? 'Update' : 'Create'} Academic Year
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Academic Year?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this academic year. This action cannot be undone.
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
    </div>
  )
}
