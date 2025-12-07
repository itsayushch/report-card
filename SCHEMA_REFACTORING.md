# Schema Refactoring Summary

## Major Changes

### 1. Removed Separate `User` Collection
**Before:** Had a separate `users` collection with relations to `Student` and `Teacher`
**After:** Authentication credentials embedded directly in `Student` and `Teacher` collections

### 2. Added Admin System
- Added `isAdmin` field to `Teacher` model
- Teachers with `isAdmin = true` can access admin panel
- Removed separate `ADMIN` role - admins are teachers with elevated privileges

### 3. Added Admin Audit Logging
- New `AdminLog` collection tracks all admin actions
- Captures: action type, entity, description, metadata, IP address, user agent
- Indexed for efficient querying

## Updated Schema

### Student Model
```prisma
model Student {
  id              String
  name            String
  regNo          String @unique
  email           String @unique  // Now unique
  password        String          // NEW: embedded auth
  class           String
  section         String
  parentName      String
  phone           String
  photo           String?
  status          Status
  academicYear    String
  promotionStatus PromotionStatus
  createdAt       DateTime
  updatedAt       DateTime
  marks           Mark[]
}
```

### Teacher Model
```prisma
model Teacher {
  id              String
  name            String
  email           String @unique
  password        String          // NEW: embedded auth
  phone           String
  subjects        String[]
  assignedClasses String[]
  isAdmin         Boolean         // NEW: admin flag
  createdAt       DateTime
  updatedAt       DateTime
  marks           Mark[]
  adminLogs       AdminLog[]      // NEW: admin actions
  reportPublishes ReportPublish[] // NEW: report publishing tracking
}
```

### AdminLog Model (NEW)
```prisma
model AdminLog {
  id          String
  adminId     String        // References Teacher
  admin       Teacher
  action      String        // e.g., "CREATE_STUDENT", "UPDATE_TEACHER"
  entityType  String        // e.g., "Student", "Teacher", "Subject"
  entityId    String?       // ID of affected entity
  description String        // Human-readable description
  metadata    Json?         // Additional data (old/new values, etc.)
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime
}
```

### ReportPublish Model (Updated)
```prisma
model ReportPublish {
  publishedById String?    // Now references Teacher
  publishedBy   Teacher?   // NEW: relation to Teacher
}
```

## Authentication Changes

### Login Flow
```typescript
// Students login with email/password
role: 'STUDENT' -> checks Student collection

// Teachers login with email/password  
role: 'TEACHER' -> checks Teacher collection (isAdmin must be false)

// Admins login with email/password
role: 'ADMIN' -> checks Teacher collection (isAdmin must be true)
```

### Default Passwords
- **Students:** Roll number (e.g., `2024001`)
- **Teachers:** `teacher123`
- **Admin:** `admin123`

## New Utilities

### Admin Logging (`src/lib/admin-log.ts`)
```typescript
import { createAdminLog, AdminActions } from '@/lib/admin-log'

// Log admin action
await createAdminLog({
  adminId: session.user.id,
  action: AdminActions.CREATE_STUDENT,
  entityType: 'Student',
  entityId: student.id,
  description: `Created student: ${student.name}`,
  metadata: { studentData: {...} }
})
```

### Available Admin Actions
- Student: CREATE, UPDATE, DELETE, IMPORT, PROMOTE
- Teacher: CREATE, UPDATE, DELETE, GRANT_ADMIN, REVOKE_ADMIN
- Subject: CREATE, UPDATE, DELETE
- Academic Year: CREATE, UPDATE, DELETE, SET_ACTIVE
- Report: PUBLISH, UNPUBLISH
- System: LOGIN, LOGOUT

## Migration Steps

### 1. Update Database Schema
```bash
npx prisma db push --force-reset
npx prisma generate
```

### 2. Seed Initial Admin
```bash
npx prisma db seed
```
Creates admin teacher:
- Email: `admin@sthelens.edu`
- Password: `admin123`
- isAdmin: `true`

### 3. Existing Data Migration (if needed)
If you have existing data in `users`, `students`, `teachers` collections:

```typescript
// Migration script (run once)
const users = await prisma.user.findMany()

for (const user of users) {
  if (user.role === 'STUDENT' && user.studentId) {
    const student = await prisma.student.findUnique({
      where: { id: user.studentId }
    })
    
    if (student) {
      await prisma.student.update({
        where: { id: student.id },
        data: { password: user.password }
      })
    }
  }
  
  if (user.role === 'TEACHER' && user.teacherId) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: user.teacherId }
    })
    
    if (teacher) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { 
          password: user.password,
          isAdmin: user.role === 'ADMIN'
        }
      })
    }
  }
}

// After migration, drop users collection
await prisma.user.deleteMany()
```

## Updated API Routes

### Student Creation
- Now creates student with embedded password
- Default password: roll number
- Requires admin authentication
- Logs admin action

### Teacher Creation
- Now creates teacher with embedded password
- Default password: `teacher123`
- Can set `isAdmin` flag
- Requires admin authentication
- Logs admin action

### Student Import
- Auto-generates passwords (roll number)
- Checks for duplicate email/regNo
- Logs bulk import action

## Updated Components

### Login Page
- No changes to UI
- Backend authentication updated to check Student/Teacher collections

### Admin Sidebar
- No changes needed (role check updates automatically)

### Teacher Forms
- Add optional `isAdmin` checkbox for creating admins

## Security Improvements

1. **Simplified Architecture:** One less collection to secure
2. **Email Uniqueness:** Both students and teachers must have unique emails
3. **Admin Tracking:** All admin actions are logged with metadata
4. **IP & User Agent Tracking:** Helps identify unauthorized access
5. **Password Requirements:** Can now enforce different password policies per role

## API Examples

### Create Student (Admin)
```typescript
POST /api/students
{
  "name": "John Doe",
  "regNo": "2024001",
  "email": "john@example.com",
  "class": "10",
  "section": "A",
  "parentName": "Jane Doe",
  "phone": "+1234567890"
}
// Password auto-generated: "2024001"
// Admin log created automatically
```

### Create Teacher with Admin Privileges
```typescript
POST /api/teachers
{
  "name": "Admin Teacher",
  "email": "teacher@school.edu",
  "phone": "+1234567890",
  "subjects": ["MATH101"],
  "assignedClasses": ["10-A"],
  "isAdmin": true
}
// Password: "teacher123"
// Can login with role: 'ADMIN'
```

### View Admin Logs
```typescript
GET /api/admin/logs
?adminId=<teacher_id>
&action=CREATE_STUDENT
&startDate=2024-01-01
&endDate=2024-12-31
```

## Testing Checklist

- [ ] Admin can login with teacher credentials (isAdmin=true)
- [ ] Teacher can login with teacher credentials (isAdmin=false)
- [ ] Student can login with student credentials
- [ ] Admin can create students (password = regNo)
- [ ] Admin can create teachers (password = teacher123)
- [ ] Admin can promote teachers to admin (isAdmin=true)
- [ ] Admin actions are logged in AdminLog
- [ ] Students can view reports (if published)
- [ ] Teachers can enter marks
- [ ] CSV import creates students with correct passwords
- [ ] Duplicate email/regNo validation works
- [ ] Admin logs capture IP address and user agent

## Breaking Changes

⚠️ **WARNING:** This is a breaking change that requires:
1. Database schema reset OR manual migration
2. All existing users must be recreated or migrated
3. Update all API routes that reference `User` model
4. Update all components that use `session.user.teacherId` or `session.user.studentId`

## Files Modified

### Schema
- `prisma/schema.prisma` - Complete overhaul
- `prisma/seed.ts` - Updated admin creation

### Authentication
- `src/lib/auth.ts` - New login logic
- `src/lib/admin-log.ts` - NEW: Admin logging utility

### Validation
- `src/lib/validations.ts` - Added `isAdmin` to teacherSchema

### API Routes
- `src/app/api/students/route.ts` - Embedded auth + logging
- `src/app/api/teachers/route.ts` - Embedded auth + logging
- Update needed: `/api/students/[id]/route.ts`, `/api/teachers/[id]/route.ts`

### Components
- Update needed: All components using session data
