'use client'

import { Menu, LogOut, User, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from 'next-auth/react'

interface AdminHeaderProps {
  userName?: string
  userEmail?: string
  onMenuClick: () => void
}

export function AdminHeader({ userName = 'Admin', userEmail = '', onMenuClick }: AdminHeaderProps) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4 lg:flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div className="lg:flex-none flex-1 lg:text-left text-center">
          <h2 className="text-lg font-semibold text-gray-900">
          Admin Panel
          </h2>
          <p className="text-sm text-gray-500 hidden sm:block">
            Manage your school&apos;s report card system
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-gray-100">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-600 text-white text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72" align="end" sideOffset={8}>
            <DropdownMenuLabel className="font-normal pb-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-indigo-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 w-fit mt-1">
                    Administrator
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 py-2.5"
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span className="font-medium">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
