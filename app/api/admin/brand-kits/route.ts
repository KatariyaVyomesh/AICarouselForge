import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/admin/brand-kits - List all brand kits
export async function GET() {
    try {
        const brandKits = await prisma.brandKit.findMany({
            orderBy: { createdAt: "desc" },
        })

        const totalBrandKits = await prisma.brandKit.count()

        return NextResponse.json({
            brandKits,
            stats: {
                totalBrandKits
            }
        })
    } catch (error) {
        console.error("Failed to fetch brand kits:", error)
        return NextResponse.json(
            { error: "Failed to fetch brand kits" },
            { status: 500 }
        )
    }
}

// DELETE /api/admin/brand-kits - Bulk delete
export async function DELETE(request: NextRequest) {
    try {
        const { ids } = await request.json()

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: "No brand kit IDs provided" },
                { status: 400 }
            )
        }

        const result = await prisma.brandKit.deleteMany({
            where: {
                id: { in: ids }
            }
        })

        return NextResponse.json({
            success: true,
            deleted: result.count
        })
    } catch (error) {
        console.error("Failed to delete brand kits:", error)
        return NextResponse.json(
            { error: "Failed to delete brand kits" },
            { status: 500 }
        )
    }
}
