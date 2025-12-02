'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { formatClass } from '@/lib/class-utils'

interface StudentFiltersProps {
  search: string
  classFilter: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onClassChange: (value: string) => void
  onStatusChange: (value: string) => void
}

const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export function StudentFilters({
  search,
  classFilter,
  statusFilter,
  onSearchChange,
  onClassChange,
  onStatusChange,
}: StudentFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="search"
            placeholder="Name, roll no, email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="class">Class</Label>
        <Select value={classFilter || undefined} onValueChange={onClassChange}>
          <SelectTrigger id="class">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls} value={cls}>
                Class {formatClass(cls)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={statusFilter || undefined} onValueChange={onStatusChange}>
          <SelectTrigger id="status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
