"use client";
import { Printer } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { formatClass } from "@/lib/class-utils";
import { getSubjectById, subjectsByClass } from "@/lib/subjects";
import { getTermsForClass } from "@/lib/terms";

interface ReportData {
  student: {
    name: string;
    regNo: string;
    class: string;
  };
  academicYear: string;
  termReports: {
    "1st Unit Test"?: {
      subjects: Array<{
        subjectCode: string;
        marks: number;
        maxMarks: number;
        grade: string;
      }>;
      totalObtained: number;
      totalMax: number;
      percentage: number;
    };
    "Mid Term"?: {
      subjects: Array<{
        subjectCode: string;
        marks: number;
        maxMarks: number;
        grade: string;
      }>;
      totalObtained: number;
      totalMax: number;
      percentage: number;
    };
    "2nd Unit Test"?: {
      subjects: Array<{
        subjectCode: string;
        marks: number;
        maxMarks: number;
        grade: string;
      }>;
      totalObtained: number;
      totalMax: number;
      percentage: number;
    };
    "Final Term"?: {
      subjects: Array<{
        subjectCode: string;
        marks: number;
        maxMarks: number;
        grade: string;
      }>;
      totalObtained: number;
      totalMax: number;
      percentage: number;
    };
  };
  overallPercentage: number;
  overallGrade: string;
  result: string;
  promotionStatus?: string;
  isPublished: boolean;
}

function PrintableReportCardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const studentId = params.id as string;
        const academicYear = searchParams.get("year") || "2025";

        const response = await fetch(
          `/api/reports/student/${studentId}?academicYear=${academicYear}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch report");
        }

        const reportData = await response.json();
        setData(reportData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
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
          <p className="text-slate-600">{error || "Report not found"}</p>
        </div>
      </div>
    );
  }

  // Calculate CGPA (assuming 10-point scale)
  const cgpa = data.overallPercentage / 10;

  // Get all unique subjects from all terms
  const allSubjects = new Set<string>();
  Object.values(data.termReports).forEach((termData) => {
    if (termData) {
      termData.subjects.forEach((sub) => allSubjects.add(sub.subjectCode));
    }
  });

  // TEMPORARY: Add dummy subjects for testing (REMOVE LATER)
  const dummySubjects = [
    'PHYS', 'CHEM', 'BIO', 'ENG-LIT', 'ENG-LANG', 
    'HINDI', 'SANS', 'COMP-SCI', 'INFO-TECH', 'ART',
    'MUSIC', 'PE', 'GEO', 'ECO', 'POL-SCI',
    'SOCIO', 'PSYCH'
  ];
  dummySubjects.forEach(sub => allSubjects.add(sub));
  // END TEMPORARY

  const subjects = Array.from(allSubjects);

  // Helper to get marks for a subject in a specific term
  const getMarksForTerm = (subjectCode: string, termKey: string) => {
    const termData = data.termReports[termKey as keyof typeof data.termReports];
    if (!termData) return null;
    return termData.subjects.find((s) => s.subjectCode === subjectCode);
  };

  // Calculate cumulative marks up to each term
  const getCumulativeMarks = (subjectCode: string, upToTerm: string) => {
    const termOrder = [
      "1st Unit Test",
      "Mid Term",
      "2nd Unit Test",
      "Final Term",
    ];
    const endIndex = termOrder.indexOf(upToTerm);

    let totalObtained = 0;
    let totalMax = 0;

    for (let i = 0; i <= endIndex; i++) {
      const marks = getMarksForTerm(subjectCode, termOrder[i]);
      if (marks) {
        totalObtained += marks.marks;
        totalMax += marks.maxMarks;
      }
    }

    return { totalObtained, totalMax };
  };

  // Calculate cumulative totals for each term
  const getCumulativeTotals = (upToTerm: string) => {
    const termOrder = [
      "1st Unit Test",
      "Mid Term",
      "2nd Unit Test",
      "Final Term",
    ];
    const endIndex = termOrder.indexOf(upToTerm);

    let totalObtained = 0;
    let totalMax = 0;

    for (let i = 0; i <= endIndex; i++) {
      const termData =
        data.termReports[termOrder[i] as keyof typeof data.termReports];
      if (termData) {
        totalObtained += termData.totalObtained;
        totalMax += termData.totalMax;
      }
    }

    return { totalObtained, totalMax };
  };

  // Convert letter grades to ICSE numeric grades (1-9 scale)
  const convertToICSEGrade = (letterGrade: string): string => {
    const gradeMap: { [key: string]: string } = {
      "A+": "1",
      A: "2",
      "B+": "3",
      B: "4",
      "C+": "5",
      C: "6",
      D: "7",
      E: "8",
      F: "9",
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
            margin: 0.3cm;
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
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .watermark-text {
            color: rgba(59, 130, 246, 0.08) !important;
          }
          .page-break-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-page {
            page-break-after: always;
            display: flex !important;
            flex-direction: column !important;
            min-height: 297mm !important;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          /* Ensure proper scaling on mobile */
          html,
          body {
            width: 100%;
            height: 100%;
          }
          /* Compact spacing for mobile print */
          .mobile-compact {
            padding: 0.25rem !important;
            margin: 0.25rem !important;
          }
          .mobile-compact-border {
            border-width: 3px !important;
            margin: 0.25rem !important;
          }
          /* Reduce font sizes slightly for better fit */
          .mobile-text-sm {
            font-size: 10px !important;
          }
          .mobile-text-xs {
            font-size: 9px !important;
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
      <div
        className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:p-0 print:py-0 print:px-0"
        style={{ minWidth: "800px" }}
      >
        <div
          className="report-container max-w-3xl mx-auto bg-white print:shadow-none print:max-w-full"
          style={{ width: "100%", maxWidth: "800px" }}
        >
          {/* Main Border Container - PAGE 1 */}
          <div className="border-[5px] border-double border-blue-800 m-4 print:m-1 print:mobile-compact-border min-h-[calc(100vh-4rem)] relative print-page flex flex-col">
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
            <div className="flex justify-center pt-4 pb-1 relative z-10 print:pt-2 print:pb-0.5">
              <img
                src="https://www.schooldekho.org/storage/logo//epdo17blks0ss4sgcokg8kwsg448cco.png"
                alt="St. Helen's School Logo"
                className="w-16 h-16 object-contain print:w-10 print:h-10"
              />
            </div>

            {/* School Name Header */}
            <div className="text-center px-6 pb-2 print:px-3 print:pb-1">
              <h1 className="text-red-700 text-2xl font-bold tracking-wide print:text-xl">
                ST. HELEN&apos;S SECONDARY SCHOOL
              </h1>
              <h2 className="text-red-700 text-xl font-bold tracking-wider print:text-lg">
                KURSEONG
              </h2>
            </div>

            {/* Title Section */}
            <div className="text-center pb-1 print:pb-0.5">
              <h3 className="text-blue-800 text-lg font-bold tracking-wide print:text-base">
                STATEMENT OF MARKS
              </h3>
            </div>

            {/* Horizontal Line */}
            <div className="border-t-2 border-blue-800 mx-6 my-2 relative z-10 print:mx-3 print:my-1"></div>

            {/* Student Information - Compact Two Column Layout */}
            <div className="px-6 pb-2 my-2 relative z-10 print:px-3 print:pb-1 print:my-1">
              <div className="border-2 border-blue-800">
                <div className="grid grid-cols-2">
                  <div className="flex border-r border-b border-blue-800 px-2 py-1">
                    <span className="font-bold text-gray-900 text-xs min-w-[100px]">
                      NAME:
                    </span>
                    <span className="text-gray-900 uppercase font-semibold text-xs">
                      {data.student.name}
                    </span>
                  </div>
                  <div className="flex border-r border-b border-blue-800 px-2 py-1">
                    <span className="font-bold text-gray-900 text-xs min-w-[140px]">
                      REG. NO:
                    </span>
                    <span className="text-gray-900 font-semibold text-xs">
                      {data.student.regNo}
                    </span>
                  </div>
                  <div className="flex border-r border-blue-800 px-2 py-1">
                    <span className="font-bold text-gray-900 text-xs min-w-[100px]">
                      CLASS:
                    </span>
                    <span className="text-gray-900 font-semibold text-xs">
                      {formatClass(data.student.class)}
                    </span>
                  </div>
                  <div className="flex px-2 py-1">
                    <span className="font-bold text-gray-900 text-xs min-w-[140px]">
                      ACADEMIC YEAR:
                    </span>
                    <span className="text-gray-900 font-semibold text-xs">
                      {data.academicYear.split("-")[0]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Marks Table */}
            <div className="px-6 pb-2 relative z-10 print:px-3 print:pb-1">
              <table className="w-full border-2 border-blue-800 text-sm print:text-[11px]">
                <thead>
                  <tr className="bg-white border-b-2 border-blue-800">
                    <th className="border-r border-blue-800 px-3 py-2 text-center text-sm font-bold text-gray-900 print:px-2 print:py-1.5 print:text-xs">
                      SUBJECTS
                    </th>
                    <th
                      colSpan={4}
                      className="border-r border-blue-800 px-3 py-2 text-center text-sm font-bold text-gray-900 print:px-2 print:py-1.5 print:text-xs"
                    >
                      MARKS OBTAINED
                    </th>
                    <th className="border-r border-blue-800 px-3 py-2 text-center text-sm font-bold text-gray-900 w-20 print:px-2 print:py-1.5 print:text-xs">
                      AVERAGE
                      <br />
                      (100)
                    </th>
                  </tr>
                  <tr className="bg-white border-b border-blue-800">
                    <th className="border-r border-blue-800 px-2 py-1 text-center text-xs font-semibold text-gray-700 print:px-1.5 print:py-1 print:text-[10px]"></th>
                    <th className="border-r border-blue-800 px-2 py-1 text-center text-xs font-semibold text-gray-700 print:px-1.5 print:py-1 print:text-[10px]">
                      1st Unit Test (
                      {getTermsForClass(data.student.class).find(
                        (t) => t.name === "1st Unit Test"
                      )?.maxMarks || "-"}
                      )
                    </th>
                    <th className="border-r border-blue-800 px-2 py-1 text-center text-xs font-semibold text-gray-700 print:px-1.5 print:py-1 print:text-[10px]">
                      Mid Term (
                      {getTermsForClass(data.student.class).find(
                        (t) => t.name === "Mid Term"
                      )?.maxMarks || "-"}
                      )
                    </th>
                    <th className="border-r border-blue-800 px-2 py-1 text-center text-xs font-semibold text-gray-700 print:px-1.5 print:py-1 print:text-[10px]">
                      2nd Unit Test (
                      {getTermsForClass(data.student.class).find(
                        (t) => t.name === "2nd Unit Test"
                      )?.maxMarks || "-"}
                      )
                    </th>
                    <th className="border-r border-blue-800 px-2 py-1 text-center text-xs font-semibold text-gray-700 print:px-1.5 print:py-1 print:text-[10px]">
                      Final Term (
                      {getTermsForClass(data.student.class).find(
                        (t) => t.name === "Final Term"
                      )?.maxMarks || "-"}
                      )
                    </th>
                    <th className="border-r border-blue-800 px-2 py-1 text-center text-xs font-semibold text-gray-700 print:px-1.5 print:py-1 print:text-[10px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subjectCode) => {
                    const term1 = getMarksForTerm(subjectCode, "1st Unit Test");
                    const term2 = getMarksForTerm(subjectCode, "Mid Term");
                    const term3 = getMarksForTerm(subjectCode, "2nd Unit Test");
                    const term4 = getMarksForTerm(subjectCode, "Final Term");
                    
                    // Check if this is an alphabetical grading subject
                    const subjectDetail = getSubjectById(data.student.class, subjectCode);
                    const isAlphabetical = subjectDetail?.dataType === 'string';
                    
                    // Calculate average percentage for numeric subjects
                    let totalObtained = 0;
                    let totalMax = 0;
                    let hasMarks = false;
                    let averagePercentage = 0;
                    
                    if (!isAlphabetical) {
                      [term1, term2, term3, term4].forEach((term) => {
                        if (term && term.marks !== undefined) {
                          totalObtained += term.marks;
                          totalMax += term.maxMarks;
                          hasMarks = true;
                        }
                      });
                      
                      if (totalMax > 0) {
                        averagePercentage = (totalObtained / totalMax) * 100;
                      }
                    }

                    return (
                      <tr
                        key={subjectCode}
                        className="border-b border-blue-800"
                      >
                        <td className="border-r border-blue-800 px-3 py-1.5 text-xs text-gray-900 print:px-2 print:py-1 print:text-[11px]">
                          {getSubjectById(data.student.class, subjectCode)
                            ?.name || subjectCode}
                        </td>
                        <td className="border-r border-blue-800 px-2 py-1.5 text-center text-sm font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs">
                          {term1 ? (isAlphabetical && term1.grade ? term1.grade : term1.marks) : "-"}
                        </td>
                        <td className="border-r border-blue-800 px-2 py-1.5 text-center text-sm font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs">
                          {term2 ? (isAlphabetical && term2.grade ? term2.grade : term2.marks) : "-"}
                        </td>
                        <td className="border-r border-blue-800 px-2 py-1.5 text-center text-sm font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs">
                          {term3 ? (isAlphabetical && term3.grade ? term3.grade : term3.marks) : "-"}
                        </td>
                        <td className="border-r border-blue-800 px-2 py-1.5 text-center text-sm font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs">
                          {term4 ? (isAlphabetical && term4.grade ? term4.grade : term4.marks) : "-"}
                        </td>
                        <td className="border-r border-blue-800 px-2 py-1.5 text-center text-sm font-semibold text-gray-900 print:px-1.5 print:py-1 print:text-xs">
                          {isAlphabetical ? "-" : (hasMarks
                            ? averagePercentage.toFixed(0)
                            : "-")}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr className="border-b-2 border-blue-800 bg-gray-50">
                    <td className="border-r border-blue-800 px-3 py-2 text-sm font-bold text-gray-900 print:px-2 print:py-1.5 print:text-xs">
                      TOTAL
                    </td>
                    <td className="border-r border-blue-800 px-2 py-2 text-center text-sm font-bold text-gray-900 print:px-1.5 print:py-1.5 print:text-xs">
                      {data.termReports["1st Unit Test"]
                        ? `${data.termReports["1st Unit Test"].totalObtained} / ${data.termReports["1st Unit Test"].totalMax}`
                        : "-"}
                    </td>
                    <td className="border-r border-blue-800 px-2 py-2 text-center text-sm font-bold text-gray-900 print:px-1.5 print:py-1.5 print:text-xs">
                      {data.termReports["Mid Term"]
                        ? `${data.termReports["Mid Term"].totalObtained} / ${data.termReports["Mid Term"].totalMax}`
                        : "-"}
                    </td>
                    <td className="border-r border-blue-800 px-2 py-2 text-center text-sm font-bold text-gray-900 print:px-1.5 print:py-1.5 print:text-xs">
                      {data.termReports["2nd Unit Test"]
                        ? `${data.termReports["2nd Unit Test"].totalObtained} / ${data.termReports["2nd Unit Test"].totalMax}`
                        : "-"}
                    </td>
                    <td className="border-r border-blue-800 px-2 py-2 text-center text-sm font-bold text-gray-900 print:px-1.5 print:py-1.5 print:text-xs">
                      {data.termReports["Final Term"]
                        ? `${data.termReports["Final Term"].totalObtained} / ${data.termReports["Final Term"].totalMax}`
                        : "-"}
                    </td>
                    <td className="border-r border-blue-800 px-2 py-2 text-center text-sm font-bold text-gray-900 print:px-1.5 print:py-1.5 print:text-xs">
                      {(() => {
                        let totalAverage = 0;
                        let subjectCount = 0;
                        
                        subjects.forEach((subjectCode) => {
                          const subjectDetail = getSubjectById(data.student.class, subjectCode);
                          const isAlphabetical = subjectDetail?.dataType === 'string';
                          
                          if (!isAlphabetical) {
                            let totalObtained = 0;
                            let totalMax = 0;
                            
                            const term1 = getMarksForTerm(subjectCode, "1st Unit Test");
                            const term2 = getMarksForTerm(subjectCode, "Mid Term");
                            const term3 = getMarksForTerm(subjectCode, "2nd Unit Test");
                            const term4 = getMarksForTerm(subjectCode, "Final Term");
                            
                            [term1, term2, term3, term4].forEach((term) => {
                              if (term && term.marks !== undefined) {
                                totalObtained += term.marks;
                                totalMax += term.maxMarks;
                              }
                            });
                            
                            if (totalMax > 0) {
                              const percentage = (totalObtained / totalMax) * 100;
                              totalAverage += percentage;
                              subjectCount++;
                            }
                          }
                        });
                        
                        const maxPossible = subjectCount * 100;
                        return subjectCount > 0 ? `${totalAverage.toFixed(0)} / ${maxPossible}` : "-";
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            <div className="px-6 pb-0 relative z-10 print:px-3">
              <table className="w-full border-2 border-blue-800">
                <tbody>
                  <tr>
                    <td className="px-4 py-2 text-sm font-bold text-gray-900 bg-gray-50 print:px-2 print:py-1 print:text-xs">
                      PERCENTAGE
                    </td>
                    <td className="px-4 py-2 text-center text-lg font-bold text-blue-800 print:px-2 print:py-1 print:text-base">
                      {data.overallPercentage.toFixed(0)} %
                    </td>
                  </tr>
                  {data.promotionStatus && data.promotionStatus !== "PENDING" && (
                    <tr>
                      <td className="px-4 py-2 text-sm font-bold text-gray-900 bg-gray-50 print:px-2 print:py-1 print:text-xs">
                        PROMOTIONAL STATUS
                      </td>
                      <td className={`px-4 py-2 text-center text-lg font-bold print:px-2 print:py-1 print:text-base ${
                        data.promotionStatus === "PROMOTED" ? "text-green-700" : "text-red-700"
                      }`}>
                        {data.promotionStatus}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Spacer to push signatures to bottom */}
            <div className="grow"></div>

            {/* Signatures */}
            <div className="px-6 pb-4 mt-4 mb-8 relative z-10 page-break-avoid print:px-3 print:pb-2 print:pt-1 print:mt-0">
              <div className="grid grid-cols-2 gap-12 mt-4 print:gap-3 print:mt-0">
                <div className="text-center">
                  <div className="h-24 flex items-end justify-center mb-2 print:h-12 print:mb-1">
                    <img 
                      src="https://media.discordapp.net/attachments/617390798350057472/1447497068926074891/sign-Photoroom.png?ex=6937d632&is=693684b2&hm=b45eacee5b75249fed2db6bdda389cd3110df2f01ac20029eeb74603eb754969&=&format=png&quality=lossless&width=900&height=408"
                      alt="Class Teacher Signature"
                      className="h-20 w-60 object-contain print:h-20 border border-gray-800"
                    />
                  </div>
                  <div className="pt-2 mx-8 print:mx-2 print:pt-0">
                    <p className="text-sm font-bold text-gray-900">
                      Class Teacher Signature
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="h-24 flex items-end justify-center mb-2 print:h-12 print:mb-1">
                    <img 
                      src={'https://cdn.discordapp.com/attachments/617390798350057472/1447505326470594644/principal-Photoroom.png?ex=6937dde3&is=69368c63&hm=f9c954b44f0f9827924a5e0291e6f5744de2229b0254e56515f29337d2e2023f'}
                      alt="Principal Signature"
                      className="h-20 object-contain w-60 print:h-20 border border-gray-800"
                    />
                  </div>
                  <div className=" pt-2 mx-8 print:mx-2 print:pt-0 ">
                    <p className="text-sm font-bold text-gray-900">
                      Principal Signature
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal Line */}
            <div className="border-t-2 border-blue-800 mx-2 my-2 relative z-10 print:my-1"></div>

            {/* School Footer */}
            <div className="px-6 pb-4 text-center relative z-10 page-break-avoid print:px-3 print:pb-2">
              <p className="text-sm font-semibold text-gray-900">
                St. Helen's Secondary School, Kurseong - 734203, Dist.
                Darjeeling, West Bengal, India.
              </p>
              <p className="text-xs text-gray-700 mt-1">
                Convent: 0354 - 2344379 | School: 0354 - 2344358 | Mobile:
                8116848298
              </p>
              <p className="text-xs text-gray-700">
                Email: fcsthelens1@gmail.com
              </p>
            </div>
          </div>

          {/* PAGE 2 - Grading System */}
          <div className="border-[5px] border-double border-blue-800 m-4 print:m-1 print:mobile-compact-border min-h-[calc(100vh-4rem)] relative print-page flex flex-col">
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
            <div className="flex justify-center pt-6 pb-2 relative z-10 print:pt-2 print:pb-1">
              <img
                src="https://www.schooldekho.org/storage/logo//epdo17blks0ss4sgcokg8kwsg448cco.png"
                alt="St. Helen's School Logo"
                className="w-16 h-16 object-contain print:w-10 print:h-10"
              />
            </div>

            {/* School Name Header */}
            <div className="text-center px-6 pb-2 relative z-10 print:px-3 print:pb-1">
              <h1 className="text-red-700 text-2xl font-bold tracking-wide print:text-lg">
                ST. HELEN&apos;S SECONDARY SCHOOL
              </h1>
              <h2 className="text-red-700 text-xl font-bold tracking-wider print:text-base">
                KURSEONG
              </h2>
            </div>

            {/* Title Section */}
            <div className="text-center pb-2 relative z-10 print:pb-1">
              <h3 className="text-blue-800 text-lg font-bold tracking-wide print:text-sm">
                GRADING SYSTEM
              </h3>
              <p className="text-blue-700 text-sm font-semibold mt-1 print:text-xs print:mt-0">
                Academic Year {data.academicYear}
              </p>
            </div>

            {/* Horizontal Line */}
            <div className="border-t-2 border-blue-800 mx-6 my-2 relative z-10 print:mx-3 print:my-1"></div>

            {/* Content Container - Centered */}
            <div className="flex-1 flex flex-col py-4 print:py-2">
              {/* Grading Table */}
              <div className="px-6 pb-4 mt-14 relative z-10 print:px-3 print:pb-3">
                <div className="border-2 border-blue-800 p-6 bg-white mx-auto print:p-3">
                  <h3 className="text-center text-blue-800 font-bold text-lg mb-4 underline underline-offset-4 print:text-base print:mb-2">
                    GRADES
                  </h3>
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b border-gray-300">
                        <td className="py-2 text-center font-bold text-gray-900 print:py-1 print:text-sm">
                          A
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          :
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          90
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          -
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          100
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          Very Good
                        </td>
                      </tr>
                      <tr className="border-b border-gray-300">
                        <td className="py-2 text-center font-bold text-gray-900 print:py-1 print:text-sm">
                          B
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          :
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          70
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          -
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          89
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          Good
                        </td>
                      </tr>
                      <tr className="border-b border-gray-300">
                        <td className="py-2 text-center font-bold text-gray-900 print:py-1 print:text-sm">
                          C
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          :
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          50
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          -
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          69
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          Satisfactory
                        </td>
                      </tr>
                      <tr className="border-b border-gray-300">
                        <td className="py-2 text-center font-bold text-gray-900 print:py-1 print:text-sm">
                          D
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          :
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          45
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          -
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          49
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          Fair
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-center font-bold text-gray-900 print:py-1 print:text-sm">
                          E
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          :
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          Below
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          -
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          45
                        </td>
                        <td className="py-2 text-center text-gray-900 print:py-1 print:text-sm">
                          Unsatisfactory
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* A Word to Parents */}
              <div className="px-6 pb-2 mt-12 relative z-10 print:px-3 print:pb-2">
                <h3 className="text-blue-800 underline underline-offset-4 mb-1.5 text-center text-lg font-bold tracking-wide print:text-base">
                  A WORD TO PARENTS
                </h3>
                <ol className="space-y-2 text-lg text-gray-700  list-decimal list-inside print:space-y-0.5 print:text-lg">
                  <li>
                    The decision of the school authorities with regard to
                    promotion, is final.
                  </li>
                  <li>
                    Promotion is decided on the whole year's performance & not
                    on the final examination only.
                  </li>
                  <li className="italic">
                    Promotion will not be granted to any student obtaining less
                    than 40% in any compulsory subject.
                  </li>
                  <li className="font-semibold">Pass Marks - 45%</li>
                  <li>
                    Parents and students should bear in mind that results once
                    published is final and will not be changed.
                  </li>
                  <li>
                    A student failing twice in the same class must apply for
                    withdrawal.
                  </li>
                </ol>
              </div>
            </div>

            {/* Horizontal Line */}
            <div className="border-t-2 border-blue-800 mx-6 mt-2 mb-2 relative z-10 print:mx-3 print:mt-1 print:mb-1"></div>

            {/* School Footer */}
            <div className="px-6 pb-4 text-center relative z-10 print:px-3 print:pb-2">
              <p className="text-sm font-semibold text-gray-900 print:text-xs">
                St. Helen's Secondary School, Kurseong - 734203, Dist.
                Darjeeling, West Bengal, India.
              </p>
              <p className="text-xs text-gray-700 mt-1 print:text-[10px] print:mt-0">
                Convent: 0354 - 2344379 | School: 0354 - 2344358 | Mobile:
                8116848298
              </p>
              <p className="text-xs text-gray-700 print:text-[10px]">
                Email: fcsthelens1@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PrintableReportCard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <PrintableReportCardContent />
    </Suspense>
  );
}
