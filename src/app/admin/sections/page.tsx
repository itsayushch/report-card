'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Badge } from '@/components/ui/badge'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatClass } from '@/lib/class-utils'
import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

interface Teacher {
  id: string
  name: string
  email: string
}

interface ClassSection {
  id: string
  class: string
  name: string
  teacherId?: string | null
}

export default function SectionsPage() {
  const [sections, setSections] = useState<ClassSection[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    class: '',
    name: '',
    teacherId: '',
  })

  useEffect(() => {
    fetchSections()
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers')
      const data = await response.json()
      setTeachers(data.teachers || [])
    } catch {
      toast.error('Failed to fetch teachers')
    }
  }

  const fetchSections = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/sections')
      const data = await response.json()
      setSections(data.sections || [])
    } catch {
      toast.error('Failed to fetch sections')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (section?: ClassSection, preselectClass?: string) => {
    if (section) {
      setEditingId(section.id)
      setFormData({
        class: section.class,
        name: section.name,
        teacherId: section.teacherId || '',
      })
    } else {
      setEditingId(null)
      setFormData({
        class: preselectClass || '',
        name: '',
        teacherId: '',
      })
    }
    setShowDialog(true)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingId(null)
    setFormData({
      class: '',
      name: '',
      teacherId: '',
    })
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!formData.class || !formData.name.trim()) {
      toast.error('Please fill all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingId ? `/api/admin/sections/${editingId}` : '/api/admin/sections'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class: formData.class,
          name: formData.name,
          teacherId: formData.teacherId || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save section')
      }

      toast.success(editingId ? 'Section updated successfully' : 'Section created successfully')
      handleCloseDialog()
      fetchSections()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save section')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/sections/${deletingId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete section')
      }

      toast.success('Section deleted successfully')
      fetchSections()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete section')
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Sections</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Create and manage named sections for each class
        </p>
      </div>

      <Card className="w-full">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg md:text-xl">Class Sections</CardTitle>
              <CardDescription className="text-sm">
                Add as many sections as each class needs
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">No sections created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Class</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(new Set(sections.map(s => s.class)))
                    .sort((a, b) => {
                      const aIndex = CLASSES.indexOf(a)
                      const bIndex = CLASSES.indexOf(b)
                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
                      if (aIndex !== -1) return -1
                      if (bIndex !== -1) return 1
                      return a.localeCompare(b)
                    })
                    .map((className) => {
                    const classSections = sections.filter((s) => s.class === className)
                    if (classSections.length === 0) return null

                    return (
                      <TableRow key={className}>
                        <TableCell className="font-medium whitespace-nowrap">
                          Class {formatClass(className)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {classSections.map((section) => (
                              <Badge 
                                key={section.id} 
                                variant="secondary" 
                                className="flex flex-col items-start gap-1 px-3 py-1.5 text-sm font-normal"
                              >
                                <div className="flex items-center w-full justify-between gap-4">
                                  <span>{section.name}</span>
                                  <div className="flex items-center gap-1 border-l border-border/50 pl-2">
                                    <button
                                      onClick={() => handleOpenDialog(section)}
                                      className="text-muted-foreground hover:text-foreground transition-colors"
                                      title="Edit section"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(section.id)}
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                      title="Delete section"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                {section.teacherId && (
                                  <span className="text-xs text-muted-foreground">
                                    Teacher: {teachers.find(t => t.id === section.teacherId)?.name || 'Unknown'}
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(null)
                              setFormData({ class: className, name: '', teacherId: '' })
                              setShowDialog(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">
                {editingId ? 'Edit Section' : 'Add Section'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Create or update a named section for a class
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm">Class</Label>
                <Select
                  value={formData.class}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, class: value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((className) => (
                      <SelectItem key={className} value={className}>
                        Class {formatClass(className)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sectionName" className="text-sm">Section Name</Label>
                <Input
                  id="sectionName"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="A, B, Science, Commerce..."
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Class Teacher (Optional)</Label>
                <Select
                  value={formData.teacherId || 'none'}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, teacherId: value === 'none' ? '' : value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">None</span>
                    </SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingId ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingId ? 'Update' : 'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && !isDeleting && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the section and unlink it from any students.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
