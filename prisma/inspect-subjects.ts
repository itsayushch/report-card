import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function countAcademicRecordSubjects() {
  const records = await prisma.academicRecord.findMany({
    select: {
      id: true,
      terms: true,
    },
  })

  let totalTerms = 0
  let totalSubjects = 0
  const subjectCounts = new Map<string, number>()

  for (const record of records) {
    const terms = (record.terms as Array<any>) || []
    totalTerms += terms.length

    for (const term of terms) {
      const subjects = (term?.subjects as Array<any>) || []
      totalSubjects += subjects.length

      for (const subject of subjects) {
        const code = subject?.subjectCode ?? 'UNKNOWN'
        subjectCounts.set(code, (subjectCounts.get(code) ?? 0) + 1)
      }
    }
  }

  return { records: records.length, totalTerms, totalSubjects, subjectCounts }
}

async function countTeacherPairs() {
  const teachers = await prisma.teacher.findMany({
    select: { id: true, email: true, classSubjectPairs: true },
  })

  const subjectCounts = new Map<string, number>()
  const totals = teachers.map((teacher) => ({
    id: teacher.id,
    email: teacher.email,
    pairs: (teacher.classSubjectPairs as Array<any>)?.length ?? 0,
  }))

  for (const teacher of teachers) {
    const pairs = (teacher.classSubjectPairs as Array<any>) || []
    for (const pair of pairs) {
      const subject = pair?.subject ?? 'UNKNOWN'
      subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1)
    }
  }

  const totalPairs = totals.reduce((sum, item) => sum + item.pairs, 0)

  return { teachers: totals.length, totalPairs, perTeacher: totals, subjectCounts }
}

function toSortedArray(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([subject, count]) => ({ subject, count }))
}

async function main() {
  const recordsSummary = await countAcademicRecordSubjects()
  const teacherSummary = await countTeacherPairs()

  console.log('Academic records summary:')
  console.log('  Records:', recordsSummary.records)
  console.log('  Terms:', recordsSummary.totalTerms)
  console.log('  Subject marks:', recordsSummary.totalSubjects)
  console.log('Teacher subject pairs summary:')
  console.log('  Teachers:', teacherSummary.teachers)
  console.log('  Total pairs:', teacherSummary.totalPairs)
  console.table(teacherSummary.perTeacher)

  console.log('Academic record subject counts:')
  console.table(toSortedArray(recordsSummary.subjectCounts))

  console.log('Teacher subject pair counts:')
  console.table(toSortedArray(teacherSummary.subjectCounts))
}

main()
  .catch((error) => {
    console.error('Inspection failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
