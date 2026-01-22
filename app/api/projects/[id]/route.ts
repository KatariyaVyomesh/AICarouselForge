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
            hostImage: project.hostImage,
            guestImage: project.guestImage,
            templateId: project.templateId,
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
                entityFocus: slide.entityFocus || "none",
                useExtendedDescription: slide.useExtendedDescription,
                useShortDescription: slide.useShortDescription,
                customTexts: slide.customTexts ? JSON.parse(slide.customTexts) : [],
                backgroundImagePosition: slide.backgroundImagePosition ? JSON.parse(slide.backgroundImagePosition) : { x: 50, y: 50 },
                backgroundImageScale: slide.backgroundImageScale || 100,
                backgroundImageRotation: slide.backgroundImageRotation || 0,
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
                // Remove leading slash for path.join if present, although path.join handles it usually,
                // treating it as relative to the root argument if we use join properly.
                // However, safeImage saves as "/uploads/...", so we join process.cwd, "public", imagePath.
                // path.join with absolute look-alike might be tricky on some OS, but standard node behavior:
                // path.join('/a', '/b') => '/a/b'.
                const fullPath = path.join(process.cwd(), "public", imagePath)
                await unlink(fullPath)
            } catch (e) {
                console.warn(`Failed to delete image ${imagePath}:`, e)
            }
        }

        // Delete project (cascades to slides)
        await prisma.project.delete({ where: { id } })

        return NextResponse.json({ success: true, deletedImages: imagesToDelete })
    } catch (error) {
        console.error("Failed to delete project:", error)
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        )
    }
}
