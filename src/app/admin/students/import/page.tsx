'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { Download, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'

interface StudentImportData {
  name: string
  rollNo: string
  class: string
  section: string
  parentName?: string
  email?: string
  phone?: string
  academicYear?: string
}

export default function StudentImportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<StudentImportData[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
    errors: Array<{ row: number; error: string }>
  } | null>(null)

  // Redirect if not authenticated or not admin
  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session || session.user.role !== 'ADMIN') {
    router.push('/login')
    return null
  }

  const downloadTemplate = () => {
    const template = [
      {
        name: 'John Doe',
        rollNo: '2024001',
        class: '9',
        section: 'A',
        parentName: 'Jane Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        academicYear: '2024-2025',
      },
      {
        name: 'Alice Smith',
        rollNo: '2024002',
        class: '10',
        section: 'B',
        parentName: 'Bob Smith',
        email: 'alice.smith@example.com',
        phone: '+1234567891',
        academicYear: '2024-2025',
      },
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'student_import_template.csv'
    link.click()

    toast.success('Template downloaded')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setImportResult(null)

      // Parse CSV for preview
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreview(results.data as StudentImportData[])
        },
        error: (error) => {
          toast.error(`CSV parsing error: ${error.message}`)
        },
      })
    }
  }

  const handleImport = async () => {
    if (!file || preview.length === 0) {
      toast.error('Please select a valid CSV file')
      return
    }

    setImporting(true)

    try {
      const response = await fetch('/api/students/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students: preview }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setImportResult(result)

      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} students`)
      }

      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} students`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import students')
    } finally {
      setImporting(false)
    }
  }

  const clearImport = () => {
    setFile(null)
    setPreview([])
    setImportResult(null)
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Students</h1>
        <p className="text-muted-foreground">
          Bulk import students from CSV file
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Download the template, fill in student data, and upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">Select CSV File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>

            {preview.length > 0 && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  {preview.length} students ready to import
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={preview.length === 0 || importing}
                className="flex-1"
              >
                {importing ? 'Importing...' : 'Import Students'}
              </Button>
              {preview.length > 0 && (
                <Button onClick={clearImport} variant="outline">
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold">Required Fields:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>name - Student full name</li>
                <li>rollNo - Unique roll number</li>
                <li>class - Class number (e.g., 9, 10, 11, 12)</li>
                <li>section - Section letter (e.g., A, B, C)</li>
              </ul>
            </div>

            <div className="space-y-2 text-sm">
              <h3 className="font-semibold">Optional Fields:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>parentName - Parent/Guardian name</li>
                <li>email - Student email address</li>
                <li>phone - Contact phone number</li>
                <li>academicYear - Academic year (defaults to current)</li>
              </ul>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Default password for all imported students will be their roll
                number. Students should change it on first login.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Preview Table */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({preview.length} rows)</CardTitle>
            <CardDescription>
              Review the data before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Parent Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Academic Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 10).map((student, index) => (
                    <TableRow key={index}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.rollNo}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>{student.section}</TableCell>
                      <TableCell>{student.parentName || '-'}</TableCell>
                      <TableCell>{student.email || '-'}</TableCell>
                      <TableCell>{student.phone || '-'}</TableCell>
                      <TableCell>{student.academicYear || 'Current'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {preview.length > 10 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                  ... and {preview.length - 10} more rows
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <span className="font-semibold">
                    {importResult.success} Successful
                  </span>
                </AlertDescription>
              </Alert>

              {importResult.failed > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <span className="font-semibold">
                      {importResult.failed} Failed
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Errors:</h3>
                <div className="border rounded-lg p-4 max-h-64 overflow-auto bg-muted/50">
                  <ul className="space-y-2 text-sm">
                    {importResult.errors.map((error, index) => (
                      <li key={index} className="text-red-600">
                        Row {error.row}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
