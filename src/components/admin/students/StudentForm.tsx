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

interface StudentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student | null
  onSuccess: () => void
}

const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

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
        rollNo: student.rollNo,
        class: student.class,
        parentName: student.parentName,
        email: student.email,
        phone: student.phone,
        status: student.status,
      })
    } else {
      reset({
        name: '',
        rollNo: '',
        class: '',
        parentName: '',
        email: '',
        phone: '',
        status: 'ACTIVE',
      })
    }
  }, [student, reset])

  const selectedClass = watch('class')
  const selectedStatus = watch('status')

  const onSubmit = async (data: StudentFormData) => {
    try {
      setIsLoading(true)

      const url = student
        ? `/api/students/${student.id}`
        : '/api/students'

      const method = student ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
              <Label htmlFor="rollNo">Roll Number *</Label>
              <Input
                id="rollNo"
                {...register('rollNo')}
                placeholder="Enter roll number"
              />
              {errors.rollNo && (
                <p className="text-sm text-red-600">{errors.rollNo.message}</p>
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

          <div className="space-y-2">
            <Label htmlFor="parentName">Parent/Guardian Name *</Label>
            <Input
              id="parentName"
              {...register('parentName')}
              placeholder="Enter parent/guardian name"
            />
            {errors.parentName && (
              <p className="text-sm text-red-600">{errors.parentName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="student@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+1234567890"
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {student && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as 'ACTIVE' | 'INACTIVE')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
