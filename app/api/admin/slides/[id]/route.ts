import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// PATCH /api/admin/slides/[id] - Update slide fields
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const updates = await request.json()

        // Only allow updating specific fields
        const allowedFields = [
            'heading', 'body', 'bodyShort', 'bodyLong',
            'suggestedImage', 'minTextVersion', 'maxTextVersion',
            'backgroundImageUrl', 'layout', 'useExtendedDescription',
            'customTexts', 'index'
        ]

        const filteredUpdates: Record<string, any> = {}
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field]
            }
        }

        // Handle customTexts JSON stringification
        if (filteredUpdates.customTexts && typeof filteredUpdates.customTexts === 'object') {
            filteredUpdates.customTexts = JSON.stringify(filteredUpdates.customTexts)
        }

        const slide = await prisma.slide.update({
            where: { id },
            data: filteredUpdates
        })

        return NextResponse.json({ slide })
    } catch (error) {
        console.error("Failed to update slide:", error)
        return NextResponse.json(
            { error: "Failed to update slide" },
            { status: 500 }
        )
    }
}

// DELETE /api/admin/slides/[id] - Delete single slide
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        await prisma.slide.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete slide:", error)
        return NextResponse.json(
            { error: "Failed to delete slide" },
            { status: 500 }
        )
    }
}
