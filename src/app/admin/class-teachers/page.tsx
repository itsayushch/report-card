'use client'

import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2, GraduationCap } from 'lucide-react'
import { formatClass } from '@/lib/class-utils'
import { Label } from '@/components/ui/label'
import { getSignatureUrl } from '@/lib/signatures'
import Image from 'next/image'

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

interface Teacher {
  id: string
  name: string
  email: string
}

interface ClassTeacher {
  id: string
  teacherId: string
  class: string
  createdAt: string
  updatedAt: string
  teacher: {
    id: string
    name: string
    email: string
  }
}

export default function ClassTeachersPage() {
  const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    teacherId: '',
    class: '',
  })

  useEffect(() => {
    fetchTeachers()
    fetchClassTeachers()
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

  const fetchClassTeachers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/class-teachers')
      const data = await response.json()
      setClassTeachers(data.classTeachers || [])
    } catch {
      toast.error('Failed to fetch class teachers')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (classTeacher?: ClassTeacher) => {
    if (classTeacher) {
      setEditingId(classTeacher.id)
      setFormData({
        teacherId: classTeacher.teacherId,
        class: classTeacher.class,
      })
    } else {
      setEditingId(null)
      setFormData({
        teacherId: '',
        class: '',
      })
    }
    setShowDialog(true)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingId(null)
    setFormData({
      teacherId: '',
      class: '',
    })
  }

  const handleSubmit = async () => {
    if (!formData.teacherId || !formData.class) {
      toast.error('Please fill all fields')
      return
    }

    try {
      const url = editingId
        ? `/api/admin/class-teachers/${editingId}`
        : '/api/admin/class-teachers'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save class teacher')
      }

      toast.success(
        editingId
          ? 'Class teacher updated successfully'
          : 'Class teacher assigned successfully'
      )
      handleCloseDialog()
      fetchClassTeachers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save class teacher')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this class teacher assignment?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/class-teachers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete class teacher')
      }

      toast.success('Class teacher assignment removed successfully')
      fetchClassTeachers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete class teacher')
    }
  }

  // Get classes that already have a teacher assigned (exclude current class when editing)
  const assignedClasses = classTeachers
    .filter((ct) => !editingId || ct.id !== editingId)
    .map((ct) => ct.class)
  const availableClasses = CLASSES.filter((c) => !assignedClasses.includes(c))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Class Teachers</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Assign teachers as class teachers to manage student promotions
        </p>
      </div>

      <Card className="w-full">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg md:text-xl">Class Teacher Assignments</CardTitle>
              <CardDescription className="text-sm">
                Manage which teachers are assigned as class teachers
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Assign Class Teacher
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : classTeachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">No class teachers assigned for this academic year</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Class</TableHead>
                    <TableHead className="min-w-[150px]">Teacher Name</TableHead>
                    <TableHead className="min-w-[120px] hidden sm:table-cell">Signature</TableHead>
                    <TableHead className="min-w-[200px] hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classTeachers.sort((a, b) => Number(a.class) - Number(b.class)).map((ct) => (
                    <TableRow key={ct.id}>
                      <TableCell>
                        <Badge variant="outline">{formatClass(ct.class)}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{ct.teacher.name}</TableCell>
                      <TableCell className="hidden sm:table-cell align-middle">
                        <div className="flex items-center">
                          <Image
                            src={getSignatureUrl(ct.class)}
                            alt={`${ct.teacher.name} signature`}
                            width={120}
                            height={40}
                            className="h-10 object-contain max-w-[120px]"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {ct.teacher.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(ct)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(ct.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {editingId ? 'Edit Class Teacher' : 'Assign Class Teacher'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingId
                ? 'Update the class teacher assignment'
                : 'Assign a teacher as a class teacher for a specific class'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Teacher</Label>
              <Select
                value={formData.teacherId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, teacherId: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      <span className="text-sm">{teacher.name} ({teacher.email})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Class</Label>
              <Select
                value={formData.class}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, class: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((className) => (
                    <SelectItem key={className} value={className}>
                      {formatClass(className)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto">
              {editingId ? 'Update' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
