import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { readFile } from "fs/promises"
import { existsSync } from "fs"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await params

        // Validate filename to prevent directory traversal
        if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
            return new NextResponse("Invalid filename", { status: 400 })
        }

        const uploadsDir = path.join(process.cwd(), "public", "uploads")
        const filePath = path.join(uploadsDir, filename)

        if (!existsSync(filePath)) {
            return new NextResponse("File not found", { status: 404 })
        }

        const fileBuffer = await readFile(filePath)

        // Determine content type based on extension
        const ext = path.extname(filename).toLowerCase()
        let contentType = "application/octet-stream"

        if (ext === ".png") contentType = "image/png"
        else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg"
        else if (ext === ".gif") contentType = "image/gif"
        else if (ext === ".webp") contentType = "image/webp"
        else if (ext === ".svg") contentType = "image/svg+xml"

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        })
    } catch (error) {
        console.error("Error serving file:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
