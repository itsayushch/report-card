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
      regNo: '2024001',
      password: '2024001',
      class: 'X',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Priya Sharma',
      regNo: '2024002',
      password: '2024002',
      class: 'X',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Amit Patel',
      regNo: '2024003',
      password: '2024003',
      class: 'X',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Sneha Reddy',
      regNo: '2024004',
      password: '2024004',
      class: 'X',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Vikram Singh',
      regNo: '2024005',
      password: '2024005',
      class: 'X',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Ananya Gupta',
      regNo: '2024006',
      password: '2024006',
      class: 'X',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Rahul Verma',
      regNo: '2024007',
      password: '2024007',
      class: 'IX',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Kavya Iyer',
      regNo: '2024008',
      password: '2024008',
      class: 'IX',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Arjun Rao',
      regNo: '2024009',
      password: '2024009',
      class: 'IX',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    },
    {
      name: 'Divya Nair',
      regNo: '2024010',
      password: '2024010',
      class: 'IX',
      academicYear: '2025',
      status: Status.ACTIVE,
      promotionStatus: PromotionStatus.PENDING
    }
  ]

  for (const student of students) {
    await prisma.student.upsert({
      where: { regNo: student.regNo },
      update: {},
      // @ts-expect-error 
      create: {
        ...student,
        status: Status.ACTIVE,
        promotionStatus: PromotionStatus.PENDING
      }
    })
  }

  console.log('Created sample students')

  // Marks are now embedded in Student.academicRecords
  console.log('✓ Skipping marks seeding - marks are now embedded in Student.academicRecords')

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
  console.log('\nSTUDENTS (Login with Registration Number only - no password required):')
  console.log(`  2024001 (Raj Kumar - Class X)`)
  console.log(`  2024002 (Priya Sharma - Class X)`)
  console.log(`  2024003 (Amit Patel - Class X)`)
  console.log(`  2024004 (Sneha Reddy - Class X)`)
  console.log(`  2024005 (Vikram Singh - Class X)`)
  console.log(`  2024006 (Ananya Gupta - Class X)`)
  console.log(`  2024007 (Rahul Verma - Class IX)`)
  console.log(`  2024008 (Kavya Iyer - Class IX)`)
  console.log(`  2024009 (Arjun Rao - Class IX)`)
  console.log(`  2024010 (Divya Nair - Class IX)`)
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
