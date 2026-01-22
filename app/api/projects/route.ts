import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { saveImage } from "@/lib/save-image"

// GET /api/projects - List recent projects
export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { updatedAt: "desc" },
            take: 20,
            include: {
                slides: {
                    orderBy: { index: "asc" },
                    take: 10,
                },
                _count: {
                    select: { slides: true }
                }
            },
        })

        return NextResponse.json({ projects })
    } catch (error) {
        console.error("Failed to fetch projects:", error)
        return NextResponse.json(
            { error: "Failed to fetch projects" },
            { status: 500 }
        )
    }
}

// POST /api/projects - Create or update a project
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, topic, slides, theme, brandName, brandHandle, brandImage, hostImage, guestImage, templateId } = body

        // Save brand image if it's a base64 string and not already a local path
        let savedBrandImage = brandImage
        if (brandImage && brandImage.startsWith("data:")) {
            savedBrandImage = await saveImage(brandImage, `brand-${Date.now()}`)
        }

        // Process slides - save images that are temporary URLs
        const processedSlides = await Promise.all(
            slides.map(async (slide: any, index: number) => {
                let backgroundImageUrl = slide.backgroundImageUrl

                // If it's a remote URL (not already saved locally), save it
                if (backgroundImageUrl && backgroundImageUrl.startsWith("http")) {
                    try {
                        backgroundImageUrl = await saveImage(
                            backgroundImageUrl,
                            `slide-${index}`
                        )
                    } catch (e) {
                        console.error(`Failed to save image for slide ${index}:`, e)
                        // Keep the original URL if save fails
                    }
                }

                return {
                    ...slide,
                    backgroundImageUrl,
                    index,
                }
            })
        )

        let project

        if (id) {
            // Update existing project
            // Delete existing slides and recreate them
            await prisma.slide.deleteMany({ where: { projectId: id } })

            project = await prisma.project.update({
                where: { id },
                data: {
                    topic,
                    themeId: theme.id,
                    themeName: theme.name,
                    themeBackground: theme.backgroundColor,
                    themeText: theme.textColor,
                    themeAccent: theme.accentColor,
                    themeHeading: theme.headingColor,
                    brandName,
                    brandHandle,
                    brandImage: savedBrandImage,
                    hostImage,
                    guestImage,
                    templateId,
                    slides: {
                        create: processedSlides.map((slide: any) => ({
                            index: slide.index,
                            heading: slide.heading,
                            body: slide.body,
                            bodyShort: slide.bodyShort || "",
                            bodyLong: slide.bodyLong || "",
                            suggestedImage: slide.suggested_image || "",
                            tone: slide.tone || "educational",
                            minTextVersion: slide.min_text_version || "",
                            maxTextVersion: slide.max_text_version || "",
                            backgroundImageUrl: slide.backgroundImageUrl,
                            layout: slide.layout,
                            useExtendedDescription: slide.useExtendedDescription || false,
                            useShortDescription: slide.useShortDescription !== undefined ? slide.useShortDescription : true,
                            customTexts: slide.customTexts ? JSON.stringify(slide.customTexts) : null,
                            entityFocus: slide.entityFocus || "none",
                        })),
                    },
                },
                include: { slides: { orderBy: { index: "asc" } } },
            })
        } else {
            // Create new project
            project = await prisma.project.create({
                data: {
                    topic,
                    themeId: theme.id,
                    themeName: theme.name,
                    themeBackground: theme.backgroundColor,
                    themeText: theme.textColor,
                    themeAccent: theme.accentColor,
                    themeHeading: theme.headingColor,
                    brandName,
                    brandHandle,
                    brandImage: savedBrandImage,
                    hostImage,
                    guestImage,
                    templateId,
                    slides: {
                        create: processedSlides.map((slide: any) => ({
                            index: slide.index,
                            heading: slide.heading,
                            body: slide.body,
                            bodyShort: slide.bodyShort || "",
                            bodyLong: slide.bodyLong || "",
                            suggestedImage: slide.suggested_image || "",
                            tone: slide.tone || "educational",
                            minTextVersion: slide.min_text_version || "",
                            maxTextVersion: slide.max_text_version || "",
                            backgroundImageUrl: slide.backgroundImageUrl,
                            layout: slide.layout,
                            useExtendedDescription: slide.useExtendedDescription || false,
                            useShortDescription: slide.useShortDescription !== undefined ? slide.useShortDescription : true,
                            customTexts: slide.customTexts ? JSON.stringify(slide.customTexts) : null,
                            entityFocus: slide.entityFocus || "none",
                        })),
                    },
                },
                include: { slides: { orderBy: { index: "asc" } } },
            })
        }

        return NextResponse.json({ project })
    } catch (error) {
        console.error("Failed to save project:", error)
        return NextResponse.json(
            { error: "Failed to save project" },
            { status: 500 }
        )
    }
}
