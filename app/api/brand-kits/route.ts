
import { prisma } from "@/lib/db"

export async function GET() {
    try {
        const brandKits = await prisma.brandKit.findMany({
            orderBy: { createdAt: "desc" },
        })
        return Response.json(brandKits)
    } catch (error) {
        return Response.json({ error: "Failed to fetch brand kits" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { name, website, handle, imageUrl, colors, fonts } = body

        const brandKit = await prisma.brandKit.create({
            data: {
                name,
                website,
                handle,
                imageUrl,
                colors: JSON.stringify(colors),
                fonts: JSON.stringify(fonts),
            },
        })

        return Response.json(brandKit)
    } catch (error) {
        console.error("Failed to create brand kit:", error)
        return Response.json({ error: error instanceof Error ? error.message : "Failed to create brand kit" }, { status: 500 })
    }
}
