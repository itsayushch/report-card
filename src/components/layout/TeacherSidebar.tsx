'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  ClipboardEdit,
  BarChart3,
  User,
  LogOut,
  TrendingUp,
  MessageSquare,
} from 'lucide-react'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/teacher/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Marks Entry',
    href: '/teacher/marks-entry',
    icon: ClipboardEdit,
  },
  // {
  //   title: 'Analytics',
  //   href: '/teacher/analytics',
  //   icon: BarChart3,
  // },
  {
    title: 'My Profile',
    href: '/teacher/profile',
    icon: User,
  },
]

export function TeacherSidebar() {
  const pathname = usePathname()
  const [isClassTeacher, setIsClassTeacher] = useState(false)

  useEffect(() => {
    checkClassTeacherStatus()
  }, [])

  const checkClassTeacherStatus = async () => {
    try {
      // Get active academic year
      const yearResponse = await fetch('/api/academic-years')
      const yearData = await yearResponse.json()
      const activeYear = yearData.academicYears?.find((y: any) => y.isActive)
      
      if (!activeYear) return

      // Check class teacher status
      const response = await fetch(
        `/api/teacher/class-teacher-status?academicYear=${activeYear.year}`
      )
      const data = await response.json()
      setIsClassTeacher(data.isClassTeacher)
    } catch (error) {
      console.error('Error checking class teacher status:', error)
    }
  }

  // Add promotion and class remarks to menu items if teacher is a class teacher
  const dynamicMenuItems = [
    ...menuItems,
    ...(isClassTeacher
      ? [
          {
            title: 'Class Remarks',
            href: '/teacher/class-remarks',
            icon: MessageSquare,
          },
          {
            title: 'Promotions',
            href: '/teacher/promotion',
            icon: TrendingUp,
          },
        ]
      : []),
  ]

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-800 px-2">
        <div className="flex items-center gap-3">
          <img src="/logo/small.png" alt="St. Helen's" className="h-8 w-8" />
          <h1 className="text-xl font-bold text-white">St. Helen&apos;s School</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {dynamicMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
        
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          type="button"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
