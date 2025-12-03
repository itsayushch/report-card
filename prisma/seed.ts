import { PrismaClient, Status, PromotionStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Default credentials - NO HASHING, PLAIN TEXT
const DEFAULT_CREDENTIALS = {
  admin: {
    email: 'admin@sthelens.edu',
    password: 'admin@sthelens.edu',  // Email as password (plain text)
  },
}

async function main() {
  console.log('Starting seed...')

  // Create admin user (as a teacher with isAdmin = true)
  const admin = await prisma.teacher.upsert({
    where: { email: DEFAULT_CREDENTIALS.admin.email },
    update: {},
    create: {
      email: DEFAULT_CREDENTIALS.admin.email,
      password: DEFAULT_CREDENTIALS.admin.password,  // Plain text email
      name: 'System Administrator',
      classSubjectPairs: [],
      isAdmin: true,
      isSuperAdmin: true,  // Mark as super administrator
      firstLogin: true,  // Require password change on first login
    }
  })

  console.log('Created admin user:', admin.email)
  console.log('Admin credentials:')
  console.log('  Email:', DEFAULT_CREDENTIALS.admin.email)
  console.log('  Password:', DEFAULT_CREDENTIALS.admin.password)

  // Create a sample academic year
  const academicYear = await prisma.academicYear.upsert({
    where: { year: '2025' },
    update: {},
    create: {
      year: '2025',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-05-31'),
      isActive: true,
    }
  })

  console.log('Created academic year:', academicYear.year)

  // Create sample subjects
  const subjects = [
    { name: 'Mathematics', code: 'MATH', maxMarks: 100, passingMarks: 45 },
    { name: 'English', code: 'ENG', maxMarks: 100, passingMarks: 45 },
    { name: 'Science', code: 'SCI', maxMarks: 100, passingMarks: 45 },
    { name: 'Social Studies', code: 'SOC', maxMarks: 100, passingMarks: 45 },
    { name: 'Hindi', code: 'HIN', maxMarks: 100, passingMarks: 45 },
  ]

  for (const subject of subjects) {
    await prisma.subject.create({
      data: {
        ...subject,
        academicYear: '2025'
      },
    }).catch(() => {
      // Subject already exists, skip
    })
  }

  console.log('Created sample subjects')

  // Create sample teachers
  const teachers = [
    {
      name: 'John Smith',
      email: 'john.smith@sthelens.edu',
      password: 'john.smith@sthelens.edu',
      classSubjectPairs: [
        { subject: 'MATH', classAssigned: '10' },
        { subject: 'MATH', classAssigned: '9' },
        { subject: 'SCI', classAssigned: '10' },
        { subject: 'SCI', classAssigned: '9' },
      ],
      isAdmin: false,
      firstLogin: true
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@sthelens.edu',
      password: 'sarah.johnson@sthelens.edu',
      classSubjectPairs: [
        { subject: 'ENG', classAssigned: '10' },
        { subject: 'ENG', classAssigned: '9' },
        { subject: 'HIN', classAssigned: '10' },
        { subject: 'HIN', classAssigned: '9' },
      ],
      isAdmin: false,
      firstLogin: true
    },
    {
      name: 'Michael Brown',
      email: 'michael.brown@sthelens.edu',
      password: 'michael.brown@sthelens.edu',
      classSubjectPairs: [
        { subject: 'SOC', classAssigned: '10' },
        { subject: 'SOC', classAssigned: '9' },
      ],
      isAdmin: false,
      firstLogin: true
    }
  ]

  for (const teacher of teachers) {
    await prisma.teacher.upsert({
      where: { email: teacher.email },
      update: {},
      create: teacher
    })
  }

  console.log('Created sample teachers')

  // Create sample students
  const students = [
    // Class X (10)
    {
      name: 'Raj Kumar',
      rollNo: '2024001',
      email: 'raj.kumar@student.sthelens.edu',
      dateOfBirth: '15/01/2010',
      password: '15012010',
      class: 'X',
      parentName: 'Suresh Kumar',
      phone: '+1234560001',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Priya Sharma',
      rollNo: '2024002',
      email: 'priya.sharma@student.sthelens.edu',
      dateOfBirth: '22/03/2010',
      password: '22032010',
      class: 'X',
      parentName: 'Ramesh Sharma',
      phone: '+1234560002',
      academicYear: '2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Amit Patel',
      rollNo: '2024003',
      email: 'amit.patel@student.sthelens.edu',
      dateOfBirth: '08/07/2010',
      password: '08072010',
      class: 'X',
      parentName: 'Vijay Patel',
      phone: '+1234560003',
      academicYear: '2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Sneha Reddy',
      rollNo: '2024004',
      email: 'sneha.reddy@student.sthelens.edu',
      dateOfBirth: '12/11/2010',
      password: '12112010',
      class: 'X',
      parentName: 'Krishna Reddy',
      phone: '+1234560004',
      academicYear: '2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Vikram Singh',
      rollNo: '2024005',
      email: 'vikram.singh@student.sthelens.edu',
      dateOfBirth: '25/06/2010',
      password: '25062010',
      class: 'X',
      parentName: 'Ranjit Singh',
      phone: '+1234560005',
      academicYear: '2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Ananya Gupta',
      rollNo: '2024006',
      email: 'ananya.gupta@student.sthelens.edu',
      dateOfBirth: '30/09/2010',
      password: '30092010',
      class: 'X',
      parentName: 'Anil Gupta',
      phone: '+1234560006',
      academicYear: '2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Rahul Verma',
      rollNo: '2024007',
      email: 'rahul.verma@student.sthelens.edu',
      dateOfBirth: '18/04/2011',
      password: '18042011',
      class: 'IX',
      parentName: 'Prakash Verma',
      phone: '+1234560007',
      academicYear: '2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Kavya Iyer',
      rollNo: '2024008',
      email: 'kavya.iyer@student.sthelens.edu',
      dateOfBirth: '05/01/2011',
      password: '05012011',
      class: 'IX',
      parentName: 'Sundar Iyer',
      phone: '+1234560008',
      academicYear: '2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Arjun Rao',
      rollNo: '2024009',
      email: 'arjun.rao@student.sthelens.edu',
      dateOfBirth: '27/08/2011',
      password: '27082011',
      class: 'IX',
      parentName: 'Mohan Rao',
      phone: '+1234560009',
      academicYear: '2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Divya Nair',
      rollNo: '2024010',
      email: 'divya.nair@student.sthelens.edu',
      dateOfBirth: '14/12/2011',
      password: '14122011',
      class: 'IX',
      parentName: 'Rajesh Nair',
      phone: '+1234560010',
      academicYear: '2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    }
  ]

  for (const student of students) {
    await prisma.student.upsert({
      where: { rollNo: student.rollNo },
      update: {},
      create: {
        ...student,
        status: Status.ACTIVE,
        promotionStatus: PromotionStatus.PENDING
      }
    })
  }

  console.log('Created sample students')

  // Create sample marks for some students
  const subjectRecords = await prisma.subject.findMany()
  const teacherRecords = await prisma.teacher.findMany()
  
  const sampleMarks = [
    // Student 2024001 (Raj Kumar) - Class 10-A
    { studentRollNo: '2024001', subjectName: 'Mathematics', term: 'Term 1', marks: 85 },
    { studentRollNo: '2024001', subjectName: 'English', term: 'Term 1', marks: 78 },
    { studentRollNo: '2024001', subjectName: 'Science', term: 'Term 1', marks: 92 },
    { studentRollNo: '2024001', subjectName: 'Social Studies', term: 'Term 1', marks: 88 },
    { studentRollNo: '2024001', subjectName: 'Hindi', term: 'Term 1', marks: 75 },
    
    // Student 2024002 (Priya Sharma) - Class 10-A
    { studentRollNo: '2024002', subjectName: 'Mathematics', term: 'Term 1', marks: 90 },
    { studentRollNo: '2024002', subjectName: 'English', term: 'Term 1', marks: 95 },
    { studentRollNo: '2024002', subjectName: 'Science', term: 'Term 1', marks: 88 },
    { studentRollNo: '2024002', subjectName: 'Social Studies', term: 'Term 1', marks: 92 },
    { studentRollNo: '2024002', subjectName: 'Hindi', term: 'Term 1', marks: 87 },
    
    // Student 2024003 (Amit Patel) - Class 10-A
    { studentRollNo: '2024003', subjectName: 'Mathematics', term: 'Term 1', marks: 72 },
    { studentRollNo: '2024003', subjectName: 'English', term: 'Term 1', marks: 68 },
    { studentRollNo: '2024003', subjectName: 'Science', term: 'Term 1', marks: 75 },
    { studentRollNo: '2024003', subjectName: 'Social Studies', term: 'Term 1', marks: 70 },
    { studentRollNo: '2024003', subjectName: 'Hindi', term: 'Term 1', marks: 65 },
  ]

  // TODO: Marks are now embedded in Student.academicRecords - seed data removed
  console.log('✓ Skipping marks seeding - now using embedded academicRecords in Student model')

  console.log('\n=== Seed completed successfully! ===')
  console.log('\nDefault Credentials (PLAIN TEXT - NO HASHING):')
  console.log('-----------------------------------')
  console.log('ADMIN:')
  console.log(`  Email: admin@sthelens.edu`)
  console.log(`  Password: admin@sthelens.edu`)
  console.log('\nTEACHERS:')
  console.log(`  john.smith@sthelens.edu / john.smith@sthelens.edu`)
  console.log(`  sarah.johnson@sthelens.edu / sarah.johnson@sthelens.edu`)
  console.log(`  michael.brown@sthelens.edu / michael.brown@sthelens.edu`)
  console.log('\nSTUDENTS (Username: Roll No / Password: DOB in DDMMYYYY):')
  console.log(`  2024001 / 15012010 (Raj Kumar - Class 10-A)`)
  console.log(`  2024002 / 22032010 (Priya Sharma - Class 10-A)`)
  console.log(`  2024003 / 08072010 (Amit Patel - Class 10-A)`)
  console.log(`  2024004 / 12112010 (Sneha Reddy - Class 10-B)`)
  console.log(`  2024005 / 25062010 (Vikram Singh - Class 10-B)`)
  console.log(`  2024006 / 30092010 (Ananya Gupta - Class 10-B)`)
  console.log(`  2024007 / 18042011 (Rahul Verma - Class 9-A)`)
  console.log(`  2024008 / 05012011 (Kavya Iyer - Class 9-A)`)
  console.log(`  2024009 / 27082011 (Arjun Rao - Class 9-B)`)
  console.log(`  2024010 / 14122011 (Divya Nair - Class 9-B)`)
  console.log('-----------------------------------\n')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
