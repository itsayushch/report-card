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
import { formatClass, formatSection } from '@/lib/class-utils'
import { useSections } from '@/hooks/useSections'

interface TeacherFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: Teacher | null
  onSuccess: () => void
}

const availableClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

type ClassSubjectPair = {
  subject: string
  classAssigned: string
  section?: string | null
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
  const [selectedSection, setSelectedSection] = useState('__ALL__')
  const [selectedSubject, setSelectedSubject] = useState('')
  const { data: allSections = [] } = useSections()
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
    setSelectedSection('__ALL__')
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

  // Auto-add subject when both class and subject are selected
  useEffect(() => {
    if (selectedClass && selectedSubject) {
      const isDuplicate = classSubjectPairs.some(
        p => p.classAssigned === selectedClass && p.subject === selectedSubject && p.section === (selectedSection === '__ALL__' ? null : selectedSection)
      )

      if (isDuplicate) {
        toast.error('This subject is already assigned to this class')
        setSelectedSubject('')
      } else {
        const updated = [...classSubjectPairs, {
          subject: selectedSubject,
          classAssigned: selectedClass,
          section: selectedSection === '__ALL__' ? null : selectedSection
        }]
        setClassSubjectPairs(updated)
        setValue('classSubjectPairs', updated)
        
        setSelectedClass('')
        setSelectedSubject('')
        toast.success('Subject assigned successfully')
      }
    }
  }, [selectedClass, selectedSubject])

  const removePair = (pair: ClassSubjectPair) => {
    const updated = classSubjectPairs.filter(
      p => !(p.classAssigned === pair.classAssigned && p.subject === pair.subject && p.section === pair.section)
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
            
                        <div className="grid grid-cols-3 gap-2">
              <div>
                <Select value={selectedClass} onValueChange={(val) => { setSelectedClass(val); setSelectedSection('__ALL__'); }}>
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
                  value={selectedSection} 
                  onValueChange={setSelectedSection}
                  disabled={!selectedClass}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Sections</SelectItem>
                    {allSections.filter(s => s.class === selectedClass && s.isActive).map(s => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
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

            {/* Current Assignments */}
            {classSubjectPairs.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-600">Current Assignments:</p>
                <div className="flex flex-wrap gap-1.5">
                  {classSubjectPairs.map((pair, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 gap-1.5 text-xs font-normal"
                    >
                      <span className="font-medium">Class {formatClass(pair.classAssigned)}{pair.section ? ` ${pair.section}` : ""}</span>
                      <span className="text-gray-500">-</span>
                      <span>{getSubjectNameById(pair.subject, pair.classAssigned)}</span>
                      <button
                        type="button"
                        onClick={() => removePair(pair)}
                        className="ml-0.5 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {classSubjectPairs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-1">
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


