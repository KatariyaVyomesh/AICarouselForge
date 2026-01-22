import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// DELETE /api/admin/brand-kits/[id]
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        await prisma.brandKit.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete brand kit:", error)
        return NextResponse.json(
            { error: "Failed to delete brand kit" },
            { status: 500 }
        )
    }
}

// PATCH /api/admin/brand-kits/[id]
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const body = await request.json()
        const { name, handle, website } = body // only basic details for quick edit

        const brandKit = await prisma.brandKit.update({
            where: { id: params.id },
            data: {
                name,
                handle,
                website
            }
        })

        return NextResponse.json({ brandKit })
    } catch (error) {
        console.error("Failed to update brand kit:", error)
        return NextResponse.json(
            { error: "Failed to update brand kit" },
            { status: 500 }
        )
    }
}
