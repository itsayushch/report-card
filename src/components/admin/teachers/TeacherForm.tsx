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
import { Checkbox } from '@/components/ui/checkbox'
import { teacherSchema, type TeacherFormData } from '@/lib/validations'
import { Loader2, X, Shield } from 'lucide-react'
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
  const [isAdmin, setIsAdmin] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: '',
      email: '',
      classSubjectPairs: [],
      isAdmin: false,
    },
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
        isAdmin: teacher.isAdmin || false,
      }
      reset(data)
      setOriginalData(data)
      setClassSubjectPairs(teacher.classSubjectPairs || [])
      setIsAdmin(teacher.isAdmin || false)
    } else {
      const data = { name: '', email: '', classSubjectPairs: [], isAdmin: false }
      reset(data)
      setOriginalData(data)
      setClassSubjectPairs([])
      setIsAdmin(false)
    }
    setHasChanges(false)
    setSelectedClass('')
    setSelectedSubject('')
  }, [teacher, reset])

  // Check for changes
  useEffect(() => {
    if (!originalData) return

    const currentData = {
      ...formValues,
      classSubjectPairs,
      isAdmin,
    }

    const hasFormChanges = JSON.stringify(currentData) !== JSON.stringify(originalData)
    setHasChanges(hasFormChanges)
  }, [formValues, classSubjectPairs, isAdmin, originalData])

  const addPair = () => {
    if (selectedClass && selectedSubject) {
      const subjectName = getSubjectNameById(selectedSubject, selectedClass)
      const isDuplicate = classSubjectPairs.some(
        p => p.classAssigned === selectedClass && p.subject === subjectName
      )

      if (isDuplicate) {
        toast.error('This subject is already assigned to this class')
      } else {
        const updated = [...classSubjectPairs, {
          subject: subjectName,
          classAssigned: selectedClass
        }]
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
        body: JSON.stringify({ ...data, isAdmin }),
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

          {/* Admin Privileges */}
          {(!teacher || !teacher.isSuperAdmin) && (
            <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
              <Checkbox 
                id="isAdmin" 
                checked={isAdmin}
                onCheckedChange={(checked) => setIsAdmin(checked as boolean)}
              />
              <Label htmlFor="isAdmin" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-600" />
                Grant Admin Privileges
              </Label>
            </div>
          )}

          {teacher?.isSuperAdmin && (
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-amber-50 border-amber-200">
              <Shield className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">Super Administrator</span>
              <Badge className="bg-amber-500 hover:bg-amber-600 ml-auto">Protected</Badge>
            </div>
          )}

          {/* Class & Subject Assignment */}
          <div className="space-y-2">
            <Label>Class & Subject Assignments</Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>
                        {formatClass(cls)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                  disabled={!selectedClass}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addPair}
              disabled={!selectedClass || !selectedSubject}
              className="w-full"
            >
              Add Subject
            </Button>

            {/* Current Assignments */}
            {classSubjectPairs.length > 0 && (
              <div className="border rounded-md p-3 space-y-2 bg-gray-50">
                <p className="text-sm font-medium text-gray-700">Current Assignments:</p>
                <div className="space-y-1">
                  {classSubjectPairs.map((pair, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white rounded border"
                    >
                      <span className="text-sm">
                        <span className="font-medium">Class {formatClass(pair.classAssigned)}</span>
                        {' - '}
                        <span className="text-gray-600">{pair.subject}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePair(pair)}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {classSubjectPairs.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                No classes assigned yet.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !hasChanges}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {teacher ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{teacher ? 'Update Teacher' : 'Create Teacher'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
