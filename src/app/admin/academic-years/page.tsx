'use client'

import { useState, useEffect } from 'react'
import { AcademicYear } from '@prisma/client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { academicYearSchema, type AcademicYearFormData } from '@/lib/validations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Loader2, CheckCircle2, X } from 'lucide-react'

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<AcademicYearFormData>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      terms: [{ name: 'Term 1', startDate: '', endDate: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'terms',
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
        terms: selectedYear.terms.map(t => ({
          name: t.name,
          startDate: new Date(t.startDate).toISOString().split('T')[0],
          endDate: new Date(t.endDate).toISOString().split('T')[0],
        })),
      })
    } else {
      reset({
        year: '',
        startDate: '',
        endDate: '',
        isActive: false,
        terms: [{ name: 'Term 1', startDate: '', endDate: '' }],
      })
    }
  }, [selectedYear, reset])

  const handleEdit = (year: AcademicYear) => {
    setSelectedYear(year)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this academic year?')) return

    try {
      const response = await fetch(`/api/academic-years/${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchAcademicYears()
      } else {
        alert('Failed to delete academic year')
      }
    } catch (error) {
      alert('Failed to delete academic year')
    }
  }

  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/academic-years/${id}/activate`, { method: 'PUT' })
      if (response.ok) {
        fetchAcademicYears()
      } else {
        alert('Failed to activate academic year')
      }
    } catch (error) {
      alert('Failed to activate academic year')
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

      fetchAcademicYears()
      setIsFormOpen(false)
      setSelectedYear(null)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Years</h1>
          <p className="text-gray-600 mt-1">Manage academic years and terms</p>
        </div>
        <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Academic Year
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Academic Years ({academicYears.length})</CardTitle>
          <CardDescription>Manage academic years, terms, and set active year</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academicYears.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
                          <div className="flex flex-wrap gap-1">
                            {year.terms.map((term, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {term.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Terms *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', startDate: '', endDate: '' })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Term
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="border p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Term {index + 1}</Label>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Term Name</Label>
                        <Input {...register(`terms.${index}.name`)} placeholder="Term 1" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Start Date</Label>
                        <Input type="date" {...register(`terms.${index}.startDate`)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Date</Label>
                        <Input type="date" {...register(`terms.${index}.endDate`)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {errors.terms && <p className="text-sm text-red-600">{errors.terms.message}</p>}
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
    </div>
  )
}
