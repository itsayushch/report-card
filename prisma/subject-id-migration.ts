import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DRY_RUN = false

const SUBJECT_ID_MAP: Record<string, string> = {
  // Default mappings for existing generic subjects
  "2ND-LANG-1": "2ND-LANG-HIN-1",
  "2ND-LANG-2": "2ND-LANG-HIN-2",
  "2ND-LANG-3": "2ND-LANG-HIN-3",
  "2ND-LANG-4": "2ND-LANG-HIN-4",
  "2ND-LANG-5": "2ND-LANG-HIN-5",
  "2ND-LANG-6": "2ND-LANG-HIN-6",
  "2ND-LANG-7": "2ND-LANG-HIN-7",
  "2ND-LANG-8": "2ND-LANG-HIN-8",
  "2ND-LANG-9": "2ND-LANG-HIN-9",
  "2ND-LANG-10": "2ND-LANG-HIN-10",
  "3RD-LANG-1": "3RD-LANG-NEP-1",
  "3RD-LANG-5": "3RD-LANG-NEP-5",
  "3RD-LANG-6": "3RD-LANG-NEP-6",
  "3RD-LANG-7": "3RD-LANG-NEP-7",
  "3RD-LANG-8": "3RD-LANG-NEP-8",
  "6TH-SUB-9": "6TH-SUB-COMP-9",
  "6TH-SUB-10": "6TH-SUB-COMP-10",
}

function mapSubjectId(subjectId: string): string {
  return SUBJECT_ID_MAP[subjectId] ?? subjectId
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function updateWithRetry<T>(
  action: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action()
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        await delay(200 * attempt)
        continue
      }
    }
  }

  throw lastError
}

function dedupeClassSubjectPairs(
  pairs: Array<{ subject: string; classAssigned: string }>
): Array<{ subject: string; classAssigned: string }> {
  const seen = new Set<string>()
  const deduped: Array<{ subject: string; classAssigned: string }> = []

  for (const pair of pairs) {
    const key = `${pair.classAssigned}::${pair.subject}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(pair)
  }

  return deduped
}

async function migrateAcademicRecords() {
  const records = await prisma.academicRecord.findMany()
  let updatedRecords = 0
  let updatedSubjects = 0

  for (const record of records) {
    const terms = (record.terms as Array<any>) || []
    let recordChanged = false

    const updatedTerms = terms.map((term) => {
      if (!term?.subjects || !Array.isArray(term.subjects)) {
        return term
      }

      const updatedTermSubjects = term.subjects.map((subject: any) => {
        const currentCode = subject.subjectCode
        const nextCode = mapSubjectId(currentCode)

        if (nextCode !== currentCode) {
          recordChanged = true
          updatedSubjects += 1
        }

        return {
          ...subject,
          subjectCode: nextCode,
        }
      })

      return {
        ...term,
        subjects: updatedTermSubjects,
      }
    })

    if (!recordChanged) continue

    updatedRecords += 1

    if (!DRY_RUN) {
      await updateWithRetry(() =>
        prisma.academicRecord.update({
          where: { id: record.id },
          data: { terms: updatedTerms },
        })
      )
    }
  }

  return { updatedRecords, updatedSubjects }
}

async function migrateTeachers() {
  const teachers = await prisma.teacher.findMany()
  let updatedTeachers = 0
  let updatedPairs = 0

  for (const teacher of teachers) {
    const pairs = (teacher.classSubjectPairs as Array<any>) || []
    let teacherChanged = false

    const updatedPairsList = pairs.map((pair) => {
      const currentSubject = pair.subject
      const nextSubject = mapSubjectId(currentSubject)

      if (nextSubject !== currentSubject) {
        teacherChanged = true
        updatedPairs += 1
      }

      return {
        ...pair,
        subject: nextSubject,
      }
    })

    if (!teacherChanged) continue

    const dedupedPairs = dedupeClassSubjectPairs(updatedPairsList)
    updatedTeachers += 1

    if (!DRY_RUN) {
      await updateWithRetry(() =>
        prisma.teacher.update({
          where: { id: teacher.id },
          data: { classSubjectPairs: dedupedPairs },
        })
      )
    }
  }

  return { updatedTeachers, updatedPairs }
}

async function main() {
  const recordSummary = await migrateAcademicRecords()
  const teacherSummary = await migrateTeachers()

  console.log('Subject ID migration summary:')
  console.log('  Academic records updated:', recordSummary.updatedRecords)
  console.log('  Subject marks updated:', recordSummary.updatedSubjects)
  console.log('  Teachers updated:', teacherSummary.updatedTeachers)
  console.log('  Class-subject pairs updated:', teacherSummary.updatedPairs)
  console.log('  Dry run:', DRY_RUN)
}

main()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
