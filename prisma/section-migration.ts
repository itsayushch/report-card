import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function dropLegacyIndex(collection: string, index: string) {
  try {
    await prisma.$runCommandRaw({
      dropIndexes: collection,
      index,
    })
    console.log(`  Dropped legacy index ${collection}.${index}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('index not found') || message.includes('IndexNotFound')) {
      return
    }
    console.warn(`  Could not drop ${collection}.${index}: ${message}`)
  }
}

async function ensureSection(className: string, sectionName?: string | null) {
  const name = sectionName?.trim()
  if (!name) return false

  const existing = await prisma.classSection.findFirst({
    where: {
      class: className,
      name,
    },
  })

  if (existing) return false

  await prisma.classSection.create({
    data: {
      class: className,
      name,
      isActive: true,
      sortOrder: 0,
    },
  })

  return true
}

async function main() {
  await dropLegacyIndex('class_teachers', 'class_1')
  await dropLegacyIndex('report_publish', 'class_1_term_1_academicYear_1')

  const [students, academicRecords, classTeachers] = await Promise.all([
    prisma.student.findMany({
      select: { class: true, section: true },
    }),
    prisma.academicRecord.findMany({
      select: { class: true, section: true },
    }),
    prisma.classTeacher.findMany({
      select: { class: true, section: true },
    }),
  ])

  let createdSections = 0

  for (const item of [...students, ...academicRecords, ...classTeachers]) {
    if (await ensureSection(item.class, item.section)) {
      createdSections += 1
    }
  }

  const unsectionedStudents = students.filter((student) => !student.section).length
  const classWideAssignments = classTeachers.filter((assignment) => !assignment.section).length

  console.log('Section migration summary:')
  console.log('  Sections created from existing data:', createdSections)
  console.log('  Existing unsectioned students left unchanged:', unsectionedStudents)
  console.log('  Existing class-wide teacher assignments left unchanged:', classWideAssignments)
}

main()
  .catch((error) => {
    console.error('Section migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
