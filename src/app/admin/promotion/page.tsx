'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react'
import { formatClass } from '@/lib/class-utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Student {
  id: string
  name: string
  rollNo: string
  class: string
  promotionStatus: string
  hasMarks: boolean
  totalObtained: number
  totalMax: number
  percentage: number
  result: string
}

export default function PromotionPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'PROMOTE' | 'DETAIN'>('PROMOTE')

  useEffect(() => {
    fetchAcademicYears()
  }, [])

  useEffect(() => {
    if (selectedYear && selectedClass) {
      fetchEligibleStudents()
    }
  }, [selectedYear, selectedClass])

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('/api/academic-years')
      const responseData = await response.json()
      
      // API returns {academicYears: []} so extract the array
      const data = responseData.academicYears || []
      
      setAcademicYears(data)

      const activeYear = data.find((y: any) => y.isActive)
      if (activeYear) {
        setSelectedYear(activeYear.year)
      }
    } catch (error) {
      toast.error('Failed to fetch academic years')
    }
  }

  const fetchEligibleStudents = async () => {
    setLoading(true)
    setSelectedStudents(new Set())
    try {
      const response = await fetch(
        `/api/promotion/eligible?class=${selectedClass}&academicYear=${selectedYear}`
      )
      const data = await response.json()
      setStudents(data)
    } catch (error) {
      toast.error('Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  const toggleStudent = (studentId: string) => {
    const newSet = new Set(selectedStudents)
    if (newSet.has(studentId)) {
      newSet.delete(studentId)
    } else {
      newSet.add(studentId)
    }
    setSelectedStudents(newSet)
  }

  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map((s) => s.id)))
    }
  }

  const handlePromoteDetain = (action: 'PROMOTE' | 'DETAIN') => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student')
      return
    }

    setConfirmAction(action)
    setShowConfirmDialog(true)
  }

  const confirmPromotion = async () => {
    setShowConfirmDialog(false)
    setProcessing(true)

    try {
      const response = await fetch('/api/promotion/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          action: confirmAction,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process promotion')
      }

      toast.success(data.message)
      setSelectedStudents(new Set())
      fetchEligibleStudents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to process promotion')
    } finally {
      setProcessing(false)
    }
  }

  const classes = [
    '9', '10', '11', '12'
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Promotion</h1>
        <p className="text-gray-500 mt-2">
          Promote or detain students based on their final term performance
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>
            Choose academic year and class to view eligible students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.year}>
                      {year.year} {year.isActive && '(Active)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      Class {formatClass(cls)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      {selectedYear && selectedClass && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Students - Class {formatClass(selectedClass)}</CardTitle>
                <CardDescription>
                  {selectedStudents.size} of {students.length} selected
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePromoteDetain('DETAIN')}
                  disabled={selectedStudents.size === 0 || processing}
                >
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Detain Selected
                </Button>
                <Button
                  onClick={() => handlePromoteDetain('PROMOTE')}
                  disabled={selectedStudents.size === 0 || processing}
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  Promote Selected
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No students found or no marks entered for final term
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedStudents.size === students.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Class</TableHead>
                    <TableHead className="text-center">Total Marks</TableHead>
                    <TableHead className="text-center">Percentage</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.has(student.id)}
                          onCheckedChange={() => toggleStudent(student.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{student.rollNo}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell className="text-center">{student.class}</TableCell>
                      <TableCell className="text-center">
                        {student.totalObtained} / {student.totalMax}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {student.percentage}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            student.result === 'PASS'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {student.result}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {student.promotionStatus === 'PROMOTED' ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Promoted
                          </Badge>
                        ) : student.promotionStatus === 'DETAINED' ? (
                          <Badge className="bg-red-100 text-red-700">Detained</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {confirmAction === 'PROMOTE' ? 'Promotion' : 'Detention'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmAction === 'PROMOTE' ? 'promote' : 'detain'}{' '}
              {selectedStudents.size} student(s)?
              {confirmAction === 'PROMOTE' && (
                <span className="block mt-2 font-medium">
                  Students will be moved to the next class automatically.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPromotion}>
              Confirm {confirmAction === 'PROMOTE' ? 'Promotion' : 'Detention'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
