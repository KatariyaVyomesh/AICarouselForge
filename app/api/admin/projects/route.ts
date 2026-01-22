import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/admin/projects - List all projects with full details
export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { updatedAt: "desc" },
            include: {
                slides: {
                    orderBy: { index: "asc" },
                },
                _count: {
                    select: { slides: true }
                }
            },
        })

        // Get statistics
        const totalProjects = await prisma.project.count()
        const totalSlides = await prisma.slide.count()

        return NextResponse.json({
            projects,
            stats: {
                totalProjects,
                totalSlides
            }
        })
    } catch (error) {
        console.error("Failed to fetch projects:", error)
        return NextResponse.json(
            { error: "Failed to fetch projects" },
            { status: 500 }
        )
    }
}

// DELETE /api/admin/projects - Bulk delete projects
export async function DELETE(request: NextRequest) {
    try {
        const { ids } = await request.json()

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: "No project IDs provided" },
                { status: 400 }
            )
        }

        // Delete projects (slides will cascade delete due to schema)
        const result = await prisma.project.deleteMany({
            where: {
                id: { in: ids }
            }
        })

        return NextResponse.json({
            success: true,
            deleted: result.count
        })
    } catch (error) {
        console.error("Failed to delete projects:", error)
        return NextResponse.json(
            { error: "Failed to delete projects" },
            { status: 500 }
        )
    }
}
