'use client'

import { Student } from '@prisma/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Mail, Phone, Check } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { formatClass, formatSection } from '@/lib/class-utils'

interface StudentTableProps {
  students: Student[]
  onEdit: (student: Student) => void
  onDelete: (id: string) => void
  onRestore: (id: string) => void
  onPermanentDelete: (id: string) => void
  selectedStudents: string[]
  allMatchingSelected?: boolean
  onSelectStudent: (id: string) => void
  onSelectAll: () => void
}

export function StudentTable({ students, onEdit, onDelete, onRestore, onPermanentDelete, selectedStudents, allMatchingSelected = false, onSelectStudent, onSelectAll }: StudentTableProps) {
  // Sort students: ACTIVE first, then INACTIVE
  const sortedStudents = [...students].sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status === 'INACTIVE') return -1
    if (a.status === 'INACTIVE' && b.status === 'ACTIVE') return 1
    return 0
  })
  const allLoadedSelected = students.length > 0 && students.every((student) => selectedStudents.includes(student.id))

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={allMatchingSelected || allLoadedSelected}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Reg. Number</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStudents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                No students found
              </TableCell>
            </TableRow>
          ) : (
            sortedStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Checkbox 
                    checked={allMatchingSelected || selectedStudents.includes(student.id)}
                    onCheckedChange={() => onSelectStudent(student.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                      <p className="font-medium">{student.name}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{student.regNo}</TableCell>
                <TableCell>{formatClass(student.class)}</TableCell>
                <TableCell>{formatSection(student.section)}</TableCell>
                <TableCell>
                  <Badge
                    variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}
                  >
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {student.status === 'INACTIVE' ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRestore(student.id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Restore student"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onPermanentDelete(student.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Permanently delete student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(student)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(student.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
