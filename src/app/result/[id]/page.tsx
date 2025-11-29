'use client';
import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';

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
    subjectCode: string;
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

export default function PrintableReportCard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const studentId = params.id as string;
        const term = searchParams.get('term') || 'Final';
        const academicYear = searchParams.get('year') || '2024-2025';
        
        const response = await fetch(`/api/reports/student/${studentId}?term=${term}&academicYear=${academicYear}`);
        
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

    if (params.id) {
      fetchReport();
    }
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

  // Calculate CGPA (assuming 10-point scale)
  const cgpa = data.summary.percentage / 10;

  // Calculate total marks from marks array
  const totalMaxMarks = data.marks.reduce((sum, mark) => sum + mark.maxMarks, 0);
  const totalObtainedMarks = data.marks.reduce((sum, mark) => sum + mark.obtainedMarks, 0);

  // Convert letter grades to ICSE numeric grades (1-9 scale)
  const convertToICSEGrade = (letterGrade: string): string => {
    const gradeMap: { [key: string]: string } = {
      'A+': '1',
      'A': '2',
      'B+': '3',
      'B': '4',
      'C+': '5',
      'C': '6',
      'D': '7',
      'E': '8',
      'F': '9'
    };
    return gradeMap[letterGrade] || letterGrade;
  };

  return (
    <>
      <style jsx global>{`
        * {
          -webkit-text-size-adjust: 100%;
          -moz-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }
        
        .watermark {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        
        .watermark-text {
          font-size: 2.5rem;
          font-weight: bold;
          color: rgba(59, 130, 246, 0.08);
          transform: rotate(-45deg);
          white-space: nowrap;
          margin: 2rem;
          user-select: none;
        }
        
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0.5cm;
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
            border: none !important;
          }
          .watermark-text {
            color: rgba(59, 130, 246, 0.08) !important;
          }
        }
      `}</style>

      {/* Action Buttons */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2 font-semibold"
        >
          <Printer className="w-5 h-5" />
          Print Report
        </button>
      </div>

      {/* Report Card Container */}
      <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:p-0" style={{ minWidth: '800px' }}>
        <div className="report-container max-w-3xl mx-auto bg-white print:shadow-none" style={{ width: '100%', maxWidth: '800px' }}>
          {/* Main Border Container */}
          <div className="border-[5px] border-double border-blue-800 m-4 print:m-2 min-h-[calc(100vh-4rem)] print:min-h-[calc(100vh-1rem)] flex flex-col relative">
            
            {/* Watermark */}
            <div className="watermark">
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
            </div>

            {/* School Logo/Crest */}
            <div className="flex justify-center pt-6 pb-2 relative z-10">
              <img 
                src="https://www.schooldekho.org/storage/logo//epdo17blks0ss4sgcokg8kwsg448cco.png" 
                alt="St. Helen's School Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>

            {/* School Name Header */}
            <div className="text-center px-6 pb-3">
              <h1 className="text-red-700 text-2xl font-bold tracking-wide">
                ST. HELEN&apos;S SECONDARY SCHOOL
              </h1>
              <h2 className="text-red-700 text-xl font-bold tracking-wider">
                KURSEONG
              </h2>
            </div>

            {/* Title Section */}
            <div className="text-center pb-2">
              <h3 className="text-blue-800 text-lg font-bold tracking-wide">
                STATEMENT OF MARKS
              </h3>
              <p className="text-blue-700 text-sm font-semibold mt-1">
                {data.term.toUpperCase()}
              </p>
            </div>

            {/* Horizontal Line */}
            <div className="border-t-2 border-blue-800 mx-6 my-3 relative z-10"></div>

            {/* Student Information - Compact Two Column Layout */}
            <div className="px-6 pb-6 relative z-10">
              <div className="border-2 border-blue-800">
                <div className="grid grid-cols-2">
                  <div className="flex border-r border-b border-blue-800 px-3 py-2">
                    <span className="font-bold text-gray-900 min-w-[120px]">NAME:</span>
                    <span className="text-gray-900 uppercase font-semibold">{data.student.name}</span>
                  </div>
                  <div className="flex border-b border-blue-800 px-3 py-2">
                    <span className="font-bold text-gray-900 min-w-[180px]">ENROLLMENT NO:</span>
                    <span className="text-gray-900 font-semibold">{data.student.rollNo}</span>
                  </div>
                  <div className="flex border-r border-blue-800 px-3 py-2">
                    <span className="font-bold text-gray-900 min-w-[120px]">CLASS:</span>
                    <span className="text-gray-900 font-semibold">{data.student.class}{data.student.section}</span>
                  </div>
                  <div className="flex px-3 py-2">
                    <span className="font-bold text-gray-900 min-w-[180px]">ACADEMIC YEAR:</span>
                    <span className="text-gray-900 font-semibold">{data.academicYear.split('-')[0]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Marks Table */}
            <div className="px-6 pb-6 relative z-10">
              <table className="w-full border-2 border-blue-800">
                <thead>
                  <tr className="bg-white border-b-2 border-blue-800">
                    <th className="border-r border-blue-800 px-3 py-2 text-center text-sm font-bold text-gray-900">
                      SUBJECTS
                    </th>
                    <th colSpan={2} className="border-r border-blue-800 px-3 py-2 text-center text-sm font-bold text-gray-900">
                      MARKS OBTAINED
                    </th>
                    <th className="border-r border-blue-800 px-3 py-2 text-center text-sm font-bold text-gray-900 w-28">
                      OVERALL<br/>PERCENTAGE
                    </th>
                    <th className="px-3 py-2 text-center text-sm font-bold text-gray-900 w-24">
                      OVERALL<br/>GRADE
                    </th>
                  </tr>
                  <tr className="bg-white border-b border-blue-800">
                    <th className="border-r border-blue-800 px-3 py-1 text-center text-xs font-semibold text-gray-700"></th>
                    <th className="border-r border-blue-800 px-3 py-1 text-center text-xs font-semibold text-gray-700">
                      TERM 1
                    </th>
                    <th className="border-r border-blue-800 px-3 py-1 text-center text-xs font-semibold text-gray-700">
                      TERM 2
                    </th>
                    <th className="border-r border-blue-800 px-3 py-1 text-center text-xs font-semibold text-gray-700"></th>
                    <th className="px-3 py-1 text-center text-xs font-semibold text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.marks.map((mark, index) => (
                    <tr key={index} className="border-b border-blue-800">
                      <td className="border-r border-blue-800 px-3 py-2 text-sm text-gray-900">
                        {mark.subject}
                        <br/>
                        <span className="text-xs text-gray-600">{mark.subjectCode}</span>
                      </td>
                      <td className="border-r border-blue-800 px-3 py-2 text-center text-base font-bold text-gray-900">
                        {mark.obtainedMarks}
                      </td>
                      <td className="border-r border-blue-800 px-3 py-2 text-center text-sm text-gray-700">
                        -
                      </td>
                      <td className="border-r border-blue-800 px-3 py-2 text-center text-base font-bold text-gray-900">
                        {mark.obtainedMarks}
                      </td>
                      <td className="px-3 py-2 text-center text-base font-bold text-gray-900">
                        {convertToICSEGrade(mark.grade)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr className="border-b-2 border-blue-800 bg-gray-50">
                    <td className="border-r border-blue-800 px-3 py-2 text-sm font-bold text-gray-900">
                      TOTAL
                    </td>
                    <td className="border-r border-blue-800 px-3 py-2 text-center text-base font-bold text-gray-900">
                      {totalObtainedMarks} / {totalMaxMarks}
                    </td>
                    <td className="border-r border-blue-800 px-3 py-2 text-center text-sm text-gray-700">
                      -
                    </td>
                    <td className="border-r border-blue-800 px-3 py-2 text-center text-base font-bold text-gray-900">
                      {totalObtainedMarks} / {totalMaxMarks}
                    </td>
                    <td className="px-3 py-2 text-center text-sm text-gray-700">
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            <div className="px-6 pb-6 relative z-10">
              <table className="w-full border-2 border-blue-800">
                <tbody>
                  <tr className="border-b border-blue-800">
                    <td className="px-4 py-2 text-sm font-bold text-gray-900 bg-gray-50">PERCENTAGE</td>
                    <td className="px-4 py-2 text-center text-lg font-bold text-blue-800">
                      {data.summary.percentage.toFixed(2)} %
                    </td>
                  </tr>
                  <tr className="border-b border-blue-800">
                    <td className="px-4 py-2 text-sm font-bold text-gray-900 bg-gray-50">CGPA</td>
                    <td className="px-4 py-2 text-center text-lg font-bold text-blue-800">
                      {cgpa.toFixed(2)} / 10
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm font-bold text-gray-900 bg-gray-50">RESULT</td>
                    <td className="px-4 py-2 text-center text-lg font-bold text-green-700 uppercase">
                      {data.summary.result}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Footer Note */}
            <div className="px-6 pb-4 text-center mt-auto relative z-10">
              <p className="text-red-600 text-xs italic">
                * This is a Computer Generated Document and does not require a signature.
              </p>
            </div>

            {/* Horizontal Line */}
            <div className="border-t-2 border-blue-800 mx-6 my-4 relative z-10"></div>



            {/* School Footer */}
            <div className="px-6 pb-6 text-center relative z-10">
              <p className="text-sm font-semibold text-gray-900">
                St. Helen's Secondary School, Kurseong - 734203, Dist. Darjeeling, West Bengal, India.
              </p>
              <p className="text-xs text-gray-700 mt-1">
                Convent: 0354 - 2344379 | School: 0354 - 2344358 | Mobile: 8116848298
              </p>
              <p className="text-xs text-gray-700">
                Email: fcsthelens1@gmail.com
              </p>
            </div>
          </div>

          {/* PAGE 2 - Grading System */}
          <div className="border-[5px] border-double border-blue-800 m-4 print:m-2 print:page-break-before-always mt-8 print:mt-0 min-h-[calc(100vh-4rem)] print:min-h-[calc(100vh-1rem)] flex flex-col relative">
            
            {/* Watermark */}
            <div className="watermark">
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
              <div className="watermark-text">ST. HELEN&apos;S SCHOOL</div>
              <div className="watermark-text">KURSEONG</div>
            </div>

            {/* School Logo/Crest */}
            <div className="flex justify-center pt-6 pb-2 relative z-10">
              <img 
                src="https://www.schooldekho.org/storage/logo//epdo17blks0ss4sgcokg8kwsg448cco.png" 
                alt="St. Helen's School Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>

            {/* School Name Header */}
            <div className="text-center px-6 pb-3 relative z-10">
              <h1 className="text-red-700 text-2xl font-bold tracking-wide">
                ST. HELEN&apos;S SECONDARY SCHOOL
              </h1>
              <h2 className="text-red-700 text-xl font-bold tracking-wider">
                KURSEONG
              </h2>
            </div>

            {/* Title Section */}
            <div className="text-center pb-2 relative z-10">
              <h3 className="text-blue-800 text-lg font-bold tracking-wide">
                GRADING SYSTEM
              </h3>
              <p className="text-blue-700 text-sm font-semibold mt-1">
                Academic Year {data.academicYear}
              </p>
            </div>

            {/* Horizontal Line */}
            <div className="border-t-2 border-blue-800 mx-6 my-3 relative z-10"></div>

            {/* Grading Table */}
            <div className="px-6 pb-8 relative z-10">
              <table className="w-full border-2 border-blue-800">
                <thead>
                  <tr className="bg-blue-800 text-white">
                    <th className="border-r border-blue-700 px-4 py-3 text-center text-sm font-bold">
                      GRADE
                    </th>
                    <th className="border-r border-blue-700 px-4 py-3 text-center text-sm font-bold">
                      MARKS RANGE
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold">
                      DESCRIPTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-blue-800 bg-white">
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-lg font-bold text-gray-900">
                      1
                    </td>
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      91 - 100
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Outstanding
                    </td>
                  </tr>
                  <tr className="border-b border-blue-800 bg-gray-50">
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-lg font-bold text-gray-900">
                      2
                    </td>
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      81 - 90
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Excellent
                    </td>
                  </tr>
                  <tr className="border-b border-blue-800 bg-white">
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-lg font-bold text-gray-900">
                      3
                    </td>
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      71 - 80
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Very Good
                    </td>
                  </tr>
                  <tr className="border-b border-blue-800 bg-gray-50">
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-lg font-bold text-gray-900">
                      4
                    </td>
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      61 - 70
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Good
                    </td>
                  </tr>
                  <tr className="border-b border-blue-800 bg-white">
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-lg font-bold text-gray-900">
                      5
                    </td>
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      51 - 60
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Above Average
                    </td>
                  </tr>
                  <tr className="border-b border-blue-800 bg-gray-50">
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-lg font-bold text-gray-900">
                      6
                    </td>
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      41 - 50
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Average
                    </td>
                  </tr>
                  <tr className="border-b border-blue-800 bg-white">
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-lg font-bold text-gray-900">
                      7
                    </td>
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      33 - 40
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Below Average
                    </td>
                  </tr>
                  <tr className="border-b border-blue-800 bg-gray-50">
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-lg font-bold text-gray-900">
                      8
                    </td>
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      21 - 32
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Marginal
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-lg font-bold text-gray-900">
                      9
                    </td>
                    <td className="border-r border-blue-800 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Below 21
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Needs Improvement
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Important Notes */}
            <div className="px-6 pb-6 relative z-10">
              <h4 className="text-blue-800 font-bold text-sm mb-3">IMPORTANT NOTES:</h4>
              <ul className="space-y-2 text-xs text-gray-700">
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>The above grading system is based on the ICSE (Indian Certificate of Secondary Education) pattern.</span>
                </li>
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>Grades are awarded based on the percentage of marks obtained in each subject.</span>
                </li>
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>A student must obtain at least Grade 7 (40% marks) to pass in a subject.</span>
                </li>
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>CGPA (Cumulative Grade Point Average) is calculated on a 10-point scale.</span>
                </li>
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>This report card is valid only when all subjects are passed.</span>
                </li>
              </ul>
            </div>


            {/* Horizontal Line */}
            <div className="border-t-2 border-blue-800 mx-6 my-4"></div>


            {/* School Footer */}
            <div className="px-6 pb-6 text-center relative z-10">
              <p className="text-sm font-semibold text-gray-900">
                St. Helen's Secondary School, Kurseong - 734203, Dist. Darjeeling, West Bengal, India.
              </p>
              <p className="text-xs text-gray-700 mt-1">
                Convent: 0354 - 2344379 | School: 0354 - 2344358 | Mobile: 8116848298
              </p>
              <p className="text-xs text-gray-700">
                Email: fcsthelens1@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
