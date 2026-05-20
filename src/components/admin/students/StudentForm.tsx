'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Student } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { studentSchema, type StudentFormData } from '@/lib/validations'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatClass } from '@/lib/class-utils'
import { getSubjectsByPrefixes } from '@/lib/subjects'

interface StudentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student | null
  onSuccess: () => void
}

const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const noneValue = '__none__'

export function StudentForm({ open, onOpenChange, student, onSuccess }: StudentFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  })

  useEffect(() => {
    if (student) {
      reset({
        name: student.name,
        regNo: student.regNo,
        class: student.class,
        secondLanguageSubject: student.secondLanguageSubject || noneValue,
        thirdLanguageSubject: student.thirdLanguageSubject || noneValue,
        sixthSubject: student.sixthSubject || noneValue,
        valueFaithSubject: student.valueFaithSubject || noneValue,
      })
    } else {
      reset({
        name: '',
        regNo: '',
        class: '',
        secondLanguageSubject: noneValue,
        thirdLanguageSubject: noneValue,
        sixthSubject: noneValue,
        valueFaithSubject: noneValue,
      })
    }
  }, [student, reset])

  const selectedClass = watch('class')
  const secondLanguageValue = watch('secondLanguageSubject') || noneValue
  const thirdLanguageValue = watch('thirdLanguageSubject') || noneValue
  const sixthSubjectValue = watch('sixthSubject') || noneValue
  const valueFaithValue = watch('valueFaithSubject') || noneValue

  const secondLanguageOptions = selectedClass
    ? getSubjectsByPrefixes(selectedClass, ['2ND-LANG-'])
    : []
  const thirdLanguageOptions = selectedClass
    ? getSubjectsByPrefixes(selectedClass, ['3RD-LANG-'])
    : []
  const sixthSubjectOptions = selectedClass
    ? getSubjectsByPrefixes(selectedClass, ['6TH-SUB-'])
    : []
  const valueFaithOptions = selectedClass
    ? getSubjectsByPrefixes(selectedClass, ['VAL-EDU-', 'FAITH-EDU-'])
    : []

  useEffect(() => {
    if (!selectedClass) return

    const ensureValid = (
      currentValue: string,
      options: Array<{ id: string }>,
      field: 'secondLanguageSubject' | 'thirdLanguageSubject' | 'sixthSubject' | 'valueFaithSubject'
    ) => {
      if (currentValue === noneValue) return
      if (!options.some((option) => option.id === currentValue)) {
        setValue(field, noneValue)
      }
    }

    ensureValid(secondLanguageValue, secondLanguageOptions, 'secondLanguageSubject')
    ensureValid(thirdLanguageValue, thirdLanguageOptions, 'thirdLanguageSubject')
    ensureValid(sixthSubjectValue, sixthSubjectOptions, 'sixthSubject')
    ensureValid(valueFaithValue, valueFaithOptions, 'valueFaithSubject')
  }, [
    selectedClass,
    secondLanguageValue,
    thirdLanguageValue,
    sixthSubjectValue,
    valueFaithValue,
    secondLanguageOptions,
    thirdLanguageOptions,
    sixthSubjectOptions,
    valueFaithOptions,
    setValue,
  ])

  const onSubmit = async (data: StudentFormData) => {
    try {
      setIsLoading(true)

      const normalizeChoice = (value?: string | null) =>
        value && value !== noneValue ? value : null

      const payload: StudentFormData = {
        ...data,
        secondLanguageSubject: normalizeChoice(data.secondLanguageSubject),
        thirdLanguageSubject: normalizeChoice(data.thirdLanguageSubject),
        sixthSubject: normalizeChoice(data.sixthSubject),
        valueFaithSubject: normalizeChoice(data.valueFaithSubject),
      }

      const url = student
        ? `/api/students/${student.id}`
        : '/api/students'

      const method = student ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save student')
      }

      toast.success(student ? 'Student updated successfully' : 'Student created successfully')
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
          <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
          <DialogDescription>
            {student ? 'Update student information' : 'Create a new student record'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter student name"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="regNo">Registration Number *</Label>
              <Input
                id="regNo"
                {...register('regNo')}
                placeholder="Enter registration number"
              />
              {errors.regNo && (
                <p className="text-sm text-red-600">{errors.regNo.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">Class *</Label>
            <Select
              value={selectedClass}
              onValueChange={(value) => setValue('class', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    Class {formatClass(cls)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.class && (
              <p className="text-sm text-red-600">{errors.class.message}</p>
            )}
          </div>

          {selectedClass && (secondLanguageOptions.length > 0 || thirdLanguageOptions.length > 0 || sixthSubjectOptions.length > 0 || valueFaithOptions.length > 0) && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">Subject Choices (Optional)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {secondLanguageOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="secondLanguageSubject">2nd Language</Label>
                    <Select
                      value={secondLanguageValue}
                      onValueChange={(value) => setValue('secondLanguageSubject', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select 2nd language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>None</SelectItem>
                        {secondLanguageOptions.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {thirdLanguageOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="thirdLanguageSubject">3rd Language</Label>
                    <Select
                      value={thirdLanguageValue}
                      onValueChange={(value) => setValue('thirdLanguageSubject', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select 3rd language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>None</SelectItem>
                        {thirdLanguageOptions.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {sixthSubjectOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="sixthSubject">6th Subject</Label>
                    <Select
                      value={sixthSubjectValue}
                      onValueChange={(value) => setValue('sixthSubject', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select 6th subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>None</SelectItem>
                        {sixthSubjectOptions.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {valueFaithOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="valueFaithSubject">Value / Faith Education</Label>
                    <Select
                      value={valueFaithValue}
                      onValueChange={(value) => setValue('valueFaithSubject', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>None</SelectItem>
                        {valueFaithOptions.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {student ? 'Update' : 'Create'} Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
