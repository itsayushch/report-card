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
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [selectedYear, setSelectedYear] = useState('')
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
    } catch (error) {
      toast.error('Failed to fetch teachers')
    }
  }

  const fetchClassTeachers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/class-teachers')
      const data = await response.json()
      setClassTeachers(data.classTeachers || [])
    } catch (error) {
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to save class teacher')
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete class teacher')
    }
  }

  // Get classes that already have a teacher assigned (exclude current class when editing)
  const assignedClasses = classTeachers
    .filter((ct) => !editingId || ct.id !== editingId)
    .map((ct) => ct.class)
  const availableClasses = CLASSES.filter((c) => !assignedClasses.includes(c))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Class Teachers</h1>
        <p className="text-muted-foreground mt-1">
          Assign teachers as class teachers to manage student promotions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Class Teacher Assignments</CardTitle>
              <CardDescription>
                Manage which teachers are assigned as class teachers
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Class Teacher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : classTeachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No class teachers assigned for this academic year</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classTeachers.map((ct) => (
                  <TableRow key={ct.id}>
                    <TableCell>
                      <Badge variant="outline">{formatClass(ct.class)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{ct.teacher.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ct.teacher.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Class Teacher' : 'Assign Class Teacher'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the class teacher assignment'
                : 'Assign a teacher as a class teacher for a specific class'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select
                value={formData.teacherId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, teacherId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={formData.class}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, class: value }))
                }
              >
                <SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? 'Update' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
