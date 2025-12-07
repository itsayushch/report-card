'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, ArrowRightCircle } from 'lucide-react'
import { formatClass } from '@/lib/class-utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Student {
  id: string
  name: string
  regNo: string
  class: string
  promotionStatus: string
  hasMarks: boolean
  totalObtained: number
  totalMax: number
  percentage: number
  result: string
}

export default function TeacherPromotionPage() {
  const [classTeacherInfo, setClassTeacherInfo] = useState<{
    isClassTeacher: boolean
    class?: string
    message?: string
  } | null>(null)
  const [activeAcademicYear, setActiveAcademicYear] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'PROMOTE' | 'DETAIN'>('PROMOTE')
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [movingStudents, setMovingStudents] = useState(false)
  const [activeTab, setActiveTab] = useState('not-promoted')

  useEffect(() => {
    checkClassTeacherStatus()
  }, [])

  const checkClassTeacherStatus = async () => {
    try {
      setLoading(true)
      
      // First, get the active academic year
      const yearResponse = await fetch('/api/academic-years')
      const yearData = await yearResponse.json()
      const activeYear = yearData.academicYears?.find((y: any) => y.isActive)
      
      if (!activeYear) {
        setClassTeacherInfo({
          isClassTeacher: false,
          message: 'No active academic year found',
        })
        return
      }

      setActiveAcademicYear(activeYear.year)

      // Check class teacher status
      const response = await fetch('/api/teacher/class-teacher-status')
      const data = await response.json()
      setClassTeacherInfo(data)

      // If they are a class teacher, fetch their students
      if (data.isClassTeacher) {
        fetchEligibleStudents(activeYear.year)
      }
    } catch (error) {
      toast.error('Failed to check class teacher status')
    } finally {
      setLoading(false)
    }
  }

  const fetchEligibleStudents = async (academicYear: string) => {
    setLoading(true)
    setSelectedStudents(new Set())
    try {
      const response = await fetch(
        `/api/teacher/promotion/eligible?academicYear=${academicYear}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }
      
      const data = await response.json()
      setStudents(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch students')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const toggleAll = (filteredStudents: Student[]) => {
    const filteredIds = filteredStudents.map(s => s.id)
    const allSelected = filteredIds.every(id => selectedStudents.has(id))
    
    if (allSelected) {
      const newSet = new Set(selectedStudents)
      filteredIds.forEach(id => newSet.delete(id))
      setSelectedStudents(newSet)
    } else {
      setSelectedStudents(new Set([...selectedStudents, ...filteredIds]))
    }
  }

  const handlePromote = () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student')
      return
    }
    setConfirmAction('PROMOTE')
    setShowConfirmDialog(true)
  }

  const handleDetain = () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student')
      return
    }
    setConfirmAction('DETAIN')
    setShowConfirmDialog(true)
  }

  const handleMoveToClass = () => {
    // Filter to only promoted students
    const promotedStudents = Array.from(selectedStudents).filter((id) => {
      const student = students.find((s) => s.id === id)
      return student?.promotionStatus === 'PROMOTED'
    })

    if (promotedStudents.length === 0) {
      toast.error('Please select at least one promoted student')
      return
    }

    setShowMoveDialog(true)
  }

  const confirmMoveToClass = async () => {
    const promotedStudents = Array.from(selectedStudents).filter((id) => {
      const student = students.find((s) => s.id === id)
      return student?.promotionStatus === 'PROMOTED'
    })

    setMovingStudents(true)
    try {
      const response = await fetch('/api/teacher/promotion/move-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: promotedStudents,
          academicYear: activeAcademicYear,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to move students')
      }

      toast.success(data.message)
      setShowMoveDialog(false)
      setSelectedStudents(new Set())
      
      // Refresh the student list
      if (activeAcademicYear) {
        fetchEligibleStudents(activeAcademicYear)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to move students')
    } finally {
      setMovingStudents(false)
    }
  }

  const confirmPromotion = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/teacher/promotion/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          action: confirmAction,
          academicYear: activeAcademicYear,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process promotion')
      }

      toast.success(data.message)
      setShowConfirmDialog(false)
      setSelectedStudents(new Set())
      
      // Refresh the student list
      if (activeAcademicYear) {
        fetchEligibleStudents(activeAcademicYear)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process promotion')
    } finally {
      setProcessing(false)
    }
  }

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'PASS':
        return <Badge className="bg-green-500">Pass</Badge>
      case 'FAIL':
        return <Badge variant="destructive">Fail</Badge>
      case 'NO_MARKS':
        return <Badge variant="secondary">No Marks</Badge>
      default:
        return <Badge variant="outline">{result}</Badge>
    }
  }

  const getPromotionStatusBadge = (status: string) => {
    switch (status) {
      case 'PROMOTED':
        return <Badge className="bg-blue-500">Promoted</Badge>
      case 'DETAINED':
        return <Badge className="bg-orange-500">Detained</Badge>
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!classTeacherInfo?.isClassTeacher) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {classTeacherInfo?.message || 'You are not assigned as a class teacher.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Filter students based on promotion status
  const promotedStudents = students?.filter(s => s.promotionStatus === 'PROMOTED') || []
  const notPromotedStudents = students?.filter(s => s.promotionStatus === 'PENDING' || s.promotionStatus === 'DETAINED') || []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Student Promotion</h1>
        <p className="text-muted-foreground mt-1">
          Manage promotions for your class: {formatClass(classTeacherInfo.class!)}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="not-promoted">
                Not Promoted ({notPromotedStudents.length})
              </TabsTrigger>
              <TabsTrigger value="promoted">
                Promoted ({promotedStudents.length})
              </TabsTrigger>
            </TabsList>

            {/* Not Promoted Tab */}
            <TabsContent value="not-promoted" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Students Pending Promotion</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudents.size} of {notPromotedStudents.length} selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDetain}
                    disabled={selectedStudents.size === 0 || processing}
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Detain Selected
                  </Button>
                  <Button
                    onClick={handlePromote}
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
              {notPromotedStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students pending promotion in your class</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={notPromotedStudents.length > 0 && notPromotedStudents.every(s => selectedStudents.has(s.id))}
                            onCheckedChange={() => toggleAll(notPromotedStudents)}
                          />
                        </TableHead>
                        <TableHead>Reg No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notPromotedStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.has(student.id)}
                              onCheckedChange={() => toggleStudent(student.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{student.regNo}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatClass(student.class)}</Badge>
                          </TableCell>
                          <TableCell>
                            {student.hasMarks ? (
                              <span className="text-sm">
                                {student.totalObtained}/{student.totalMax}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">No marks</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.hasMarks ? (
                              <span className="text-sm font-medium">
                                {student.percentage.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getResultBadge(student.result)}</TableCell>
                          <TableCell>{getPromotionStatusBadge(student.promotionStatus)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Promoted Tab */}
            <TabsContent value="promoted" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Promoted Students</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudents.size} of {promotedStudents.length} selected
                  </p>
                </div>
                <Button
                  onClick={handleMoveToClass}
                  disabled={selectedStudents.size === 0 || movingStudents}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {movingStudents ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightCircle className="mr-2 h-4 w-4" />
                  )}
                  Move to New Class
                </Button>
              </div>
              {promotedStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No promoted students in your class</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={promotedStudents.length > 0 && promotedStudents.every(s => selectedStudents.has(s.id))}
                            onCheckedChange={() => toggleAll(promotedStudents)}
                          />
                        </TableHead>
                        <TableHead>Reg No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promotedStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.has(student.id)}
                              onCheckedChange={() => toggleStudent(student.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{student.regNo}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatClass(student.class)}</Badge>
                          </TableCell>
                          <TableCell>
                            {student.hasMarks ? (
                              <span className="text-sm">
                                {student.totalObtained}/{student.totalMax}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">No marks</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.hasMarks ? (
                              <span className="text-sm font-medium">
                                {student.percentage.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getResultBadge(student.result)}</TableCell>
                          <TableCell>{getPromotionStatusBadge(student.promotionStatus)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
                  Students will be marked as promoted. Use "Move to New Class" button to actually move them.
                </span>
              )}
              {confirmAction === 'DETAIN' && (
                <span className="block mt-2 font-medium">
                  Students will remain in the same class.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={confirmPromotion} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Students to New Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to move the selected promoted students to their next class?
              <span className="block mt-2 font-medium text-orange-600">
                This action will permanently change their class assignment.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMoveDialog(false)}
              disabled={movingStudents}
            >
              Cancel
            </Button>
            <Button onClick={confirmMoveToClass} disabled={movingStudents}>
              {movingStudents && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Move to New Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
