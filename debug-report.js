const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Get a sample student
  const student = await prisma.student.findFirst()
  console.log('\n=== Sample Student ===')
  console.log(JSON.stringify(student, null, 2))
  
  // Get published reports
  const reports = await prisma.reportPublish.findMany({
    where: { isPublished: true }
  })
  console.log('\n=== Published Reports ===')
  console.log(JSON.stringify(reports, null, 2))
  
  // Get marks for the student
  if (student) {
    const marks = await prisma.mark.findMany({
      where: { studentId: student.id },
      include: { subject: true }
    })
    console.log('\n=== Student Marks ===')
    console.log(JSON.stringify(marks, null, 2))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
