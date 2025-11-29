'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface TeacherHeaderProps {
  userName?: string
  userEmail?: string
  onMenuClick: () => void
}

export function TeacherHeader({
  userName = 'Teacher',
  userEmail = '',
  onMenuClick,
}: TeacherHeaderProps) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome, {userName}!
          </h2>
          <p className="text-sm text-gray-500 hidden sm:block">
            Teacher Dashboard
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">{userEmail}</p>
        </div>
        <Avatar>
          <AvatarFallback className="bg-indigo-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
