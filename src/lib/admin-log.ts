import { prisma } from './prisma'
import { headers } from 'next/headers'

interface AdminLogParams {
  adminId: string
  action: string
  entityType: string
  entityId?: string
  description: string
  metadata?: any
}

export async function createAdminLog(params: AdminLogParams) {
  try {
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    await prisma.adminLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        metadata: params.metadata || null,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to create admin log:', error)
    // Don't throw error to avoid breaking the main operation
  }
}

// Common admin actions
export const AdminActions = {
  // Student actions
  CREATE_STUDENT: 'CREATE_STUDENT',
  UPDATE_STUDENT: 'UPDATE_STUDENT',
  DELETE_STUDENT: 'DELETE_STUDENT',
  IMPORT_STUDENTS: 'IMPORT_STUDENTS',
  PROMOTE_STUDENT: 'PROMOTE_STUDENT',
  
  // Teacher actions
  CREATE_TEACHER: 'CREATE_TEACHER',
  UPDATE_TEACHER: 'UPDATE_TEACHER',
  DELETE_TEACHER: 'DELETE_TEACHER',
  GRANT_ADMIN: 'GRANT_ADMIN',
  REVOKE_ADMIN: 'REVOKE_ADMIN',
  
  // Subject actions
  CREATE_SUBJECT: 'CREATE_SUBJECT',
  UPDATE_SUBJECT: 'UPDATE_SUBJECT',
  DELETE_SUBJECT: 'DELETE_SUBJECT',
  
  // Academic year actions
  CREATE_ACADEMIC_YEAR: 'CREATE_ACADEMIC_YEAR',
  UPDATE_ACADEMIC_YEAR: 'UPDATE_ACADEMIC_YEAR',
  DELETE_ACADEMIC_YEAR: 'DELETE_ACADEMIC_YEAR',
  SET_ACTIVE_YEAR: 'SET_ACTIVE_YEAR',
  
  // Report actions
  PUBLISH_REPORT: 'PUBLISH_REPORT',
  UNPUBLISH_REPORT: 'UNPUBLISH_REPORT',
  
  // System actions
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
} as const
