import { z } from 'zod'

export const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  rollNo: z.string().min(1, 'Roll number is required'),
  dateOfBirth: z.string().regex(/^\d{8}$/, 'Date of birth must be in DDMMYYYY format'),
  class: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required'),
  parentName: z.string().min(2, 'Parent name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  photo: z.string().url().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  academicYear: z.string().optional(),
})

export const teacherSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  subjects: z.array(z.string()).min(1, 'At least one subject is required'),
  assignedClasses: z.array(z.string()).min(1, 'At least one class is required'),
  isAdmin: z.boolean().optional(),
})

export const subjectSchema = z.object({
  name: z.string().min(2, 'Subject name is required'),
  code: z.string().min(2, 'Subject code is required'),
  maxMarks: z.number().int().positive('Max marks must be positive'),
  passingMarks: z.number().int().positive('Passing marks must be positive'),
  academicYear: z.string().optional(),
}).refine((data) => data.passingMarks < data.maxMarks, {
  message: 'Passing marks must be less than max marks',
  path: ['passingMarks'],
})

export const academicYearSchema = z.object({
  year: z.string().regex(/^\d{4}-\d{4}$/, 'Year must be in format YYYY-YYYY'),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  isActive: z.boolean().optional(),
  terms: z.array(z.object({
    name: z.string().min(1, 'Term name is required'),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
  })).min(1, 'At least one term is required'),
})

export const loginSchema = z.object({
  email: z.string().min(1, 'This field is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
}).superRefine((data, ctx) => {
  // For ADMIN and TEACHER, validate email format
  if ((data.role === 'ADMIN' || data.role === 'TEACHER') && !z.string().email().safeParse(data.email).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid email address',
      path: ['email'],
    })
  }
  // For STUDENT, roll number can be any string (no email validation)
})

export type StudentFormData = z.infer<typeof studentSchema>
export type TeacherFormData = z.infer<typeof teacherSchema>
export type SubjectFormData = z.infer<typeof subjectSchema>
export type AcademicYearFormData = z.infer<typeof academicYearSchema>
export type LoginFormData = z.infer<typeof loginSchema>
