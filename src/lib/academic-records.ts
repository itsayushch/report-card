/**
 * Helper functions for working with the new AcademicRecord bucket pattern
 */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

type TermRecord = {
  name: string;
  subjects: Array<{
    subjectCode: string;
    marks: number;
    maxMarks: number;
    grade?: string;
  }>;
  enteredBy: string;
  enteredAt: Date;
  published: boolean;
  teacherRemarks?: string | null;
};

/**
 * Get or create an AcademicRecord bucket for a student in a specific year
 */
export async function getOrCreateAcademicRecordBucket(
  studentId: string,
  academicYear: string,
  classValue: string,
  section?: string | null
) {
  let bucket = await prisma.academicRecord.findUnique({
    where: {
      studentId_academicYear: {
        studentId,
        academicYear,
      },
    },
  });

  if (!bucket) {
    bucket = await prisma.academicRecord.create({
      data: {
        studentId,
        academicYear,
        class: classValue,
        section: section || null,
        terms: [],
      },
    });
  }

  return bucket;
}

/**
 * Add or update a term's marks in an academic record bucket
 */
export async function upsertTermMarks(
  studentId: string,
  academicYear: string,
  classValue: string,
  section: string | null | undefined,
  termName: string,
  subjects: Array<{
    subjectCode: string;
    marks: number;
    maxMarks: number;
    grade?: string;
  }>,
  enteredBy: string
) {
  // Get or create the bucket
  const bucket = await getOrCreateAcademicRecordBucket(studentId, academicYear, classValue, section);

  // Check if term already exists
  const existingTermIndex = (bucket.terms as TermRecord[]).findIndex((t: TermRecord) => t.name === termName);

  let updatedTerms: TermRecord[];
  if (existingTermIndex >= 0) {
    // Merge incoming subjects into the existing term (don't wipe other subjects)
    updatedTerms = [...(bucket.terms as TermRecord[])];
    const existingTerm = updatedTerms[existingTermIndex];
    const incomingCodes = new Set(subjects.map(s => s.subjectCode));
    const mergedSubjects = [
      ...existingTerm.subjects.filter(s => !incomingCodes.has(s.subjectCode)),
      ...subjects,
    ];
    updatedTerms[existingTermIndex] = {
      name: existingTerm.name,
      subjects: mergedSubjects,
      enteredBy,
      enteredAt: new Date(),
      published: existingTerm.published, // preserve published status
      teacherRemarks: existingTerm.teacherRemarks, // preserve remarks
    };
  } else {
    // Add new term
    updatedTerms = [...(bucket.terms as TermRecord[]), {
      name: termName,
      subjects,
      enteredBy,
      enteredAt: new Date(),
      published: false,
    }];
  }

  // Update the bucket
  const updated = await prisma.academicRecord.update({
    where: { id: bucket.id },
    data: {
      terms: updatedTerms,
      class: classValue, // Update class in case student was promoted
      section: section || null,
    },
  });

  return updated;
}

/**
 * Remove a specific subject from a term in an academic record bucket.
 * If the term becomes empty, remove the whole term entry.
 */
export async function deleteTermSubjectMarks(
  studentId: string,
  academicYear: string,
  termName: string,
  subjectCode: string
) : Promise<boolean> {
  const bucket = await getStudentYearRecords(studentId, academicYear);

  if (!bucket) {
    return false;
  }

  const terms = bucket.terms as TermRecord[];
  const termIndex = terms.findIndex((term) => term.name === termName);

  if (termIndex < 0) {
    return false;
  }

  const term = terms[termIndex];
  const subjectExists = term.subjects.some((subject) => subject.subjectCode === subjectCode);

  if (!subjectExists) {
    return false;
  }

  const remainingSubjects = term.subjects.filter((subject) => subject.subjectCode !== subjectCode);
  const updatedTerms = [...terms];

  if (remainingSubjects.length === 0) {
    updatedTerms.splice(termIndex, 1);
  } else {
    updatedTerms[termIndex] = {
      ...term,
      subjects: remainingSubjects,
    };
  }

  await prisma.academicRecord.update({
    where: { id: bucket.id },
    data: {
      terms: updatedTerms,
    },
  });

  return true;
}

/**
 * Get academic records for a student for a specific year
 */
export async function getStudentYearRecords(studentId: string, academicYear: string) {
  return await prisma.academicRecord.findUnique({
    where: {
      studentId_academicYear: {
        studentId,
        academicYear,
      },
    },
  });
}

/**
 * Get all academic records for a student across all years
 */
export async function getStudentAllRecords(studentId: string) {
  return await prisma.academicRecord.findMany({
    where: { studentId },
    orderBy: { academicYear: 'desc' },
  });
}

/**
 * Get a specific term's records for a student
 */
export async function getStudentTermRecord(
  studentId: string,
  academicYear: string,
  termName: string
) {
  const bucket = await getStudentYearRecords(studentId, academicYear);
  if (!bucket) return null;

  const term = (bucket.terms as TermRecord[]).find((t: TermRecord) => t.name === termName);
  return term || null;
}

/**
 * Publish a term's marks (change published from false to true)
 */
export async function publishTermMarks(
  studentId: string,
  academicYear: string,
  termName: string
) {
  const bucket = await getStudentYearRecords(studentId, academicYear);
  if (!bucket) {
    throw new Error(`No academic record found for student ${studentId} in year ${academicYear}`);
  }

  const termIndex = (bucket.terms as TermRecord[]).findIndex((t: TermRecord) => t.name === termName);
  if (termIndex < 0) {
    throw new Error(`Term ${termName} not found for student ${studentId}`);
  }

  const updatedTerms = [...(bucket.terms as TermRecord[])];
  updatedTerms[termIndex] = {
    ...updatedTerms[termIndex],
    published: true,
  };

  return await prisma.academicRecord.update({
    where: { id: bucket.id },
    data: { terms: updatedTerms },
  });
}

/**
 * Bulk publish marks for all students in a class for a specific term
 */
export async function bulkPublishClassTermMarks(
  classValue: string,
  academicYear: string,
  termName: string
) {
  // Get all students in the class
  const students = await prisma.student.findMany({
    where: {
      class: classValue,
      academicYear,
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  // Get all academic records for this class/year
  const records = await prisma.academicRecord.findMany({
    where: {
      studentId: { in: students.map(s => s.id) },
      academicYear,
      class: classValue,
    },
  });

  const updates = records.reduce<Prisma.PrismaPromise<any>[]>((acc, record) => {
    const termIndex = (record.terms as TermRecord[]).findIndex((t: TermRecord) => t.name === termName);
    if (termIndex < 0) return acc;

    const updatedTerms = [...(record.terms as TermRecord[])];
    updatedTerms[termIndex] = {
      ...updatedTerms[termIndex],
      published: true,
    };

    acc.push(
      prisma.academicRecord.update({
        where: { id: record.id },
        data: { terms: updatedTerms },
      })
    );

    return acc;
  }, []);

  if (updates.length === 0) {
    return [];
  }

  return await prisma.$transaction(updates);
}

/**
 * Get marks for all students in a class for a specific subject and term
 */
export async function getClassSubjectMarks(
  classValue: string,
  academicYear: string,
  termName: string,
  subjectCode: string
) {
  // Get all students in the class
  const students = await prisma.student.findMany({
    where: {
      class: classValue,
      academicYear,
      status: 'ACTIVE',
    },
    include: {
      academicRecords: {
        where: {
          academicYear,
          // class: classValue, // Sometimes class in record might differ if student promoted mid-year, but usually same
        },
        take: 1, // There should only be one record per year
      },
    },
  });

  // Extract marks for the specific term and subject
  return students.map(student => {
    const record = student.academicRecords[0]; // Should only be one per year
    if (!record) return null;

    const term = (record.terms as TermRecord[]).find((t: TermRecord) => t.name === termName);
    if (!term) return null;

    const subjectData = term.subjects.find((s) => s.subjectCode === subjectCode);
    if (!subjectData) return null;

    return {
      studentId: student.id,
      studentName: student.name,
      studentRegNo: student.regNo,
      subjectCode,
      marks: subjectData.marks,
      maxMarks: subjectData.maxMarks,
      grade: subjectData.grade || undefined,
    };
  }).filter(Boolean);
}

/**
 * Check if a student has any academic records (for deletion safety)
 */
export async function studentHasAnyRecords(studentId: string): Promise<boolean> {
  const count = await prisma.academicRecord.count({
    where: { studentId },
  });
  return count > 0;
}

/**
 * Delete all academic records for a student (use with caution!)
 */
export async function deleteStudentRecords(studentId: string) {
  return await prisma.academicRecord.deleteMany({
    where: { studentId },
  });
}
