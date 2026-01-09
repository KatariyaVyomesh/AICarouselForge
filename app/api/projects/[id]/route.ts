import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { unlink } from "fs/promises"
import path from "path"

// GET /api/projects/[id] - Get a single project with all slides
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                slides: {
                    orderBy: { index: "asc" },
                },
            },
        })

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            )
        }

        // Transform to match the app's data structure
        const carouselData = {
            id: project.id,
            topic: project.topic,
            theme: {
                id: project.themeId,
                name: project.themeName,
                backgroundColor: project.themeBackground,
                textColor: project.themeText,
                accentColor: project.themeAccent,
                headingColor: project.themeHeading,
            },
            brandName: project.brandName,
            brandHandle: project.brandHandle,
            brandImage: project.brandImage,
            slides: project.slides.map((slide) => ({
                id: slide.id,
                heading: slide.heading,
                body: slide.body,
                bodyShort: slide.bodyShort,
                bodyLong: slide.bodyLong,
                suggested_image: slide.suggestedImage,
                tone: slide.tone,
                min_text_version: slide.minTextVersion,
                max_text_version: slide.maxTextVersion,
                backgroundImageUrl: slide.backgroundImageUrl,
                layout: slide.layout,
                useExtendedDescription: slide.useExtendedDescription,
                customTexts: slide.customTexts ? JSON.parse(slide.customTexts) : [],
            })),
        }

        return NextResponse.json({ project: carouselData })
    } catch (error) {
        console.error("Failed to fetch project:", error)
        return NextResponse.json(
            { error: "Failed to fetch project" },
            { status: 500 }
        )
    }
}

// DELETE /api/projects/[id] - Delete a project and its images
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params

        // Fetch project to get image paths before deletion
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

        // Delete associated image files
        const imagesToDelete: string[] = []

        if (project.brandImage?.startsWith("/uploads/")) {
            imagesToDelete.push(project.brandImage)
        }

        project.slides.forEach((slide) => {
            if (slide.backgroundImageUrl?.startsWith("/uploads/")) {
                imagesToDelete.push(slide.backgroundImageUrl)
            }
        })

        // Delete images from filesystem
        for (const imagePath of imagesToDelete) {
            try {
                const fullPath = path.join(process.cwd(), "public", imagePath)
                await unlink(fullPath)
            } catch (e) {
                console.warn(`Failed to delete image ${imagePath}:`, e)
            }
        }

        // Delete project (cascades to slides)
        await prisma.project.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete project:", error)
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        )
    }
}
