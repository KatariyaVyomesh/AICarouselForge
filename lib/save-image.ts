import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { existsSync } from "fs"

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads")

/**
 * Save an image from a URL or base64 string to the uploads folder
 * Returns the public URL path to the saved image
 */
export async function saveImage(
    source: string,
    filename: string
): Promise<string> {
    // Ensure uploads directory exists
    if (!existsSync(UPLOADS_DIR)) {
        await mkdir(UPLOADS_DIR, { recursive: true })
    }

    const ext = ".png"
    const uniqueFilename = `${filename}-${Date.now()}${ext}`
    const filePath = path.join(UPLOADS_DIR, uniqueFilename)

    try {
        let buffer: Buffer

        if (source.startsWith("data:")) {
            // Base64 data URL
            const base64Data = source.split(",")[1]
            buffer = Buffer.from(base64Data, "base64")
        } else if (source.startsWith("http")) {
            // Remote URL - download it
            const response = await fetch(source)
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`)
            }
            const arrayBuffer = await response.arrayBuffer()
            buffer = Buffer.from(arrayBuffer)
        } else {
            throw new Error("Invalid image source: must be URL or base64 data URI")
        }

        await writeFile(filePath, buffer)

        // Return the public URL path
        return `/uploads/${uniqueFilename}`
    } catch (error) {
        console.error("Error saving image:", error)
        throw error
    }
}

/**
 * Save multiple images and return their new URLs
 */
export async function saveImages(
    images: { source: string; filename: string }[]
): Promise<string[]> {
    const results = await Promise.all(
        images.map(({ source, filename }) => saveImage(source, filename))
    )
    return results
}
