'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { formatClass } from '@/lib/class-utils'
import { getTermsForClass } from '@/lib/terms'

interface AcademicYear {
  id: string
  year: string
  isActive: boolean
  terms: { name: string }[]
}

interface PublishRecord {
  id: string
  class: string
  term: string
  academicYear: string
  isPublished: boolean
  publishedAt: string | null
  publishedBy: string | null
}

export default function ReportPublishPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [publishedReports, setPublishedReports] = useState<PublishRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Fetch academic years
  useEffect(() => {
    fetchAcademicYears()
  }, [])

  // Fetch published reports when year changes
  useEffect(() => {
    if (selectedYear) {
      const fetchPublishedReports = async () => {
        setLoading(true)
        try {
          const response = await fetch(
            `/api/reports/publish?academicYear=${selectedYear}`
          )
          const data = await response.json()
          setPublishedReports(data)
        } catch {
          toast.error('Failed to fetch published reports')
        } finally {
          setLoading(false)
        }
      }
      fetchPublishedReports()
    }
  }, [selectedYear])

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('/api/academic-years')
      const responseData = await response.json()
      
      // API returns {academicYears: []} so extract the array
      const data = responseData.academicYears || []
      
      setAcademicYears(data)
      
      // Set active year as default
      const activeYear = data.find((y: AcademicYear) => y.isActive)
      if (activeYear) {
        setSelectedYear(activeYear.year)
      }
    } catch {
      toast.error('Failed to fetch academic years')
    }
  }

  const fetchPublishedReports = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/reports/publish?academicYear=${selectedYear}`
      )
      const data = await response.json()
      setPublishedReports(data)
    } catch {
      toast.error('Failed to fetch published reports')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async (
    className: string,
    term: string
  ) => {
    const key = `${className}-${term}`
    setPublishing(key)

    try {
      const response = await fetch('/api/reports/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class: className,
          term,
          academicYear: selectedYear,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish')
      }

      toast.success(`Reports published for ${className}, ${term}`)
      fetchPublishedReports()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish reports')
    } finally {
      setPublishing(null)
    }
  }

  const handleUnpublish = async (
    className: string,
    term: string
  ) => {
    const key = `${className}-${term}`
    setPublishing(key)

    try {
      const response = await fetch(
        `/api/reports/publish?class=${className}&term=${term}&academicYear=${selectedYear}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unpublish')
      }

      toast.success(`Reports unpublished for ${className}, ${term}`)
      fetchPublishedReports()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unpublish reports')
    } finally {
      setPublishing(null)
    }
  }

  const handleBulkPublish = async () => {
    if (selectedClasses.size === 0) {
      toast.error('Please select at least one class')
      return
    }

    setPublishing('bulk')
    let successCount = 0
    let failCount = 0

    for (const classKey of selectedClasses) {
      const className = classKey
      try {
        const response = await fetch('/api/reports/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class: className,
            term: selectedTerm,
            academicYear: selectedYear,
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    setPublishing(null)
    setSelectedClasses(new Set())
    setSelectAll(false)
    
    if (successCount > 0) {
      toast.success(`Published ${successCount} class(es) successfully`)
    }
    if (failCount > 0) {
      toast.error(`Failed to publish ${failCount} class(es)`)
    }
    
    fetchPublishedReports()
  }

  const handleBulkUnpublish = async () => {
    if (selectedClasses.size === 0) {
      toast.error('Please select at least one class')
      return
    }

    setPublishing('bulk')
    let successCount = 0
    let failCount = 0

    for (const classKey of selectedClasses) {
      const className = classKey
      try {
        const response = await fetch(
          `/api/reports/publish?class=${className}&term=${selectedTerm}&academicYear=${selectedYear}`,
          { method: 'DELETE' }
        )

        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    setPublishing(null)
    setSelectedClasses(new Set())
    setSelectAll(false)
    
    if (successCount > 0) {
      toast.success(`Unpublished ${successCount} class(es) successfully`)
    }
    if (failCount > 0) {
      toast.error(`Failed to unpublish ${failCount} class(es)`)
    }
    
    fetchPublishedReports()
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedClasses(new Set())
      setSelectAll(false)
    } else {
      const allClasses = new Set(classes)
      setSelectedClasses(allClasses)
      setSelectAll(true)
    }
  }

  const toggleClassSelection = (classKey: string) => {
    const newSelected = new Set(selectedClasses)
    if (newSelected.has(classKey)) {
      newSelected.delete(classKey)
    } else {
      newSelected.add(classKey)
    }
    setSelectedClasses(newSelected)
    setSelectAll(newSelected.size === classes.length)
  }

  // Get unique classes
  const classes = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
  ]
  
  // Get all available terms from semesters.ts (use class 9 as reference for higher classes)
  const allTerms = getTermsForClass('9').map(t => t.name)

  const isPublished = (className: string, term: string) => {
    return publishedReports.find(
      (r) =>
        r.class === className &&
        r.term === term &&
        r.isPublished
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Publish Report Cards</h1>
        <p className="text-gray-500 mt-2">
          Manage report card publishing for students. Published reports can be viewed by students.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Academic Year and Term</CardTitle>
          <CardDescription>
            Choose the academic year and term to manage report publishing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.year}>
                      {year.year}
                      {year.isActive && (
                        <Badge className="ml-2" variant="secondary">
                          Active
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {allTerms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publishing Table */}
      {selectedYear && selectedTerm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Report Publishing Status</CardTitle>
                <CardDescription>
                  Publish or unpublish reports for {selectedTerm}, {selectedYear}
                </CardDescription>
              </div>
              {selectedClasses.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkUnpublish}
                    disabled={publishing === 'bulk'}
                  >
                    {publishing === 'bulk' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Unpublish Selected ({selectedClasses.size})
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkPublish}
                    disabled={publishing === 'bulk'}
                  >
                    {publishing === 'bulk' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Publish Selected ({selectedClasses.size})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published At</TableHead>
                    <TableHead>Published By</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((className) => {
                    const published = isPublished(className, selectedTerm)
                    const key = `${className}-${selectedTerm}`

                    return (
                      <TableRow key={className}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedClasses.has(className)}
                            onChange={() => toggleClassSelection(className)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium">Class {formatClass(className)}</TableCell>
                        <TableCell>
                          {published ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Published
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {published?.publishedAt
                            ? new Date(published.publishedAt).toLocaleString()
                            : '-'}
                        </TableCell>
                        <TableCell>{published?.publishedBy || '-'}</TableCell>
                        <TableCell className="text-right">
                          {published ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUnpublish(className, selectedTerm)
                              }
                              disabled={publishing === key}
                            >
                              {publishing === key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Unpublish'
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                handlePublish(className, selectedTerm)
                              }
                              disabled={publishing === key}
                            >
                              {publishing === key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Publish'
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
