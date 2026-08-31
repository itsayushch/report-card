'use client'

import { useEffect, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { formatClass, formatClassSection, formatSection } from '@/lib/class-utils'
import { getSignatureUrl } from '@/lib/signatures'
import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { SignatureUploadDialog } from '@/components/admin/class-teachers/SignatureUploadDialog'
import { Upload } from 'lucide-react'

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const NO_SECTION_VALUE = '__classwide__'

interface Teacher {
  id: string
  name: string
  email: string
}

interface ClassSection {
  id: string
  class: string
  name: string
  isActive: boolean
}

interface ClassTeacher {
  id: string
  teacherId: string
  class: string
  section?: string | null
  createdAt: string
  updatedAt: string
  teacher?: {
    id: string
    name: string
    email: string
  } | null
}

export default function ClassTeachersPage() {
  const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([])
  const [sections, setSections] = useState<ClassSection[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Signature upload state
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [uploadClass, setUploadClass] = useState<string>('')
  const [uploadSection, setUploadSection] = useState<string | null>(null)
  const [signatureTimestamp, setSignatureTimestamp] = useState(Date.now())

  const [formData, setFormData] = useState({
    teacherId: '',
    class: '',
    section: NO_SECTION_VALUE,
  })

  useEffect(() => {
    fetchTeachers()
    fetchSections()
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

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/admin/sections?activeOnly=true')
      const data = await response.json()
      setSections(data.sections || [])
    } catch {
      toast.error('Failed to fetch sections')
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
        section: classTeacher.section || NO_SECTION_VALUE,
      })
    } else {
      setEditingId(null)
      setFormData({
        teacherId: '',
        class: '',
        section: NO_SECTION_VALUE,
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
      section: NO_SECTION_VALUE,
    })
  }

  const handleSubmit = async () => {
    if (!formData.teacherId || !formData.class) {
      toast.error('Please fill all fields')
      return
    }

    try {
      const url = editingId ? `/api/admin/class-teachers/${editingId}` : '/api/admin/class-teachers'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: formData.teacherId,
          class: formData.class,
          section: formData.section === NO_SECTION_VALUE ? null : formData.section,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save class teacher')
      }

      toast.success(editingId ? 'Class teacher updated successfully' : 'Class teacher assigned successfully')
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

  const assignedClassSections = classTeachers
    .filter((ct) => !editingId || ct.id !== editingId)
    .map((ct) => `${ct.class}::${ct.section || ''}`)

  const availableSections = sections
    .filter((section) => section.class === formData.class && section.isActive)
    .filter((section) => !assignedClassSections.includes(`${section.class}::${section.name}`))

  const canUseClassWideAssignment =
    formData.class &&
    !assignedClassSections.includes(`${formData.class}::`)

  const assignmentSections = [
    ...(canUseClassWideAssignment
      ? [{ value: NO_SECTION_VALUE, label: 'Class-wide' }]
      : []),
    ...availableSections.map((section) => ({
      value: section.name,
      label: section.name,
    })),
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Class Teachers</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Assign teachers to classes and sections
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
              <p className="text-sm md:text-base">No class teachers assigned</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Class / Section</TableHead>
                    <TableHead className="min-w-[150px]">Teacher Name</TableHead>
                    <TableHead className="min-w-[120px] hidden sm:table-cell">Signature</TableHead>
                    <TableHead className="min-w-[200px] hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classTeachers
                    .slice()
                    .sort((a, b) => Number(a.class) - Number(b.class) || formatSection(a.section).localeCompare(formatSection(b.section)))
                    .map((ct) => {
                      const teacherName = ct.teacher?.name || 'Not assigned'
                      const teacherEmail = ct.teacher?.email || 'Not assigned'
                      const hasTeacher = Boolean(ct.teacher?.name)

                      return (
                        <TableRow key={ct.id}>
                          <TableCell>
                            <Badge variant="outline">{formatClassSection(ct.class, ct.section)}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{teacherName}</TableCell>
                          <TableCell className="hidden sm:table-cell align-middle">
                            {hasTeacher ? (
                              <div className="flex items-center">
                                <Image
                                  src={`${getSignatureUrl(ct.class, ct.section)}?t=${signatureTimestamp}`}
                                  alt={`${teacherName} signature`}
                                  width={120}
                                  height={40}
                                  className="h-10 object-contain max-w-[120px]"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">
                            {teacherEmail}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                              {hasTeacher && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Upload Signature"
                                  onClick={() => {
                                    setUploadClass(ct.class)
                                    setUploadSection(ct.section || null)
                                    setShowSignatureDialog(true)
                                  }}
                                >
                                  <Upload className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
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
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {editingId ? 'Edit Class Teacher' : 'Assign Class Teacher'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Assign a teacher to a class or section
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Teacher</Label>
              <Select
                value={formData.teacherId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, teacherId: value }))}
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
                onValueChange={(value) => setFormData((prev) => ({ ...prev, class: value, section: NO_SECTION_VALUE }))}
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
              <Label className="text-sm">Section</Label>
              <Select
                value={formData.section}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, section: value }))}
                disabled={!formData.class || assignmentSections.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {assignmentSections.map((section) => (
                    <SelectItem key={section.value} value={section.value}>
                      {section.label}
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

      <SignatureUploadDialog 
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        className={uploadClass}
        sectionName={uploadSection}
        onSuccess={() => {
          setSignatureTimestamp(Date.now())
        }}
      />
    </div>
  )
}
