'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, User, FileText, Calendar, Clock, MapPin, Monitor, Shield, UserCog, BookOpen, GraduationCap, FileCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { AdminLog } from '@prisma/client'

type AdminLogWithAdmin = AdminLog & {
  admin: {
    name: string
    email: string
    profilePicture: string | null
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminLogWithAdmin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterEntity, setFilterEntity] = useState<string>('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/audit-logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = filterAction === 'all' || log.action === filterAction
    const matchesEntity = filterEntity === 'all' || log.entityType === filterEntity

    return matchesSearch && matchesAction && matchesEntity
  })

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return <FileText className="h-4 w-4" />
    if (action.includes('UPDATE')) return <FileCheck className="h-4 w-4" />
    if (action.includes('DELETE')) return <FileText className="h-4 w-4" />
    if (action.includes('RESET_PASSWORD')) return <Shield className="h-4 w-4" />
    if (action.includes('GRANT') || action.includes('REVOKE')) return <UserCog className="h-4 w-4" />
    if (action.includes('PUBLISH')) return <FileCheck className="h-4 w-4" />
    if (action.includes('IMPORT')) return <FileText className="h-4 w-4" />
    if (action.includes('PROMOTE')) return <GraduationCap className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-700 border-green-200'
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700 border-blue-200'
    if (action.includes('DELETE')) return 'bg-red-100 text-red-700 border-red-200'
    if (action.includes('RESET_PASSWORD')) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    if (action.includes('GRANT')) return 'bg-purple-100 text-purple-700 border-purple-200'
    if (action.includes('REVOKE')) return 'bg-orange-100 text-orange-700 border-orange-200'
    if (action.includes('PUBLISH')) return 'bg-indigo-100 text-indigo-700 border-indigo-200'
    if (action.includes('IMPORT')) return 'bg-cyan-100 text-cyan-700 border-cyan-200'
    if (action.includes('PROMOTE')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'Student': return <GraduationCap className="h-3.5 w-3.5" />
      case 'Teacher': return <UserCog className="h-3.5 w-3.5" />
      case 'Subject': return <BookOpen className="h-3.5 w-3.5" />
      case 'AcademicYear': return <Calendar className="h-3.5 w-3.5" />
      case 'Report': return <FileCheck className="h-3.5 w-3.5" />
      default: return <FileText className="h-3.5 w-3.5" />
    }
  }

  const formatActionName = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))
  const uniqueEntities = Array.from(new Set(logs.map((log) => log.entityType)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-gray-500 mt-1">Track all administrative actions and changes</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Activity Log
              </CardTitle>
              <CardDescription>Complete history of all administrative actions</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {formatActionName(action)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {uniqueEntities.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Details</TableHead>
                    <TableHead className="font-semibold">Entity</TableHead>
                    <TableHead className="font-semibold">Timestamp</TableHead>
                    <TableHead className="font-semibold">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-gray-100 p-3">
                            <FileText className="h-6 w-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">
                            {searchTerm || filterAction !== 'all' || filterEntity !== 'all'
                              ? 'No logs found matching your filters'
                              : 'No audit logs yet'}
                          </p>
                          {(searchTerm || filterAction !== 'all' || filterEntity !== 'all') && (
                            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-gray-50">
                        <TableCell>
                          <Badge className={`${getActionColor(log.action)} border font-medium`}>
                            <span className="flex items-center gap-1.5">
                              {getActionIcon(log.action)}
                              {formatActionName(log.action)}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={log.admin.profilePicture || undefined} alt={log.admin.name} />
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                {log.admin.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{log.admin.name}</span>
                              <span className="text-xs text-gray-500">
                                {log.admin.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-700">{log.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            <span className="flex items-center gap-1.5">
                              {getEntityIcon(log.entityType)}
                              {log.entityType}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <span>{format(new Date(log.createdAt), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(log.createdAt), 'hh:mm a')}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="truncate max-w-[100px]" title={log.ipAddress || undefined}>
                                {log.ipAddress || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Monitor className="h-3 w-3 text-gray-400" />
                              <span className="truncate max-w-[100px]" title={log.userAgent || undefined}>
                                {log.userAgent?.includes('Chrome') ? 'Chrome' : 
                                 log.userAgent?.includes('Firefox') ? 'Firefox' : 
                                 log.userAgent?.includes('Safari') ? 'Safari' : 
                                 log.userAgent?.includes('Edge') ? 'Edge' : 'Browser'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && filteredLogs.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>
            Showing <span className="font-medium text-gray-700">{filteredLogs.length}</span> of{' '}
            <span className="font-medium text-gray-700">{logs.length}</span> logs
          </p>
          <p className="text-xs">
            Last updated: {format(new Date(), 'MMM dd, yyyy hh:mm a')}
          </p>
        </div>
      )}
    </div>
  )
}
