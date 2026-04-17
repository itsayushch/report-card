'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Loader2,
} from 'lucide-react'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/student/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Results',
    href: '/student/report-card',
    icon: FileText,
  },
]

export function StudentSidebar() {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true)
      await signOut({ callbackUrl: '/login' })
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-800 px-2">
        <div className="flex items-center gap-3">
          <Image src="/logo/small.png" alt="St. Helen's" width={32} height={32} className="h-8 w-8" />
          <h1 className="text-xl font-bold text-white">St. Helen&apos;s School</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
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
          onClick={handleSignOut}
          disabled={isLoggingOut}
          type="button"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed",
            isLoggingOut && "bg-gray-800 text-white"
          )}
        >
          {isLoggingOut ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          <span className="font-medium">
            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          </span>
        </button>
      </div>
    </div>
  )
}
