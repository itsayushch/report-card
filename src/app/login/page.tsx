'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { GraduationCap, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any).role
      const redirectUrl = 
        role === 'ADMIN' ? '/admin/dashboard' :
        role === 'TEACHER' ? '/teacher/dashboard' :
        '/student/dashboard'
      router.push(redirectUrl)
    }
  }, [status, session, router])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      role: 'STUDENT',
    },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setError('')

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        role: data.role,
        redirect: false,
      })

      if (result?.error) {
        console.error('Login error:', result)
        setError('Invalid credentials. Please check your email/roll number and password.')
      } else {
        // Redirect based on role
        const redirectUrl = 
          data.role === 'ADMIN' ? '/admin/dashboard' :
          data.role === 'TEACHER' ? '/teacher/dashboard' :
          '/student/dashboard'
        
        router.push(redirectUrl)
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-blue-600 via-blue-700 to-blue-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col items-center">
            <img 
              src="https://sthelenskurseong.in/images/logo.png" 
              alt="St. Helen's School Logo" 
              className="h-32 object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 text-white">
          <h2 className="text-4xl font-bold mb-4">Welcome!</h2>
          <p className="text-blue-100 text-lg mb-8">
            St. Helen's Secondary School Report Card Management System
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-blue-100">View Report Cards</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-blue-100">Marks Entry & Management</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-blue-100">Student & Teacher Portal</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-blue-100 text-sm">
          © {new Date().getFullYear()} St. Helen&apos;s School. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-start lg:items-center justify-center p-3 lg:p-8 bg-gray-50 lg:bg-white relative overflow-y-auto">
        {/* Mobile Header Image */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-96 md:h-96 bg-linear-to-br from-blue-600 via-blue-700 to-blue-900 ">
          <div className="absolute inset-0 bg-white/5 rounded-b-[3rem]"></div>
        </div>

        <div className="w-full max-w-2xl lg:max-w-lg relative z-10 mt-4 lg:my-8">
          {/* Mobile Logo - Overlapping */}
          <div className="lg:hidden flex flex-col items-center mb-4 mt-2">
            <div className="bg-white rounded-full shadow-2xl p-4 mb-3">
              <img 
                src="https://www.schooldekho.org/storage/logo/epdo17blks0ss4sgcokg8kwsg448cco.png" 
                alt="St. Helen's School Logo" 
                className="h-16 w-16 object-contain"
              />
            </div>
            <div className="text-center px-6 pb-3">
              <h1 className="text-white text-2xl font-bold tracking-wide">
                ST. HELEN&apos;S SECONDARY SCHOOL
              </h1>
              <h2 className="text-white text-xl font-bold tracking-wider">
                KURSEONG
              </h2>
            </div>
          </div>

          <div className="bg-white lg:bg-transparent rounded-2xl lg:rounded-none shadow-xl lg:shadow-none p-6 lg:p-0">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
              <p className="text-gray-600">Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                  Log in as
                </Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setValue('role', value as 'ADMIN' | 'TEACHER' | 'STUDENT')}
                >
                  <SelectTrigger 
                    id="role" 
                    className="h-14 w-full min-w-[280px] text-base border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                  >
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[280px]">
                    <SelectItem value="ADMIN" className="text-base">Administrator</SelectItem>
                    <SelectItem value="TEACHER" className="text-base">Teacher</SelectItem>
                    <SelectItem value="STUDENT" className="text-base">Student</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  {selectedRole === 'STUDENT' ? 'Roll Number' : 'Email Address'}
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder={
                    selectedRole === 'STUDENT' 
                      ? 'Enter your roll number' 
                      : 'Enter your email'
                  }
                  {...register('email')}
                  disabled={isLoading}
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register('password')}
                  disabled={isLoading}
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

          </div>
        </div>
      </div>
    </div>
  )
}
