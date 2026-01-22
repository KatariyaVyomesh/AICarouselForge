import { type NextRequest, NextResponse } from "next/server"
import { saveImage } from "@/lib/save-image"
import { readFile } from "fs/promises"
import path from "path"

interface EnhanceImageRequest {
    imageUrl: string
    enhancementType?: "quality" | "lighting" | "clarity" | "custom"
    customPrompt?: string
    slideId?: string
}

/**
 * Get image buffer from various sources (URL, local path, base64)
 */
async function getImageBuffer(imageUrl: string): Promise<Buffer> {
    // Local file path
    if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("/frames/")) {
        const fullPath = path.join(process.cwd(), "public", imageUrl)
        return await readFile(fullPath)
    }

    // HTTP URL
    if (imageUrl.startsWith("http")) {
        const response = await fetch(imageUrl)
        const buffer = await response.arrayBuffer()
        return Buffer.from(buffer)
    }

    // Base64 data URI
    if (imageUrl.startsWith("data:")) {
        const base64 = imageUrl.split(",")[1]
        return Buffer.from(base64, "base64")
    }

    // Pure base64 string
    return Buffer.from(imageUrl, "base64")
}

/**
 * Generate enhancement prompt based on enhancement type
 */
function getEnhancementPrompt(type: string, customPrompt?: string): string {
    if (type === "custom" && customPrompt) {
        // Background replacement mode - preserve person, change background only
        return `🎯 CRITICAL TASK: BACKGROUND REPLACEMENT ONLY

PRESERVE THE PERSON 100%:
• Keep the person/subject EXACTLY as they are - face, body, clothing, pose, everything
• Do NOT modify, enhance, or change the person in ANY way
• The person should look IDENTICAL to the original image
• Keep the same lighting on the person
• Preserve all facial features, expressions, hair, skin tone exactly

CHANGE THE BACKGROUND ONLY:
• Replace or enhance ONLY the background/environment
• Create a professional, attractive background based on this theme:
  ${customPrompt}

• Make the background:
  - Professional and polished
  - Cinematic quality with proper lighting
  - Relevant to the theme/topic
  - Clean and not distracting
  - Blurred/bokeh if appropriate for depth

TECHNICAL REQUIREMENTS:
• The person should be the clear focus
• Background should complement the person, not compete with them
• Natural lighting transition between person and background
• Professional studio-quality aesthetic
• No text, words, or typography anywhere in the image

Think of this as: Keep the person from a video screenshot, but place them in a professional studio environment or themed background.`
    }

    const prompts: Record<string, string> = {
        quality: `Make subtle, natural improvements to this image quality:
• Gently increase sharpness and clarity (subtle enhancement only)
• Slightly improve detail without over-processing
• Subtly enhance colors - keep them natural, not oversaturated
• Remove minor noise if present, but preserve film grain and texture
• Maintain the EXACT same composition, subjects, and overall look
• Do NOT dramatically change the image - keep 95% of original character
• Keep faces and people EXACTLY the same - zero modifications
• The result should look like a slightly cleaner version of the original`,

        lighting: `Make gentle lighting improvements to this image:
• Subtly balance exposure (minor adjustments only)
• Gently soften harsh shadows if present
• Slightly improve contrast without making it dramatic
• Keep the original lighting mood and atmosphere
• Maintain the exact same composition and subjects
• Keep faces and people identical - only minor lighting tweaks
• Do NOT add dramatic studio lighting or change the scene
• Natural, subtle improvements only`,

        clarity: `Make minor clarity improvements to this image:
• Gently increase sharpness (subtle, not aggressive)
• Slightly enhance edge definition
• Reduce blur slightly if present
• Maintain exact color accuracy
• Keep all elements in their original positions
• Do NOT over-sharpen or create halos
• Preserve the natural softness of the original
• Subtle, natural-looking enhancement only`,
    }

    return prompts[type] || prompts.quality
}

export async function POST(request: NextRequest) {
    console.log(`\n[API] ========== IMAGE ENHANCEMENT REQUEST ==========`)
    const startTime = Date.now()

    try {
        const body: EnhanceImageRequest = await request.json()
        const { imageUrl, enhancementType = "quality", customPrompt, slideId } = body

        console.log(`[API] 🖼️ Image URL: ${imageUrl}`)
        console.log(`[API] ✨ Enhancement Type: ${enhancementType}`)
        if (customPrompt) console.log(`[API] 📝 Custom Prompt: ${customPrompt}`)

        // Validate input
        if (!imageUrl) {
            return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
        }

        // Get API key
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            console.error(`[API] ❌ OpenAI API key not configured`)
            return NextResponse.json(
                { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to .env.local" },
                { status: 500 }
            )
        }
        console.log(`[API] ✅ API key found`)

        // Get image buffer
        console.log(`[API] 📥 Fetching image...`)
        const imageBuffer = await getImageBuffer(imageUrl)
        console.log(`[API] ✅ Image loaded (${imageBuffer.byteLength} bytes)`)

        // Generate enhancement prompt
        const enhancementPrompt = getEnhancementPrompt(enhancementType, customPrompt)
        console.log(`[API] 📄 Enhancement Prompt:\n${enhancementPrompt}`)

        // Prepare form data for OpenAI API
        const formData = new FormData()
        formData.append("model", "gpt-image-1") // Using gpt-image-1 for edits
        formData.append("prompt", enhancementPrompt)
        formData.append("n", "1")
        formData.append("size", "1024x1024")

        // Add image as blob
        const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" })
        formData.append("image", blob, "image.png")
        console.log(`[API] ✅ Image added to request`)

        // Call OpenAI API
        console.log(`[API] 🚀 Calling OpenAI API for image enhancement...`)
        const response = await fetch("https://api.openai.com/v1/images/edits", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
        })

        console.log(`[API] 📡 OpenAI API response status: ${response.status}`)

        // Handle errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error(`[API] ❌ OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)

            if (response.status === 401) {
                return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
            }
            if (response.status === 429) {
                return NextResponse.json({ error: "Rate limit exceeded. Please wait and try again." }, { status: 429 })
            }
            if (response.status === 400 && (
                errorData.error?.code === "content_policy_violation" ||
                errorData.error?.message?.includes("safety system") ||
                errorData.error?.message?.includes("content policy")
            )) {
                return NextResponse.json({
                    error: "Image enhancement was blocked by content filters. Try a different image or prompt."
                }, { status: 400 })
            }

            // Try fallback to dall-e-3 (generations endpoint)
            if (errorData.error?.code === "model_not_found" || errorData.error?.message?.includes("Unknown parameter")) {
                console.log(`[API] ⚠️ Model not supported, trying DALL-E 3 fallback...`)

                // Note: DALL-E 3 doesn't support edits, so we can only do generations
                // This is a limitation - inform the user
                return NextResponse.json({
                    error: "Image editing is not available with the current API configuration. Please ensure you have access to the latest OpenAI image models."
                }, { status: 503 })
            }

            return NextResponse.json(
                { error: errorData.error?.message || "Failed to enhance image" },
                { status: response.status },
            )
        }

        // Parse response
        const data = await response.json()
        const enhancedUrl = data.data[0]?.url || data.data[0]?.b64_json

        if (!enhancedUrl) {
            console.error(`[API] ❌ No image returned from API`)
            return NextResponse.json({ error: "No enhanced image returned from API" }, { status: 500 })
        }

        // Save enhanced image
        const imageSource = enhancedUrl.startsWith("http") ? enhancedUrl : `data:image/png;base64,${enhancedUrl}`
        const filename = slideId ? `enhanced-slide-${slideId}` : `enhanced-${Date.now()}`
        console.log(`[API] 💾 Saving enhanced image as: ${filename}`)
        const localPath = await saveImage(imageSource, filename)

        const elapsed = Date.now() - startTime
        console.log(`[API] ✅ Image enhanced successfully in ${elapsed}ms`)
        console.log(`[API] 🔗 Saved to: ${localPath}`)
        console.log(`[API] ================================================\n`)

        return NextResponse.json({
            imageUrl: localPath,
            enhancementType,
            processingTime: elapsed
        })
    } catch (error) {
        console.error("[API] ❌ Image enhancement error:", error)
        console.log(`[API] ================================================\n`)

        const errorMessage = error instanceof Error ? error.message : "Failed to enhance image"
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
