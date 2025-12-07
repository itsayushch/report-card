# Default System Credentials

⚠️ **WARNING: PLAIN TEXT PASSWORDS - NO HASHING IS USED**

## Authentication System

This system uses **PLAIN TEXT** passwords stored directly in the database. **NO HASHING OR ENCRYPTION IS PERFORMED.**

---

## Admin Account

**Username:** `admin@sthelens.edu` (Email)  
**Password:** `admin@sthelens.edu` (Same as email)  
**Role:** Admin (Teacher with `isAdmin = true`)  
**First Login:** Yes (must reset password)

Login as Admin to access:
- Student management
- Teacher management
- Subject management
- Academic year management
- Report publishing
- Student promotions
- Admin logs

---

## Teacher Accounts

**Username:** Teacher's email address  
**Password:** Same as email (plain text)  
**First Login:** Yes (must reset password on first login)

Example:
- Email: `john.doe@sthelens.edu`
- Password: `john.doe@sthelens.edu`

All teachers created through the admin panel will have their email as the default password.

Teachers **MUST** change their password on first login.

**Permissions:**
- Enter marks for assigned subjects
- View assigned classes
- View student lists

---

## Student Accounts

**Username:** Student's roll number (e.g., `2024001`)  
**Password:** Date of birth in DDMMYYYY format (e.g., `15032010` for March 15, 2010)

When creating students:
- Manually: Must provide date of birth
- CSV Import: Must include dateOfBirth column in DDMMYYYY format

**Permissions:**
- View their own profile
- View report card (if published)
- View performance summary

---

## Password System

### Current Implementation
- **NO HASHING**: All passwords stored as plain text
- **NO ENCRYPTION**: Passwords visible in database
- **Admin/Teachers**: Email address (must reset on first login)
- **Students**: Date of birth in DDMMYYYY format

### First Login Flow
1. Teacher/Admin logs in with email as password
2. System checks `firstLogin` flag
3. If `firstLogin = true`, redirect to password reset page
4. After reset, `firstLogin` set to `false`

---

## Login Instructions

### Admin Login
1. Go to login page
2. Select "Admin" role
3. Username: `admin@sthelens.edu`
4. Password: `admin@sthelens.edu`
5. Reset password on first login

### Teacher Login
1. Go to login page
2. Select "Teacher" role
3. Username: Your email address
4. Password: Your email address (first time)
5. Reset password on first login

### Student Login
1. Go to login page
2. Select "Student" role
3. Username: Your roll number (e.g., `2024001`)
4. Password: Your date of birth (DDMMYYYY format, e.g., `15032010`)

---

## Password Reset

### For Teachers/Admin
API Endpoint: `POST /api/auth/reset-password`

```json
{
  "currentPassword": "current_password",
  "newPassword": "new_password"
}
```

### For Students
Students cannot reset their password. Contact admin to update date of birth if needed.

---

## Database Schema

### Student Model
```prisma
model Student {
  regNo       String @unique  // Username
  password     String          // Date of birth (DDMMYYYY)
  dateOfBirth  String          // Date of birth (DDMMYYYY)
  email        String @unique
  ...
}
```

### Teacher Model
```prisma
model Teacher {
  email        String @unique  // Username
  password     String          // Email (default) or custom after reset
  firstLogin   Boolean         // Track if password needs reset
  isAdmin      Boolean
  ...
}
```

---

## Security Notes

🔒 **CRITICAL SECURITY ISSUES:**
- ❌ Passwords stored as **PLAIN TEXT**
- ❌ No password hashing (bcrypt removed)
- ❌ Passwords visible in database
- ❌ Database breach = all passwords exposed
- ❌ **NOT SUITABLE FOR PRODUCTION**

This implementation is **ONLY** suitable for:
- Local development
- Learning environments
- Controlled internal networks
- Demo purposes

**NEVER USE IN PRODUCTION OR WITH REAL USER DATA**

---

## API Examples

### Create Student
```typescript
POST /api/students
{
  "name": "John Doe",
  "regNo": "2024001",
  "dateOfBirth": "15032010",  // March 15, 2010
  "email": "john@example.com",
  "class": "10",
  "section": "A",
  "parentName": "Jane Doe",
  "phone": "+1234567890"
}
// Username: 2024001
// Password: 15032010
```

### Create Teacher
```typescript
POST /api/teachers
{
  "name": "Teacher Name",
  "email": "teacher@school.edu",
  "phone": "+1234567890",
  "subjects": ["MATH101"],
  "assignedClasses": ["10-A"],
  "isAdmin": false
}
// Username: teacher@school.edu
// Password: teacher@school.edu (must reset on first login)
```

### CSV Import (Students)
CSV must include:
```csv
name,regNo,dateOfBirth,email,class,section,parentName,phone
John Doe,2024001,15032010,john@example.com,10,A,Jane Doe,+1234567890
```

---

## Migration from Hashed Passwords

If you previously had hashed passwords, you need to:

1. **Reset Database:**
   ```bash
   npx prisma db push --force-reset
   npx prisma db seed
   ```

2. **Update All Passwords:**
   - Admin: Email as password
   - Teachers: Email as password (with `firstLogin = true`)
   - Students: Date of birth in DDMMYYYY format

---

## Code References

### Password Validation (auth.ts)
```typescript
// Students: Plain text comparison
if (credentials.password !== student.password) {
  throw new Error('Invalid password')
}

// Teachers: Plain text comparison
if (credentials.password !== teacher.password) {
  throw new Error('Invalid password')
}
```

### Password Reset (reset-password/route.ts)
```typescript
// Verify current password (plain text)
if (teacher.password !== currentPassword) {
  throw new Error('Current password is incorrect')
}

// Update password (plain text)
await prisma.teacher.update({
  data: {
    password: newPassword,
    firstLogin: false,
  },
})
```

---

## Environment Variables

No environment variables needed for passwords since they're plain text.

---

## Testing Checklist

- [ ] Admin can login with email/email
- [ ] Teacher can login with email/email
- [ ] Student can login with regNo/dateOfBirth
- [ ] Teacher forced to reset password on first login
- [ ] Password reset works for teachers
- [ ] Students created with correct dateOfBirth
- [ ] CSV import includes dateOfBirth field
- [ ] All passwords stored as plain text in database
- [ ] No bcrypt imports anywhere in codebase


Login as Admin to access:
- Student management
- Teacher management
- Subject management
- Academic year management
- Report publishing
- Student promotions
- Admin logs

---

## Teacher Accounts

**Default Password:** `Teacher@123`

All teachers created through the admin panel will have this default password.

Teachers should change their password on first login.

**Permissions:**
- Enter marks for assigned subjects
- View assigned classes
- View student lists

---

## Student Accounts

**Default Password:** Student's roll number (e.g., `2024001`)

When creating students:
- Manually: Default password is their roll number
- CSV Import: Default password is their roll number

Students should change their password on first login.

**Permissions:**
- View their own profile
- View report card (if published)
- View performance summary

---

## Password Policy

### Current Settings (Development)
- **Admin:** `Admin@123`
- **Teacher:** `Teacher@123`
- **Student:** Their roll number

### Production Recommendations
1. Enforce strong password requirements
2. Require password change on first login
3. Implement password expiration
4. Add two-factor authentication for admin accounts
5. Store credentials in environment variables or secure vault
6. Implement password reset functionality

---

## Changing Default Passwords

### For Seed Data (Admin)
Edit `prisma/seed.ts`:
```typescript
const DEFAULT_CREDENTIALS = {
  admin: {
    email: 'admin@sthelens.edu',
    password: 'YourNewPassword',
  },
}
```

### For Teachers
Edit `src/app/api/teachers/route.ts`:
```typescript
const DEFAULT_TEACHER_PASSWORD = 'YourNewPassword'
```

### For Students
Students use their roll number by default. To change:
- Edit `src/app/api/students/route.ts`
- Edit `src/app/api/students/import/route.ts`

---

## Login Instructions

### Admin Login
1. Go to login page
2. Select "Admin" role
3. Enter email: `admin@sthelens.edu`
4. Enter password: `Admin@123`

### Teacher Login
1. Go to login page
2. Select "Teacher" role
3. Enter your email (provided by admin)
4. Enter password: `Teacher@123`

### Student Login
1. Go to login page
2. Select "Student" role
3. Enter your email (provided by admin)
4. Enter password: Your roll number (e.g., `2024001`)

---

## Security Notes

🔒 **IMPORTANT:**
- Never commit actual production passwords to version control
- Use environment variables for production credentials
- Implement proper password hashing (bcrypt with 10+ rounds)
- Add rate limiting to prevent brute force attacks
- Implement account lockout after failed login attempts
- Add audit logging for authentication events
- Regularly review and rotate passwords

---

## Environment Variables (Production)

Create a `.env.local` file:
```env
# Admin Credentials
ADMIN_EMAIL=admin@yourschool.edu
ADMIN_PASSWORD=your-secure-password-here

# Default Passwords
DEFAULT_TEACHER_PASSWORD=your-secure-teacher-password
DEFAULT_STUDENT_PASSWORD_PATTERN=rollNumber

# Password Policy
MIN_PASSWORD_LENGTH=8
REQUIRE_UPPERCASE=true
REQUIRE_LOWERCASE=true
REQUIRE_NUMBERS=true
REQUIRE_SPECIAL_CHARS=true
PASSWORD_EXPIRY_DAYS=90
```

Then update code to use these environment variables.
