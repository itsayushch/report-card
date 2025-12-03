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

type ClassSubjectPair = {
  subject: string
  classAssigned: string
}

// Helper to get subject name from ID
function getSubjectNameById(subjectId: string, classNum: string): string {
  const subjects = getSubjectsForClasses([classNum])
  const subject = subjects.find(s => s.id === subjectId)
  return subject ? subject.name : subjectId
}

export function TeacherForm({ open, onOpenChange, teacher, onSuccess }: TeacherFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [classSubjectPairs, setClassSubjectPairs] = useState<ClassSubjectPair[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [originalData, setOriginalData] = useState<TeacherFormData | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
  })

  const formValues = watch()

  // Get available subjects for currently selected class
  const availableSubjects = selectedClass
    ? getSubjectsForClasses([selectedClass])
    : []

  useEffect(() => {
    if (teacher) {
      // Use classSubjectPairs directly from teacher data
      const data = {
        name: teacher.name,
        email: teacher.email,
        classSubjectPairs: teacher.classSubjectPairs || [],
      }
      reset(data)
      setOriginalData(data)
      setClassSubjectPairs(teacher.classSubjectPairs || [])
    } else {
      const data = { name: '', email: '', classSubjectPairs: [] }
      reset(data)
      setOriginalData(data)
      setClassSubjectPairs([])
    }
    setHasChanges(false)
    setSelectedClass('')
    setSelectedSubject('')
  }, [teacher, reset])

  // Check for changes
  useEffect(() => {
    if (!originalData) return

    const pairsEqual = (a: ClassSubjectPair[], b: ClassSubjectPair[]) => {
      if (a.length !== b.length) return false
      const sortedA = [...a].sort((x, y) => `${x.classAssigned}-${x.subject}`.localeCompare(`${y.classAssigned}-${y.subject}`))
      const sortedB = [...b].sort((x, y) => `${x.classAssigned}-${x.subject}`.localeCompare(`${y.classAssigned}-${y.subject}`))
      return sortedA.every((val, idx) => val.classAssigned === sortedB[idx].classAssigned && val.subject === sortedB[idx].subject)
    }

    const changed = 
      formValues.name !== originalData.name ||
      formValues.email !== originalData.email ||
      !pairsEqual(classSubjectPairs, originalData.classSubjectPairs)

    setHasChanges(changed)
  }, [formValues, classSubjectPairs, originalData])

  const addPair = () => {
    if (selectedClass && selectedSubject) {
      const exists = classSubjectPairs.some(
        p => p.classAssigned === selectedClass && p.subject === selectedSubject
      )
      
      if (!exists) {
        const newPair = { subject: selectedSubject, classAssigned: selectedClass }
        const updated = [...classSubjectPairs, newPair].sort((a, b) => {
          const classCompare = parseInt(a.classAssigned) - parseInt(b.classAssigned)
          if (classCompare !== 0) return classCompare
          return a.subject.localeCompare(b.subject)
        })
        setClassSubjectPairs(updated)
        setValue('classSubjectPairs', updated)
        
        setSelectedClass('')
        setSelectedSubject('')
      }
    }
  }

  const removePair = (pair: ClassSubjectPair) => {
    const updated = classSubjectPairs.filter(
      p => !(p.classAssigned === pair.classAssigned && p.subject === pair.subject)
    )
    setClassSubjectPairs(updated)
    setValue('classSubjectPairs', updated)
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

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register('email')} placeholder="teacher@sthelens.edu" />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          {/* Class-Subject Pairs */}
          <div className="space-y-2">
            <Label>Assign Class-Subject (Optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(c => (
                    <SelectItem key={c} value={c}>Class {formatClass(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedClass ? "Select subject" : "Select class first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={addPair}
              disabled={!selectedClass || !selectedSubject}
              className="w-full mt-2"
            >
              Add Class-Subject Pair
            </Button>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {classSubjectPairs.map((pair, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm px-3 py-1.5">
                  Class {formatClass(pair.classAssigned)} - {getSubjectNameById(pair.subject, pair.classAssigned)}
                  <button type="button" onClick={() => removePair(pair)} className="ml-2">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
              {classSubjectPairs.length === 0 && (
                <p className="text-sm text-gray-500">No class-subject pairs assigned yet</p>
              )}
            </div>
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
