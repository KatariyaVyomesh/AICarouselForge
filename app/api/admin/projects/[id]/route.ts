import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import path from "node:path"
import { unlink } from "node:fs/promises"

// GET /api/admin/projects/[id] - Get single project with all slides
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                slides: {
                    orderBy: { index: "asc" }
                }
            }
        })

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ project })
    } catch (error) {
        console.error("Failed to fetch project:", error)
        return NextResponse.json(
            { error: "Failed to fetch project" },
            { status: 500 }
        )
    }
}

// PATCH /api/admin/projects/[id] - Update project fields
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const updates = await request.json()

        // Only allow updating specific fields
        const allowedFields = [
            'topic', 'themeId', 'themeName', 'themeBackground',
            'themeText', 'themeAccent', 'themeHeading',
            'brandName', 'brandHandle', 'brandImage'
        ]

        const filteredUpdates: Record<string, any> = {}
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field]
            }
        }

        const project = await prisma.project.update({
            where: { id },
            data: filteredUpdates,
            include: {
                slides: {
                    orderBy: { index: "asc" }
                }
            }
        })

        return NextResponse.json({ project })
    } catch (error) {
        console.error("Failed to update project:", error)
        return NextResponse.json(
            { error: "Failed to update project" },
            { status: 500 }
        )
    }
}

// DELETE /api/admin/projects/[id] - Delete single project
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const project = await prisma.project.findUnique({
            where: { id },
            include: { slides: true },
        })

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            )
        }

        // Collect all potential images to delete
        const candidateImages = new Set<string>()

        if (project.brandImage?.startsWith("/uploads/")) {
            candidateImages.add(project.brandImage)
        }

        project.slides.forEach((slide) => {
            if (slide.backgroundImageUrl?.startsWith("/uploads/")) {
                candidateImages.add(slide.backgroundImageUrl)
            }
        })

        // Filter out images that are used elsewhere
        const imagesToDelete: string[] = []

        for (const imagePath of candidateImages) {
            // Check if used in any BrandKit
            const brandKitUsage = await prisma.brandKit.count({
                where: { imageUrl: imagePath }
            })

            if (brandKitUsage > 0) continue

            // Check if used in other Projects (as brandImage)
            const projectUsage = await prisma.project.count({
                where: {
                    brandImage: imagePath,
                    id: { not: id } // Exclude current project
                }
            })

            if (projectUsage > 0) continue

            // Check if used in other Slides (excluding slides of current project)
            const slideUsage = await prisma.slide.count({
                where: {
                    backgroundImageUrl: imagePath,
                    projectId: { not: id }
                }
            })

            if (slideUsage > 0) continue

            // If we get here, it's safe to delete
            imagesToDelete.push(imagePath)
        }

        // Delete images from filesystem
        for (const imagePath of imagesToDelete) {
            try {
                const fullPath = path.join(process.cwd(), "public", imagePath)
                await unlink(fullPath)
            } catch (e) {
                console.warn(`Failed to delete image ${imagePath}:`, e)
            }
        }

        await prisma.project.delete({
            where: { id }
        })

        return NextResponse.json({ success: true, deletedImages: imagesToDelete })
    } catch (error) {
        console.error("Failed to delete project:", error)
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        )
    }
}
