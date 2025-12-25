import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT activate academic year
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the year being activated
    const yearToActivate = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!yearToActivate) {
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 }
      );
    }

    // Get the current active year
    const currentActiveYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    // Deactivate all other years
    await prisma.academicYear.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate this year
    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: { isActive: true },
    });

    // Only promote students if the new active year is greater than the previous active year
    const shouldPromote =
      !currentActiveYear ||
      parseInt(yearToActivate.year) > parseInt(currentActiveYear.year);

    if (shouldPromote) {
      // Get all active students
      try {
        const activeStudents = await prisma.student.findMany({
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
            class: true,
            academicYear: true,
            promotionStatus: true,
          },
        });

        console.log(`Found ${activeStudents.length} active students to process`);

        if (activeStudents.length > 0) {
          // Separate students by promotion status
          const promotedStudents = activeStudents.filter(s => s.promotionStatus === 'PROMOTED')
          const otherStudents = activeStudents.filter(s => s.promotionStatus !== 'PROMOTED')

          console.log(`Students breakdown: ${promotedStudents.length} PROMOTED, ${otherStudents.length} other statuses`);

          const promotionQueries = []

          // Update PROMOTED students: increment class + update year + reset status
          if (promotedStudents.length > 0) {
            const promotedByClass = new Map<string, string[]>()
          
            promotedStudents.forEach((student) => {
              if (!promotedByClass.has(student.class)) {
                promotedByClass.set(student.class, [])
              }
              promotedByClass.get(student.class)!.push(student.id)
            })

            promotedByClass.forEach((studentIds, currentClass) => {
              const classNum = parseInt(currentClass)
              const nextClass = classNum >= 12 ? 12 : classNum + 1
              
              promotionQueries.push(
                prisma.student.updateMany({
                  where: { id: { in: studentIds } },
                  data: {
                    class: nextClass.toString(),
                    academicYear: yearToActivate.year,
                    promotionStatus: "PENDING",
                  },
                })
              )
            })
          }

          // Update other students: just update year + reset status (keep same class)
          if (otherStudents.length > 0) {
            promotionQueries.push(
              prisma.student.updateMany({
                where: {
                  id: { in: otherStudents.map(s => s.id) },
                },
                data: {
                  academicYear: yearToActivate.year,
                  promotionStatus: "PENDING",
                },
              })
            )
          }

          // Execute all updates as a single atomic transaction
          try {
            const results = await prisma.$transaction(promotionQueries);
            const totalUpdated = results.reduce((sum, result) => sum + result.count, 0);
            console.log(`Updated ${totalUpdated} students (${promotedStudents.length} promoted to next class) for academic year ${yearToActivate.year}`);
          } catch (error) {
            console.error("Promotion failed, rolling back changes:", error);
            throw error;
          }
        }
      } catch (queryError) {
        console.error("Error querying students for promotion:", queryError);
        console.error("Error details:", JSON.stringify(queryError, null, 2));
        throw queryError;
      }
    }

    return NextResponse.json(academicYear);
  } catch (error) {
    console.error("Error activating academic year:", error);
    return NextResponse.json(
      { error: "Failed to activate academic year" },
      { status: 500 }
    );
  }
}
