'use client'

import { useState } from 'react'
import { StudentSidebar } from './StudentSidebar'
import { StudentHeader } from './StudentHeader'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

interface StudentLayoutWrapperProps {
  children: React.ReactNode
  userName?: string
  userEmail?: string
  regNo?: string
}

export function StudentLayoutWrapper({
  children,
  userName,
  userEmail,
  regNo,
}: StudentLayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col">
        <StudentSidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access dashboard and results</SheetDescription>
          </SheetHeader>
          <StudentSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <StudentHeader
          userName={userName}
          userEmail={userEmail}
          regNo={regNo}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  )
}
