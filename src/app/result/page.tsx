'use client';
import { Printer } from 'lucide-react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ReportData {
  student: {
    name: string;
    rollNo: string;
    class: string;
    section: string;
  };
  academicYear: string;
  term: string;
  marks: Array<{
    subject: string;
    maxMarks: number;
    obtainedMarks: number;
    grade: string;
    remarks?: string;
  }>;
  summary: {
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    grade: string;
    result: string;
  };
  promotionStatus?: string;
  isPublished: boolean;
}

interface PrintableReportCardProps {
  params: { id: string };
}

function PrintableReportCardContent({ params }: PrintableReportCardProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const term = searchParams.get('term') || 'Final';
        const academicYear = searchParams.get('year') || '2025';
        
        const response = await fetch(`/api/reports/student/${params.id}?term=${term}&academicYear=${academicYear}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch report');
        }
        
        const reportData = await response.json();
        setData(reportData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [params.id, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading report card...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Error</h2>
          <p className="text-slate-600">{error || 'Report not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: A4 portrait;
          }
          body {
            margin: 0;
            padding: 0;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .report-container {
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Action Buttons */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2 text-sm font-semibold"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>

      {/* Report Card Container */}
      <div className="min-h-screen bg-slate-100 py-4 sm:py-8 px-2 sm:px-4 print:bg-white print:p-0">
        <div className="report-container max-w-4xl mx-auto bg-white shadow-xl print:shadow-none border-4 border-double border-slate-800">
          
          {/* Header Section */}
          <div className="bg-slate-800 text-white py-6 sm:py-8 px-4 sm:px-6 border-b-4 border-double border-slate-900">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center tracking-wide">
              ST. HELEN&apos;S SCHOOL
            </h1>
            <p className="text-center text-slate-300 text-xs sm:text-sm mt-2 tracking-wider">
              P.O. NORTH POINT, DARJEELING - 734104
            </p>
          </div>

          {/* Title Section */}
          <div className="bg-slate-700 text-white py-4 px-4 sm:px-6 border-b-4 border-double border-slate-800">
            <h2 className="text-lg sm:text-xl font-bold text-center tracking-widest">
              ACADEMIC REPORT CARD
            </h2>
            <p className="text-center text-slate-200 text-xs sm:text-sm mt-1">
              {data.term} - Academic Year {data.academicYear}
            </p>
          </div>

          {/* Student Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 sm:p-6 bg-slate-50 border-b-4 border-double border-slate-300">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-bold text-slate-700 text-xs sm:text-sm min-w-[100px]">Student Name:</span>
                <span className="text-slate-900 font-semibold text-sm sm:text-base">{data.student.name}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-bold text-slate-700 text-xs sm:text-sm min-w-[100px]">Roll Number:</span>
                <span className="text-slate-900 font-semibold text-sm sm:text-base">{data.student.rollNo}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-bold text-slate-700 text-xs sm:text-sm min-w-20">Class:</span>
                <span className="text-slate-900 font-semibold text-sm sm:text-base">{data.student.class} - {data.student.section}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-bold text-slate-700 text-xs sm:text-sm min-w-20">Session:</span>
                <span className="text-slate-900 font-semibold text-sm sm:text-base">{data.academicYear}</span>
              </div>
            </div>
          </div>

          {/* Marks Table */}
          <div className="p-3 sm:p-6">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full border-4 border-double border-slate-800 min-w-[640px]">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="border-2 border-slate-700 px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-bold">
                      SUBJECT
                    </th>
                    <th className="border-2 border-slate-700 px-2 sm:px-3 py-2 sm:py-3 text-center text-xs sm:text-sm font-bold w-24 sm:w-32">
                      MAX MARKS
                    </th>
                    <th className="border-2 border-slate-700 px-2 sm:px-3 py-2 sm:py-3 text-center text-xs sm:text-sm font-bold w-24 sm:w-32">
                      MARKS OBTAINED
                    </th>
                    <th className="border-2 border-slate-700 px-2 sm:px-3 py-2 sm:py-3 text-center text-xs sm:text-sm font-bold w-16 sm:w-20">
                      GRADE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.marks.map((mark, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border-2 border-slate-300 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-800">
                        {mark.subject}
                      </td>
                      <td className="border-2 border-slate-300 px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-800">
                        {mark.maxMarks}
                      </td>
                      <td className="border-2 border-slate-300 px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-bold text-slate-900">
                        {mark.obtainedMarks}
                      </td>
                      <td className="border-2 border-slate-300 px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-bold text-slate-900">
                        {mark.grade}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr className="bg-slate-700 text-white font-bold">
                    <td colSpan={2} className="border-2 border-slate-600 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                      TOTAL
                    </td>
                    <td className="border-2 border-slate-600 px-2 sm:px-3 py-2 sm:py-3 text-center text-xs sm:text-sm">
                      {data.summary.totalMarks}
                    </td>
                    <td className="border-2 border-slate-600 px-2 sm:px-3 py-2 sm:py-3 text-center text-sm sm:text-base">
                      {data.summary.obtainedMarks}
                    </td>
                    <td className="border-2 border-slate-600 px-2 sm:px-3 py-2 sm:py-3 text-center text-xs sm:text-sm">
                      {data.summary.grade}
                    </td>
                  </tr>
                  
                  {/* Percentage Row */}
                  <tr className="bg-slate-800 text-white font-bold">
                    <td colSpan={3} className="border-2 border-slate-700 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                      OVERALL PERCENTAGE
                    </td>
                    <td colSpan={2} className="border-2 border-slate-700 px-2 sm:px-3 py-2 sm:py-3 text-center text-base sm:text-lg">
                      {data.summary.percentage.toFixed(2)}%
                    </td>
                  </tr>
                  
                  {/* Result Row */}
                  <tr className="bg-slate-600 text-white font-bold">
                    <td colSpan={3} className="border-2 border-slate-500 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                      RESULT
                    </td>
                    <td colSpan={2} className="border-2 border-slate-500 px-2 sm:px-3 py-2 sm:py-3 text-center text-sm sm:text-base uppercase">
                      {data.summary.result}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Grading System */}
          <div className="p-3 sm:p-6 bg-slate-50 border-t-4 border-double border-slate-300">
            <h3 className="font-bold text-slate-800 mb-3 text-sm sm:text-base">GRADING SYSTEM</h3>
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full border-2 border-double border-slate-600 text-xs sm:text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="border border-slate-600 px-2 sm:px-4 py-1 sm:py-2 font-bold">Grade</th>
                    <th className="border border-slate-600 px-2 sm:px-4 py-1 sm:py-2 font-bold">Percentage</th>
                    <th className="border border-slate-600 px-2 sm:px-4 py-1 sm:py-2 font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  <tr className="bg-white">
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center font-semibold">A+</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center">90% - 100%</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2">Outstanding</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center font-semibold">A</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center">80% - 89%</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2">Excellent</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center font-semibold">B+</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center">70% - 79%</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2">Very Good</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center font-semibold">B</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center">60% - 69%</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2">Good</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center font-semibold">C</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center">50% - 59%</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2">Satisfactory</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center font-semibold">D</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center">40% - 49%</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2">Pass</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center font-semibold">F</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2 text-center">Below 40%</td>
                    <td className="border border-slate-400 px-2 sm:px-4 py-1 sm:py-2">Fail</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Note */}
          <div className="py-3 px-4 sm:px-6 bg-white border-t-4 border-double border-slate-300">
            <p className="text-center text-red-700 font-semibold text-xs sm:text-sm">
              * This is a computer-generated document and does not require a signature.
            </p>
          </div>

          {/* Footer */}
          <div className="bg-slate-800 text-white py-3 sm:py-4 px-4 sm:px-6 text-center border-t-4 border-double border-slate-900">
            <p className="font-semibold text-xs sm:text-sm mb-1">
              St. Helen&apos;s School, P.O. North Point, Darjeeling - 734104
            </p>
            <p className="text-slate-300 text-xs">
              Affiliated to Council for the Indian School Certificate Examination (Code: WB071)
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PrintableReportCard({ params }: PrintableReportCardProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PrintableReportCardContent params={params} />
    </Suspense>
  );
}
