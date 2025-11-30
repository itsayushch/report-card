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

interface TeacherFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: Teacher | null
  onSuccess: () => void
}

const availableClasses = ['1-A', '1-B', '2-A', '2-B', '3-A', '3-B', '4-A', '4-B', '5-A', '5-B', '6-A', '6-B', '7-A', '7-B', '8-A', '8-B', '9-A', '9-B', '10-A', '10-B', '11-A', '11-B', '12-A', '12-B']

export function TeacherForm({ open, onOpenChange, teacher, onSuccess }: TeacherFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])
  const [subjectInput, setSubjectInput] = useState('')
  const [classInput, setClassInput] = useState('')
  const [originalData, setOriginalData] = useState<TeacherFormData | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
  })

  const formValues = watch()

  // Fetch available subjects from database
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/subjects')
        const data = await response.json()
        const subjectNames = data.subjects.map((s: any) => s.name)
        setAvailableSubjects(subjectNames)
      } catch (error) {
        console.error('Failed to fetch subjects:', error)
      }
    }
    if (open) {
      fetchSubjects()
    }
  }, [open])

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
      const updated = [...selectedClasses, cls].sort((a, b) => {
        const numA = parseInt(a.split('-')[0])
        const numB = parseInt(b.split('-')[0])
        if (numA !== numB) return numA - numB
        return a.localeCompare(b)
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
            <Label>Subjects</Label>
            <Select value={subjectInput} onValueChange={(value) => {
              addSubject(value)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
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
            {errors.subjects && <p className="text-sm text-red-600">{errors.subjects.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Assigned Classes *</Label>
            <Select value={classInput} onValueChange={(value) => {
              addClass(value)
            }} disabled={selectedSubjects.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={selectedSubjects.length === 0 ? "Add subjects first" : "Select class"} />
              </SelectTrigger>
              <SelectContent>
                {availableClasses
                  .filter(c => !selectedClasses.includes(c))
                  .map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedClasses.map(c => (
                <Badge key={c} variant="secondary" className="text-sm px-3 py-1.5">
                  {c}
                  <button type="button" onClick={() => removeClass(c)} className="ml-2">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
            {errors.assignedClasses && selectedSubjects.length > 0 && <p className="text-sm text-red-600">{errors.assignedClasses.message}</p>}
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
