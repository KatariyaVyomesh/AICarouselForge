
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "File must be an image" },
                { status: 400 }
            );
        }

        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "");
        const uniqueFilename = `${Date.now()}-${filename}`;

        const uploadsDir = path.join(process.cwd(), "public", "uploads");

        // Ensure uploads directory exists
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, uniqueFilename);
        await writeFile(filePath, buffer);

        return NextResponse.json({
            url: `/uploads/${uniqueFilename}`,
            filename: uniqueFilename
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
}
