'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { GraduationCap, AlertCircle } from 'lucide-react'

function getDashboardByRole(role: LoginFormData['role']) {
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'TEACHER') return '/teacher/dashboard'
  return '/student/dashboard'
}

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
        password: data.password || undefined,
        role: data.role,
        redirect: false,
      })

      if (result?.error) {
        setError(
          data.role === 'STUDENT'
            ? 'Invalid credentials. Please check your registration number.'
            : 'Invalid credentials. Please check your email and password.'
        )
        return
      }

      setIsRedirecting(true)
      router.replace(getDashboardByRole(data.role))
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const currentYear = mounted ? new Date().getFullYear() : ''

  return (
    <div className="min-h-screen flex">
      {isRedirecting && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900"><span>Loading Dashboard...</span></p>
              <p className="text-sm text-gray-500 mt-1"><span>Please wait</span></p>
            </div>
          </div>
        </div>
      )}

      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-blue-600 via-blue-700 to-blue-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex flex-col items-center">
            <Image
              src="/logo/long.png"
              alt="St. Helen's School Logo"
              width={600}
              height={160}
              priority
              className="h-32 w-auto object-contain"
              sizes="(min-width: 1024px) 40vw, 0px"
            />
          </div>
        </div>

        <div className="relative z-10 text-white">
          <h2 className="text-4xl font-bold mb-4"><span>Welcome!</span></h2>
          <p className="text-blue-100 text-lg mb-8">
            <span>St. Helen&apos;s Secondary School Report Card Management System</span>
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
          <span>© {currentYear} St. Helen&apos;s School. All rights reserved.</span> <br />
          <p className="text-blue-100 ml-3.5">
            <span>Developed by{' '}</span>
            <a
              href="https://www.weblyx.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold hover:text-blue-200 transition-colors duration-200 ease-in-out"
            >
              Weblyx Studio
            </a>
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-start lg:items-center justify-center p-3 lg:p-8 bg-gray-50 lg:bg-white relative overflow-y-auto">
        <div className="lg:hidden absolute top-0 left-0 right-0 h-96 md:h-96 bg-linear-to-br from-blue-600 via-blue-700 to-blue-900 ">
          <div className="absolute inset-0 bg-white/5 rounded-b-[3rem]" />
        </div>

        <div className="w-full max-w-2xl lg:max-w-lg relative z-10 mt-4 lg:my-8">
          <div className="lg:hidden flex flex-col items-center mb-4 mt-2">
            <div className="bg-white rounded-full shadow-2xl p-4 mb-3">
              <Image
                src="/logo/small.png"
                alt="St. Helen's School Logo"
                width={64}
                height={64}
                priority
                className="h-16 w-16 object-contain"
                sizes="64px"
              />
            </div>
            <div className="text-center px-2 pb-3">
              <h1 className="text-white text-xl font-bold tracking-wide">
                <span>ST. HELEN&apos;S SECONDARY SCHOOL</span>
              </h1>
              <h2 className="text-white text-xl font-bold tracking-wider"><span>KURSEONG</span></h2>
            </div>
          </div>

          <div className="bg-white lg:bg-transparent rounded-2xl lg:rounded-none shadow-xl lg:shadow-none p-6 lg:p-0">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2"><span>Sign In</span></h2>
              <p className="text-gray-600"><span>Enter your credentials to access your account</span></p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm"><span>{error}</span></AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                  <span>Log in as</span>
                </Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setValue('role', value as 'ADMIN' | 'TEACHER' | 'STUDENT')}
                >
                  <SelectTrigger
                    id="role"
                    className="h-14 w-full min-w-70 text-base border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                  >
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent className="min-w-70">
                    <SelectItem value="ADMIN" className="text-base">
                      <span>Administrator</span>
                    </SelectItem>
                    <SelectItem value="TEACHER" className="text-base">
                      <span>Teacher</span>
                    </SelectItem>
                    <SelectItem value="STUDENT" className="text-base">
                      <span>Student</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-sm text-red-600 mt-1"><span>{errors.role.message}</span></p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  {selectedRole === 'STUDENT' ? <span>Registration Number</span> : <span>Email Address</span>}
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder={
                    selectedRole === 'STUDENT' ? 'Enter your registration number' : 'Enter your email'
                  }
                  {...register('email')}
                  disabled={isLoading}
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                />
                {errors.email && <p className="text-sm text-red-600 mt-1"><span>{errors.email.message}</span></p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  <span>Password</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={
                    selectedRole === 'STUDENT'
                      ? 'Enter your password (same as registration number)'
                      : 'Enter your password'
                  }
                  {...register('password')}
                  disabled={isLoading}
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                />
                {errors.password && <p className="text-sm text-red-600 mt-1"><span>{errors.password.message}</span></p>}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
            </form>
          </div>

          <div className="lg:hidden mt-6 text-center text-sm text-gray-600 px-6">
            <p><span>© {currentYear} St. Helen&apos;s School. All rights reserved.</span></p>
            <p className="mt-1">
              <span>Developed by{' '}</span>
              <a
                href="https://www.weblyx.site/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 font-bold hover:text-black transition-colors duration-200 ease-in-out"
              >
                Weblyx Studio
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
