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
import { Edit, Trash2, Mail, Phone } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { formatClass } from '@/lib/class-utils'

interface StudentTableProps {
  students: Student[]
  onEdit: (student: Student) => void
  onDelete: (id: string) => void
  selectedStudents: string[]
  onSelectStudent: (id: string) => void
  onSelectAll: () => void
}

export function StudentTable({ students, onEdit, onDelete, selectedStudents, onSelectStudent, onSelectAll }: StudentTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selectedStudents.length === students.length && students.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Roll No</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                No students found
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => onSelectStudent(student.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{student.rollNo}</TableCell>
                <TableCell>{formatClass(student.class)}</TableCell>
                <TableCell>{student.parentName}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{student.phone}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}
                  >
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
