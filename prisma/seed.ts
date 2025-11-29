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
      phone: '+1234567890',
      subjects: [],
      assignedClasses: [],
      isAdmin: true,
      firstLogin: true,  // Require password change on first login
    }
  })

  console.log('Created admin user:', admin.email)
  console.log('Admin credentials:')
  console.log('  Email:', DEFAULT_CREDENTIALS.admin.email)
  console.log('  Password:', DEFAULT_CREDENTIALS.admin.password)

  // Create a sample academic year
  const academicYear = await prisma.academicYear.upsert({
    where: { year: '2024-2025' },
    update: {},
    create: {
      year: '2024-2025',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-05-31'),
      isActive: true,
      terms: [
        {
          name: 'Term 1',
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-09-30')
        },
        {
          name: 'Term 2',
          startDate: new Date('2024-10-01'),
          endDate: new Date('2024-12-31')
        },
        {
          name: 'Final',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-05-31')
        }
      ]
    }
  })

  console.log('Created academic year:', academicYear.year)

  // Create sample subjects
  const subjects = [
    { name: 'Mathematics', code: 'MATH101', maxMarks: 100, passingMarks: 40 },
    { name: 'English', code: 'ENG101', maxMarks: 100, passingMarks: 40 },
    { name: 'Science', code: 'SCI101', maxMarks: 100, passingMarks: 40 },
    { name: 'Social Studies', code: 'SS101', maxMarks: 100, passingMarks: 40 },
    { name: 'Hindi', code: 'HIN101', maxMarks: 100, passingMarks: 40 },
  ]

  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { code: subject.code },
      update: {},
      create: {
        ...subject,
        academicYear: '2024-2025'
      }
    })
  }

  console.log('Created sample subjects')

  // Create sample teachers
  const teachers = [
    {
      name: 'John Smith',
      email: 'john.smith@sthelens.edu',
      password: 'john.smith@sthelens.edu',
      phone: '+1234567891',
      subjects: ['MATH101', 'SCI101'],
      assignedClasses: ['10-A', '10-B'],
      isAdmin: false,
      firstLogin: true
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@sthelens.edu',
      password: 'sarah.johnson@sthelens.edu',
      phone: '+1234567892',
      subjects: ['ENG101', 'HIN101'],
      assignedClasses: ['10-A', '9-A'],
      isAdmin: false,
      firstLogin: true
    },
    {
      name: 'Michael Brown',
      email: 'michael.brown@sthelens.edu',
      password: 'michael.brown@sthelens.edu',
      phone: '+1234567893',
      subjects: ['SS101'],
      assignedClasses: ['10-B', '9-B'],
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
    // Class 10-A
    {
      name: 'Raj Kumar',
      rollNo: '2024001',
      email: 'raj.kumar@student.sthelens.edu',
      dateOfBirth: '15/01/2010',
      password: '15012010',
      class: '10',
      section: 'A',
      parentName: 'Suresh Kumar',
      phone: '+1234560001',
      academicYear: '2024-2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Priya Sharma',
      rollNo: '2024002',
      email: 'priya.sharma@student.sthelens.edu',
      dateOfBirth: '22/03/2010',
      password: '22032010',
      class: '10',
      section: 'A',
      parentName: 'Ramesh Sharma',
      phone: '+1234560002',
      academicYear: '2024-2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Amit Patel',
      rollNo: '2024003',
      email: 'amit.patel@student.sthelens.edu',
      dateOfBirth: '08/07/2010',
      password: '08072010',
      class: '10',
      section: 'A',
      parentName: 'Vijay Patel',
      phone: '+1234560003',
      academicYear: '2024-2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    // Class 10-B
    {
      name: 'Sneha Reddy',
      rollNo: '2024004',
      email: 'sneha.reddy@student.sthelens.edu',
      dateOfBirth: '12/11/2010',
      password: '12112010',
      class: '10',
      section: 'B',
      parentName: 'Krishna Reddy',
      phone: '+1234560004',
      academicYear: '2024-2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Vikram Singh',
      rollNo: '2024005',
      email: 'vikram.singh@student.sthelens.edu',
      dateOfBirth: '25/06/2010',
      password: '25062010',
      class: '10',
      section: 'B',
      parentName: 'Ranjit Singh',
      phone: '+1234560005',
      academicYear: '2024-2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Ananya Gupta',
      rollNo: '2024006',
      email: 'ananya.gupta@student.sthelens.edu',
      dateOfBirth: '30/09/2010',
      password: '30092010',
      class: '10',
      section: 'B',
      parentName: 'Anil Gupta',
      phone: '+1234560006',
      academicYear: '2024-2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    // Class 9-A
    {
      name: 'Rahul Verma',
      rollNo: '2024007',
      email: 'rahul.verma@student.sthelens.edu',
      dateOfBirth: '18/04/2011',
      password: '18042011',
      class: '9',
      section: 'A',
      parentName: 'Prakash Verma',
      phone: '+1234560007',
      academicYear: '2024-2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Kavya Iyer',
      rollNo: '2024008',
      email: 'kavya.iyer@student.sthelens.edu',
      dateOfBirth: '05/01/2011',
      password: '05012011',
      class: '9',
      section: 'A',
      parentName: 'Sundar Iyer',
      phone: '+1234560008',
      academicYear: '2024-2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    // Class 9-B
    {
      name: 'Arjun Rao',
      rollNo: '2024009',
      email: 'arjun.rao@student.sthelens.edu',
      dateOfBirth: '27/08/2011',
      password: '27082011',
      class: '9',
      section: 'B',
      parentName: 'Mohan Rao',
      phone: '+1234560009',
      academicYear: '2024-2025',
      status: 'ACTIVE',
      promotionStatus: 'PENDING'
    },
    {
      name: 'Divya Nair',
      rollNo: '2024010',
      email: 'divya.nair@student.sthelens.edu',
      dateOfBirth: '14/12/2011',
      password: '14122011',
      class: '9',
      section: 'B',
      parentName: 'Rajesh Nair',
      phone: '+1234560010',
      academicYear: '2024-2025',
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
    { studentRollNo: '2024001', subjectCode: 'MATH101', term: 'Term 1', marks: 85 },
    { studentRollNo: '2024001', subjectCode: 'ENG101', term: 'Term 1', marks: 78 },
    { studentRollNo: '2024001', subjectCode: 'SCI101', term: 'Term 1', marks: 92 },
    { studentRollNo: '2024001', subjectCode: 'SS101', term: 'Term 1', marks: 88 },
    { studentRollNo: '2024001', subjectCode: 'HIN101', term: 'Term 1', marks: 75 },
    
    // Student 2024002 (Priya Sharma) - Class 10-A
    { studentRollNo: '2024002', subjectCode: 'MATH101', term: 'Term 1', marks: 90 },
    { studentRollNo: '2024002', subjectCode: 'ENG101', term: 'Term 1', marks: 95 },
    { studentRollNo: '2024002', subjectCode: 'SCI101', term: 'Term 1', marks: 88 },
    { studentRollNo: '2024002', subjectCode: 'SS101', term: 'Term 1', marks: 92 },
    { studentRollNo: '2024002', subjectCode: 'HIN101', term: 'Term 1', marks: 87 },
    
    // Student 2024003 (Amit Patel) - Class 10-A
    { studentRollNo: '2024003', subjectCode: 'MATH101', term: 'Term 1', marks: 72 },
    { studentRollNo: '2024003', subjectCode: 'ENG101', term: 'Term 1', marks: 68 },
    { studentRollNo: '2024003', subjectCode: 'SCI101', term: 'Term 1', marks: 75 },
    { studentRollNo: '2024003', subjectCode: 'SS101', term: 'Term 1', marks: 70 },
    { studentRollNo: '2024003', subjectCode: 'HIN101', term: 'Term 1', marks: 65 },
  ]

  for (const mark of sampleMarks) {
    const student = await prisma.student.findUnique({
      where: { rollNo: mark.studentRollNo }
    })
    const subject = subjectRecords.find(s => s.code === mark.subjectCode)
    
    if (student && subject) {
      // Find a teacher who teaches this subject
      const teacher = teacherRecords.find(t => 
        t.subjects.includes(mark.subjectCode)
      )
      
      if (teacher) {
        await prisma.mark.upsert({
          where: {
            studentId_subjectId_term_academicYear: {
              studentId: student.id,
              subjectId: subject.id,
              term: mark.term,
              academicYear: '2024-2025'
            }
          },
          update: {},
          create: {
            studentId: student.id,
            subjectId: subject.id,
            term: mark.term,
            marks: mark.marks,
            grade: mark.marks >= 90 ? 'A+' : mark.marks >= 80 ? 'A' : mark.marks >= 70 ? 'B' : mark.marks >= 60 ? 'C' : mark.marks >= 40 ? 'D' : 'F',
            academicYear: '2024-2025',
            enteredById: teacher.id
          }
        })
      }
    }
  }

  console.log('Created sample marks')

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
