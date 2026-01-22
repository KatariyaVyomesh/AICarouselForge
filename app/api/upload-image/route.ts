import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { existsSync } from "fs"

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads")

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            )
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "File must be an image" },
                { status: 400 }
            )
        }

        // Ensure uploads directory exists
        if (!existsSync(UPLOADS_DIR)) {
            await mkdir(UPLOADS_DIR, { recursive: true })
        }

        // Generate unique filename
        const timestamp = Date.now()
        const ext = file.name.split(".").pop() || "png"
        const filename = `slide-${timestamp}-${timestamp + 1}.${ext}`
        const filePath = path.join(UPLOADS_DIR, filename)

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        // Return the public URL path
        const imageUrl = `/uploads/${filename}`

        return NextResponse.json({ imageUrl })
    } catch (error) {
        console.error("Error uploading image:", error)
        return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
        )
    }
}
