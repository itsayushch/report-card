'use client'

import Head from 'next/head'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

function PrintButton() {
  return (
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
      <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
    </div>
  )
}

export default function PrintReportCardPage({
  searchParams,
}: {
  searchParams?: { studentId?: string; term?: string; academicYear?: string }
}) {
  const term = searchParams?.term || 'I Semester'
  const academicYear = searchParams?.academicYear || '2025-2026'

  // Placeholder demo data; replace with server data when available
  const data = useMemo(() => ({
    school: {
      name: "St. Helen's School",
      address: '123 Main Road, City, State - 123456',
      contact: 'Ph: 01234 567890 | Email: info@sthelens.edu',
      affiliation: 'Affiliated to XYZ Board',
    },
    student: {
      name: 'JOHN DOE',
      serial: 'SJS/2025/00123',
      classSection: 'Class 8 - A',
      year: academicYear,
      photoUrl: '',
    },
    marks: [
      { subject: 'ENGLISH', sem1: 78, sem2: 82 },
      { subject: 'MATHEMATICS', sem1: 85, sem2: 88 },
      { subject: 'SCIENCE', sem1: 81, sem2: 79 },
      { subject: 'SOCIAL STUDIES', sem1: 76, sem2: 80 },
      { subject: 'HINDI', sem1: 72, sem2: 74 },
    ],
  }), [academicYear])

  const totals = useMemo(() => {
    const total1 = data.marks.reduce((s, m) => s + m.sem1, 0)
    const total2 = data.marks.reduce((s, m) => s + m.sem2, 0)
    const overall = total1 + total2
    const max = data.marks.length * 200
    const percentage = Math.round((overall / max) * 100)
    const grade = percentage >= 85 ? 'A' : percentage >= 70 ? 'B' : percentage >= 55 ? 'C' : 'D'
    return { total1, total2, overall, percentage, grade }
  }, [data])

  return (
    <>
      <Head>
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      </Head>

      <style>{`
        :root { color-scheme: light; }
        html, body { height: 100%; }
        body { margin: 0; background: #f0f2f5; }
        .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; }
        .screen-wrapper { padding: 16px; }
        .screen-shadow { box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
        .no-print { display: block; }

        @media screen {
          .page { border: 1px solid #e5e7eb; }
        }

        @media print {
          html, body { height: auto; background: #fff; }
          .screen-wrapper { padding: 0; }
          .screen-shadow { box-shadow: none; }
          .no-print { display: none !important; }
          .report-card { page-break-inside: avoid; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }

        @page { size: A4 portrait; margin: 12mm; }
      `}</style>

      <div className="screen-wrapper">
        <div className="page screen-shadow">
          <PrintButton />

          <div className="report-card" style={{ padding: '18px 22px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ display: 'inline-block', padding: 8, border: '2px solid #1e3a8a' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a', letterSpacing: 1 }}>
                  STATEMENT OF MARKS
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#374151' }}>{term}</div>
            </div>

            {/* School & Student Info */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
              <tbody>
                <tr>
                  <td style={{ width: '70%', verticalAlign: 'top', paddingRight: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{data.school.name}</div>
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{data.school.address}</div>
                    <div style={{ fontSize: 12, color: '#374151' }}>{data.school.contact}</div>
                    <div style={{ fontSize: 11, color: '#1e3a8a', marginTop: 4 }}>{data.school.affiliation}</div>
                  </td>
                  <td style={{ width: '30%', textAlign: 'right', verticalAlign: 'top' }}>
                    <div style={{ display: 'inline-block', width: 78, height: 92, border: '1px solid #9ca3af', borderRadius: 4, overflow: 'hidden', background: '#f9fafb' }}>
                      {/* Photo placeholder */}
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Photo</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ height: 10 }} />

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: 6, border: '1px solid #1e3a8a', width: '40%' }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>Name</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{data.student.name}</div>
                  </td>
                  <td style={{ padding: 6, border: '1px solid #1e3a8a', width: '30%' }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>Serial No.</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{data.student.serial}</div>
                  </td>
                  <td style={{ padding: 6, border: '1px solid #1e3a8a', width: '30%' }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>Class & Section</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{data.student.classSection}</div>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: 6, border: '1px solid #1e3a8a' }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>Academic Year</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{data.student.year}</div>
                  </td>
                  <td style={{ padding: 6, border: '1px solid #1e3a8a' }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>Term</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{term}</div>
                  </td>
                  <td style={{ padding: 6, border: '1px solid #1e3a8a' }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>Result</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: totals.percentage >= 35 ? '#15803d' : '#b91c1c' }}>
                      {totals.percentage >= 35 ? 'PASS' : 'FAIL'}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ height: 12 }} />

            {/* Marks Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 12, color: '#111827', textAlign: 'left', background: '#edf2ff' }}>Subject</th>
                  <th style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 12, color: '#111827', textAlign: 'right', background: '#edf2ff' }}>I Semester (100)</th>
                  <th style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 12, color: '#111827', textAlign: 'right', background: '#edf2ff' }}>II Semester (100)</th>
                  <th style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 12, color: '#111827', textAlign: 'right', background: '#edf2ff' }}>Overall %</th>
                  <th style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 12, color: '#111827', textAlign: 'center', background: '#edf2ff' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {data.marks.map((m, i) => {
                  const overall = Math.round(((m.sem1 + m.sem2) / 200) * 100)
                  const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : 'D'
                  return (
                    <tr key={i}>
                      <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, color: '#111827' }}>{m.subject}</td>
                      <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, color: '#111827', textAlign: 'right' }}>{m.sem1}</td>
                      <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, color: '#111827', textAlign: 'right' }}>{m.sem2}</td>
                      <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, color: '#111827', textAlign: 'right' }}>{overall}%</td>
                      <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, fontWeight: 700, color: '#111827', textAlign: 'center' }}>{grade}</td>
                    </tr>
                  )
                })}
                <tr>
                  <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, fontWeight: 700, color: '#111827' }}>TOTAL</td>
                  <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, fontWeight: 700, color: '#111827', textAlign: 'right' }}>{totals.total1}</td>
                  <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, fontWeight: 700, color: '#111827', textAlign: 'right' }}>{totals.total2}</td>
                  <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, fontWeight: 700, color: '#111827', textAlign: 'right' }}>{totals.percentage}%</td>
                  <td style={{ border: '1px solid #1e3a8a', padding: 6, fontSize: 13, fontWeight: 700, color: '#111827', textAlign: 'center' }}>{totals.grade}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ height: 12 }} />

            {/* Footer */}
            <div style={{ background: '#eef2ff', border: '1px solid #1e3a8a', padding: 10 }}>
              <div style={{ fontSize: 12, color: '#1e3a8a', textAlign: 'center' }}>
                {data.school.contact}
              </div>
              <div style={{ fontSize: 11, color: '#374151', textAlign: 'center', marginTop: 4 }}>
                {data.school.affiliation}
              </div>
            </div>

            <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
              This is a system-generated report card and does not require a signature.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
