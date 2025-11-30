'use client'

import { useState, useEffect } from 'react'
import { Subject } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { subjectSchema, type SubjectFormData } from '@/lib/validations'
import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  })

  const fetchSubjects = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/subjects')
      const data = await response.json()
      setSubjects(data.subjects)
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    if (selectedSubject) {
      reset({
        name: selectedSubject.name,
        maxMarks: selectedSubject.maxMarks,
        passingMarks: selectedSubject.passingMarks,
      })
    } else {
      reset({ name: '', maxMarks: 100, passingMarks: 40 })
    }
  }, [selectedSubject, reset])

  const handleEdit = (subject: Subject) => {
    setSelectedSubject(subject)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setSubjectToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!subjectToDelete) return

    try {
      const response = await fetch(`/api/subjects/${subjectToDelete}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Subject deleted successfully')
        fetchSubjects()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete subject')
      }
    } catch (error) {
      toast.error('Failed to delete subject')
    } finally {
      setDeleteDialogOpen(false)
      setSubjectToDelete(null)
    }
  }

  const handleAddNew = () => {
    setSelectedSubject(null)
    setIsFormOpen(true)
  }

  const onSubmit = async (data: SubjectFormData) => {
    try {
      setFormLoading(true)
      const url = selectedSubject ? `/api/subjects/${selectedSubject.id}` : '/api/subjects'
      const method = selectedSubject ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save subject')
      }

      toast.success(selectedSubject ? 'Subject updated successfully' : 'Subject created successfully')
      fetchSubjects()
      setIsFormOpen(false)
      setSelectedSubject(null)
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
          <h1 className="text-3xl font-bold">Subjects</h1>
          <p className="text-gray-600 mt-1">Manage academic subjects</p>
        </div>
        <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subjects ({subjects.length})</CardTitle>
          <CardDescription>Manage subjects and marking schemes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="border-b bg-muted/50 p-4">
                  <div className="grid grid-cols-5 gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-b p-4">
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-24" />
                      <div className="flex gap-2 justify-end">
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
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Max Marks</TableHead>
                    <TableHead>Passing Marks</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No subjects found
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>{subject.maxMarks}</TableCell>
                        <TableCell>{subject.passingMarks}</TableCell>
                        <TableCell>{subject.academicYear}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.id)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              {selectedSubject ? 'Update subject information' : 'Create a new subject'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input id="name" {...register('name')} placeholder="e.g., Mathematics" />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxMarks">Max Marks *</Label>
                <Input id="maxMarks" type="number" {...register('maxMarks', { valueAsNumber: true })} placeholder="100" />
                {errors.maxMarks && <p className="text-sm text-red-600">{errors.maxMarks.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passingMarks">Passing Marks *</Label>
                <Input id="passingMarks" type="number" {...register('passingMarks', { valueAsNumber: true })} placeholder="40" />
                {errors.passingMarks && <p className="text-sm text-red-600">{errors.passingMarks.message}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={formLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedSubject ? 'Update' : 'Create'} Subject
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this subject. This action cannot be undone.
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
