'use client'

import { useState } from 'react'
import { TeacherSidebar } from './TeacherSidebar'
import { TeacherHeader } from './TeacherHeader'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

interface TeacherLayoutWrapperProps {
  children: React.ReactNode
  userName?: string
  userEmail?: string
  profilePicture?: string | null
}

export function TeacherLayoutWrapper({
  children,
  userName,
  userEmail,
  profilePicture,
}: TeacherLayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col">
        <TeacherSidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access teacher dashboard and tools</SheetDescription>
          </SheetHeader>
          <TeacherSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TeacherHeader
          userName={userName}
          userEmail={userEmail}
          profilePicture={profilePicture}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  )
}
