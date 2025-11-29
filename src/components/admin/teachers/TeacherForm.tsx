'use client'

import { useState, useEffect } from 'react'
import { Teacher } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { teacherSchema, type TeacherFormData } from '@/lib/validations'
import { Loader2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TeacherFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: Teacher | null
  onSuccess: () => void
}

const availableSubjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education']
const availableClasses = ['1-A', '1-B', '2-A', '2-B', '3-A', '3-B', '4-A', '4-B', '5-A', '5-B', '6-A', '6-B', '7-A', '7-B', '8-A', '8-B', '9-A', '9-B', '10-A', '10-B', '11-A', '11-B', '12-A', '12-B']

export function TeacherForm({ open, onOpenChange, teacher, onSuccess }: TeacherFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [subjectInput, setSubjectInput] = useState('')
  const [classInput, setClassInput] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
  })

  useEffect(() => {
    if (teacher) {
      reset({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        subjects: teacher.subjects,
        assignedClasses: teacher.assignedClasses,
      })
      setSelectedSubjects(teacher.subjects)
      setSelectedClasses(teacher.assignedClasses)
    } else {
      reset({ name: '', email: '', phone: '', subjects: [], assignedClasses: [] })
      setSelectedSubjects([])
      setSelectedClasses([])
    }
  }, [teacher, reset])

  const addSubject = (subject: string) => {
    if (subject && !selectedSubjects.includes(subject)) {
      const updated = [...selectedSubjects, subject]
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
      const updated = [...selectedClasses, cls]
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

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      alert(error.message)
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

          <div className="space-y-2">
            <Label>Subjects *</Label>
            <div className="flex gap-2">
              <Input
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                placeholder="Type or select subject"
                list="subjects-list"
              />
              <datalist id="subjects-list">
                {availableSubjects.map(s => <option key={s} value={s} />)}
              </datalist>
              <Button type="button" onClick={() => addSubject(subjectInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedSubjects.map(s => (
                <Badge key={s} variant="secondary">
                  {s}
                  <button type="button" onClick={() => removeSubject(s)} className="ml-2">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {errors.subjects && <p className="text-sm text-red-600">{errors.subjects.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Assigned Classes *</Label>
            <div className="flex gap-2">
              <Input
                value={classInput}
                onChange={(e) => setClassInput(e.target.value)}
                placeholder="Type or select class"
                list="classes-list"
              />
              <datalist id="classes-list">
                {availableClasses.map(c => <option key={c} value={c} />)}
              </datalist>
              <Button type="button" onClick={() => addClass(classInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedClasses.map(c => (
                <Badge key={c} variant="secondary">
                  {c}
                  <button type="button" onClick={() => removeClass(c)} className="ml-2">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {errors.assignedClasses && <p className="text-sm text-red-600">{errors.assignedClasses.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {teacher ? 'Update' : 'Create'} Teacher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
