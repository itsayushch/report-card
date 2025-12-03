'use client'

import { useState, useEffect } from 'react'
import { Teacher } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TeacherForm } from '@/components/admin/teachers/TeacherForm'
import { Plus, Edit, Trash2, Mail, Search, Key } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getSubjectById } from '@/lib/subjects'

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [teacherToResetPassword, setTeacherToResetPassword] = useState<Teacher | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  const fetchTeachers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/teachers')
      const data = await response.json()
      setTeachers(data.teachers)
    } catch (error) {
      console.error('Failed to fetch teachers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [])

  const filteredTeachers = teachers.filter((teacher) => {
    const search = searchTerm.toLowerCase()
    return (
      teacher.name.toLowerCase().includes(search) ||
      teacher.email.toLowerCase().includes(search) ||
      teacher.classSubjectPairs.some((pair) => 
        pair.subject.toLowerCase().includes(search) || 
        pair.classAssigned.toLowerCase().includes(search)
      )
    )
  })

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setTeacherToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!teacherToDelete) return

    try {
      const response = await fetch(`/api/teachers/${teacherToDelete}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Teacher deleted successfully')
        fetchTeachers()
      } else {
        toast.error('Failed to delete teacher')
      }
    } catch (error) {
      toast.error('Failed to delete teacher')
    } finally {
      setDeleteDialogOpen(false)
      setTeacherToDelete(null)
    }
  }

  const handleAddNew = () => {
    setSelectedTeacher(null)
    setIsFormOpen(true)
  }

  const handleResetPassword = (teacher: Teacher) => {
    setTeacherToResetPassword(teacher)
    setNewPassword('')
    setConfirmPassword('')
    setResetPasswordDialogOpen(true)
  }

  const confirmResetPassword = async () => {
    if (!teacherToResetPassword) return

    if (!newPassword || !confirmPassword) {
      toast.error('Please enter both password fields')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setResettingPassword(true)
    try {
      const response = await fetch(`/api/teachers/${teacherToResetPassword.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      toast.success('Password reset successfully')
      setResetPasswordDialogOpen(false)
      setTeacherToResetPassword(null)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password')
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teachers</h1>
          <p className="text-gray-600 mt-1">Manage teaching staff</p>
        </div>
        <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Teachers ({filteredTeachers.length})</CardTitle>
              <CardDescription>Manage teachers and their assigned subjects</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search teachers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="border-b bg-muted/50 p-4">
                  <div className="grid grid-cols-5 gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-b p-4">
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <Skeleton className="h-4 w-32" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Class-Subject Pairs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        {searchTerm ? 'No teachers found matching your search' : 'No teachers found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      // Get unique subjects and classes from pairs
                      const uniqueSubjects = Array.from(new Set(teacher.classSubjectPairs.map(p => p.subject)))
                      const uniqueClasses = Array.from(new Set(teacher.classSubjectPairs.map(p => p.classAssigned)))
                        .sort((a, b) => parseInt(a) - parseInt(b))
                      
                      return (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span>{teacher.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.classSubjectPairs.map((pair, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                Class {pair.classAssigned} - {getSubjectById(pair.classAssigned, pair.subject)?.name || pair.subject}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleResetPassword(teacher)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Reset Password
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(teacher)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(teacher.id)} title="Delete">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TeacherForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        teacher={selectedTeacher}
        onSuccess={fetchTeachers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this teacher. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{teacherToResetPassword?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={resettingPassword}
              />
              <p className="text-xs text-gray-500">Minimum 8 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={resettingPassword}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetPasswordDialogOpen(false)}
              disabled={resettingPassword}
            >
              Cancel
            </Button>
            <Button onClick={confirmResetPassword} disabled={resettingPassword}>
              {resettingPassword ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
