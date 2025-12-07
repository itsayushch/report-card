// Grade and result calculation utilities

export function calculateGrade(marks: number): string {
  if (marks >= 90) return 'A+';
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B+';
  if (marks >= 60) return 'B';
  if (marks >= 50) return 'C';
  if (marks >= 45) return 'D';
  return 'F';
}

interface Mark {
  marks: number;
  subjectId: string;
}

interface Subject {
  id: string;
  maxMarks: number;
  passingMarks: number;
}

export interface ResultSummary {
  totalObtained: number;
  totalMax: number;
  percentage: number;
  gpa: number;
  result: 'PASS' | 'FAIL';
  failedSubjects: string[];
}

export function calculateResult(
  marks: Mark[],
  subjects: Subject[]
): ResultSummary {
  let totalObtained = 0;
  let totalMax = 0;
  const failedSubjects: string[] = [];

  marks.forEach((mark) => {
    const subject = subjects.find((s) => s.id === mark.subjectId);
    if (!subject) return;

    totalObtained += mark.marks;
    totalMax += subject.maxMarks;

    if (mark.marks < subject.passingMarks) {
      failedSubjects.push(subject.id);
    }
  });

  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const gpa = percentage / 10;

  return {
    totalObtained,
    totalMax,
    percentage: Math.round(percentage * 100) / 100,
    gpa: Math.round(gpa * 100) / 100,
    result: failedSubjects.length > 0 ? 'FAIL' : 'PASS',
    failedSubjects,
  };
}

export function getNextClass(currentClass: string): string {
  const currentGrade = parseInt(currentClass);
  if (isNaN(currentGrade)) return currentClass;

  const nextGrade = currentGrade + 1;

  if (nextGrade > 12) {
    return 'GRADUATED';
  }

  return nextGrade.toString();
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
      return 'text-green-700 bg-green-50';
    case 'A':
      return 'text-green-600 bg-green-50';
    case 'B+':
      return 'text-blue-700 bg-blue-50';
    case 'B':
      return 'text-blue-600 bg-blue-50';
    case 'C':
      return 'text-yellow-700 bg-yellow-50';
    case 'D':
      return 'text-orange-700 bg-orange-50';
    case 'F':
      return 'text-red-700 bg-red-50';
    default:
      return 'text-gray-700 bg-gray-50';
  }
}

export function calculatePercentage(totalObtained: number, totalMax: number): number {
  return Math.round((totalObtained / totalMax) * 10000) / 100;
}