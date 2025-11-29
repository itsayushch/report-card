import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportData {
  student: {
    name: string;
    rollNo: string;
    class: string;
    section: string;
    photo?: string;
  };
  academicYear: string;
  term: string;
  marks: {
    subject: string;
    maxMarks: number;
    obtainedMarks: number;
    grade: string;
    remarks: string;
  }[];
  summary: {
    totalObtained: number;
    totalMax: number;
    percentage: number;
    gpa: number;
    result: string;
  };
  promotionStatus?: string;
}

export function generateReportCardPDF(data: ReportData): jsPDF {
  const doc = new jsPDF();

  // Add school header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text("St. Helen's School", 105, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Report Card', 105, 25, { align: 'center' });

  // Add horizontal line
  doc.setLineWidth(0.5);
  doc.line(20, 30, 190, 30);

  // Add student details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Information', 20, 40);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${data.student.name}`, 20, 48);
  doc.text(`Roll No: ${data.student.rollNo}`, 20, 56);
  doc.text(`Class: ${data.student.class}-${data.student.section}`, 20, 64);
  
  doc.text(`Academic Year: ${data.academicYear}`, 120, 48);
  doc.text(`Term: ${data.term}`, 120, 56);

  // Add marks table
  const tableData = data.marks.map((m) => [
    m.subject,
    m.maxMarks.toString(),
    m.obtainedMarks.toString(),
    m.grade,
    m.remarks || '-',
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['Subject', 'Max Marks', 'Obtained', 'Grade', 'Remarks']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  // Get the final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Add summary box
  doc.setFillColor(249, 250, 251);
  doc.rect(20, finalY, 170, 40, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 25, finalY + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Total Marks: ${data.summary.totalObtained} / ${data.summary.totalMax}`,
    25,
    finalY + 16
  );
  doc.text(`Percentage: ${data.summary.percentage}%`, 25, finalY + 24);
  doc.text(`GPA: ${data.summary.gpa} / 10`, 25, finalY + 32);

  // Result with color
  const resultColor = data.summary.result === 'PASS' ? [34, 197, 94] : [239, 68, 68];
  doc.setTextColor(resultColor[0], resultColor[1], resultColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`Result: ${data.summary.result}`, 110, finalY + 16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  if (data.promotionStatus) {
    doc.text(`Promotion: ${data.promotionStatus}`, 110, finalY + 24);
  }

  // Add signature section
  const sigY = finalY + 55;
  doc.setFontSize(9);
  doc.text('_________________', 25, sigY);
  doc.text('Class Teacher', 30, sigY + 8);

  doc.text('_________________', 110, sigY);
  doc.text('Principal', 120, sigY + 8);

  // Add footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${new Date().toLocaleDateString()}`,
    105,
    280,
    { align: 'center' }
  );

  return doc;
}
