/**
 * Helper functions for working with the new AcademicRecord bucket pattern
 */

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

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
};

/**
 * Get or create an AcademicRecord bucket for a student in a specific year
 */
export async function getOrCreateAcademicRecordBucket(
  studentId: string,
  academicYear: string,
  classValue: string
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
  const bucket = await getOrCreateAcademicRecordBucket(studentId, academicYear, classValue);

  // Check if term already exists
  const existingTermIndex = (bucket.terms as TermRecord[]).findIndex((t: TermRecord) => t.name === termName);

  const newTermData = {
    name: termName,
    subjects,
    enteredBy,
    enteredAt: new Date(),
    published: false,
  };

  let updatedTerms: TermRecord[];
  if (existingTermIndex >= 0) {
    // Update existing term
    updatedTerms = [...(bucket.terms as TermRecord[])];
    updatedTerms[existingTermIndex] = newTermData;
  } else {
    // Add new term
    updatedTerms = [...(bucket.terms as TermRecord[]), newTermData];
  }

  // Update the bucket
  const updated = await prisma.academicRecord.update({
    where: { id: bucket.id },
    data: {
      terms: updatedTerms,
      class: classValue, // Update class in case student was promoted
    },
  });

  return updated;
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

  // Update each record
  const updates = records.map(async (record) => {
    const termIndex = (record.terms as TermRecord[]).findIndex((t: TermRecord) => t.name === termName);
    if (termIndex < 0) return null;

    const updatedTerms = [...(record.terms as TermRecord[])];
    updatedTerms[termIndex] = {
      ...updatedTerms[termIndex],
      published: true,
    };

    return prisma.academicRecord.update({
      where: { id: record.id },
      data: { terms: updatedTerms },
    });
  });

  return await Promise.all(updates.filter(Boolean));
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
          class: classValue,
        },
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
