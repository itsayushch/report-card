import { z } from 'zod'

export const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  rollNo: z.string().min(1, 'Roll number is required'),
  dateOfBirth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date of birth must be in DD/MM/YYYY format'),
  class: z.string().min(1, 'Class is required'),
  parentName: z.string().min(2, 'Parent name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  academicYear: z.string().optional(),
})

export const teacherSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  classSubjectPairs: z.array(z.object({
    subject: z.string(),
    classAssigned: z.string(),
  })).optional().default([]),
  isAdmin: z.boolean().optional().default(false),
})

export const subjectSchema = z.object({
  name: z.string().min(2, 'Subject name is required'),
  code: z.string().min(2, 'Subject code is required').regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, and hyphens only'),
  maxMarks: z.number().int().positive('Max marks must be positive'),
  passingMarks: z.number().int().positive('Passing marks must be positive'),
  academicYear: z.string().optional(),
}).refine((data) => data.passingMarks < data.maxMarks, {
  message: 'Passing marks must be less than max marks',
  path: ['passingMarks'],
})

export const academicYearSchema = z.object({
  year: z.string().regex(/^\d{4}$/, 'Year must be in format YYYY'),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  isActive: z.boolean().optional(),
})

export const loginSchema = z.object({
  email: z.string().min(1, 'This field is required'),
  password: z.string().optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
}).superRefine((data, ctx) => {
  // For ADMIN and TEACHER, validate email format and require password
  if (data.role === 'ADMIN' || data.role === 'TEACHER') {
    if (!z.string().email().safeParse(data.email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid email address',
        path: ['email'],
      })
    }
    if (!data.password || data.password.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password is required',
        path: ['password'],
      })
    }
  }
  // For STUDENT, roll number can be any string (no email validation, no password needed)
})

export type StudentFormData = z.infer<typeof studentSchema>
export type TeacherFormData = z.infer<typeof teacherSchema>
export type SubjectFormData = z.infer<typeof subjectSchema>
export type AcademicYearFormData = z.infer<typeof academicYearSchema>
export type LoginFormData = z.infer<typeof loginSchema>
