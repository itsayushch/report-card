'use client'

import { useState, useEffect } from 'react'
import { Teacher } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { teacherSchema, type TeacherFormData } from '@/lib/validations'
import { Loader2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getSubjectsForClasses } from '@/lib/subjects'
import { formatClass } from '@/lib/class-utils'

interface TeacherFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: Teacher | null
  onSuccess: () => void
}

const availableClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export function TeacherForm({ open, onOpenChange, teacher, onSuccess }: TeacherFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [subjectInput, setSubjectInput] = useState('')
  const [classInput, setClassInput] = useState('')
  const [originalData, setOriginalData] = useState<TeacherFormData | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
  })

  const formValues = watch()

  // Get available subjects based on selected classes
  const availableSubjects = selectedClasses.length > 0 
    ? getSubjectsForClasses(selectedClasses).map(s => s.name)
    : []

  useEffect(() => {
    if (teacher) {
      const data = {
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        subjects: teacher.subjects,
        assignedClasses: teacher.assignedClasses,
      }
      reset(data)
      setOriginalData(data)
      setSelectedSubjects(teacher.subjects)
      setSelectedClasses(teacher.assignedClasses)
    } else {
      const data = { name: '', email: '', phone: '', subjects: [], assignedClasses: [] }
      reset(data)
      setOriginalData(data)
      setSelectedSubjects([])
      setSelectedClasses([])
    }
    setHasChanges(false)
  }, [teacher, reset])

  // Check for changes
  useEffect(() => {
    if (!originalData) return

    const arraysEqual = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false
      const sortedA = [...a].sort()
      const sortedB = [...b].sort()
      return sortedA.every((val, idx) => val === sortedB[idx])
    }

    const changed = 
      formValues.name !== originalData.name ||
      formValues.email !== originalData.email ||
      formValues.phone !== originalData.phone ||
      !arraysEqual(selectedSubjects, originalData.subjects) ||
      !arraysEqual(selectedClasses, originalData.assignedClasses)

    setHasChanges(changed)
  }, [formValues, selectedSubjects, selectedClasses, originalData])

  const addSubject = (subject: string) => {
    if (subject && !selectedSubjects.includes(subject)) {
      const updated = [...selectedSubjects, subject].sort((a, b) => a.localeCompare(b))
      setSelectedSubjects(updated)
      setValue('subjects', updated)
      setSubjectInput('')
    }
  }

  const removeSubject = (subject: string) => {
    const updated = selectedSubjects.filter(s => s !== subject)
    setSelectedSubjects(updated)
    setValue('subjects', updated)
  }

  const addClass = (cls: string) => {
    if (cls && !selectedClasses.includes(cls)) {
      // Numeric order (1, 2, 3, ...)
      const updated = [...selectedClasses, cls].sort((a, b) => {
        return parseInt(a) - parseInt(b)
      })
      setSelectedClasses(updated)
      setValue('assignedClasses', updated)
      setClassInput('')
    }
  }

  const removeClass = (cls: string) => {
    const updated = selectedClasses.filter(c => c !== cls)
    setSelectedClasses(updated)
    setValue('assignedClasses', updated)
  }

  const onSubmit = async (data: TeacherFormData) => {
    try {
      setIsLoading(true)
      const url = teacher ? `/api/teachers/${teacher.id}` : '/api/teachers'
      const method = teacher ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save teacher')
      }

      toast.success(teacher ? 'Teacher updated successfully' : 'Teacher created successfully')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{teacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
          <DialogDescription>
            {teacher ? 'Update teacher information' : 'Create a new teacher record'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="Enter teacher name" />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register('email')} placeholder="teacher@sthelens.edu" />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" {...register('phone')} placeholder="+1234567890" />
              {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
            </div>
          </div>

          {/* Classes selection comes FIRST */}
          <div className="space-y-2">
            <Label>Assigned Classes *</Label>
            <Select value={classInput} onValueChange={(value) => {
              addClass(value)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses
                  .filter(c => !selectedClasses.includes(c))
                  .map(c => (
                    <SelectItem key={c} value={c}>Class {formatClass(c)}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedClasses.map(c => (
                <Badge key={c} variant="secondary" className="text-sm px-3 py-1.5">
                  Class {formatClass(c)}
                  <button type="button" onClick={() => removeClass(c)} className="ml-2">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
            {errors.assignedClasses && <p className="text-sm text-red-600">{errors.assignedClasses.message}</p>}
          </div>

          {/* Subjects selection comes SECOND (based on selected classes) */}
          <div className="space-y-2">
            <Label>Subjects {selectedClasses.length > 0 && '*'}</Label>
            <Select 
              value={subjectInput} 
              onValueChange={(value) => {
                addSubject(value)
              }}
              disabled={selectedClasses.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedClasses.length === 0 ? "Select classes first" : "Select subject"} />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects
                  .filter(s => !selectedSubjects.includes(s))
                  .sort((a, b) => a.localeCompare(b))
                  .map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedSubjects.map(s => (
                <Badge key={s} variant="secondary" className="text-sm px-3 py-1.5">
                  {s}
                  <button type="button" onClick={() => removeSubject(s)} className="ml-2">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
            {selectedClasses.length > 0 && errors.subjects && <p className="text-sm text-red-600">{errors.subjects.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!!teacher && !hasChanges)}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {teacher ? 'Update' : 'Create'} Teacher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
