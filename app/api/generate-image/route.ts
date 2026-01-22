import { type NextRequest, NextResponse } from "next/server"
import { saveImage } from "@/lib/save-image"
import { readFile } from "fs/promises"
import path from "path"
import sharp from "sharp"

interface PromptParams {
  topic: string
  slideHeading: string
  suggestedImage: string
  isFirstSlide: boolean
  slideIndex: number
  entityFocus: "host" | "guest" | "none"
  hasHostImage: boolean
  hasGuestImage: boolean
}

// Generate varied poses to avoid repetitive gestures
function getVariedPose(slideIndex: number, suggestedImage: string): string {
  const poseVariations = [
    { pose: "standing confidently with arms relaxed at sides", expression: "warm, welcoming smile" },
    { pose: "leaning slightly forward, engaged in conversation", expression: "attentive, interested look" },
    { pose: "sitting comfortably with hands resting on lap", expression: "thoughtful, reflective expression" },
    { pose: "standing with one hand in pocket, casual stance", expression: "relaxed, approachable demeanor" },
    { pose: "seated, leaning back slightly with arms on armrests", expression: "confident, assured look" },
    { pose: "walking pose, mid-stride, dynamic movement", expression: "determined, purposeful expression" },
    { pose: "arms crossed loosely, standing tall", expression: "contemplative, wise expression" },
    { pose: "seated at desk/table, hands clasped", expression: "focused, professional demeanor" },
    { pose: "standing with hand on chin, thinking pose", expression: "curious, analytical look" },
    { pose: "casual seated pose, one leg crossed over other", expression: "friendly, open expression" },
  ]

  // Use slide index to pick different pose (avoid always using index 0)
  const poseIndex = slideIndex % poseVariations.length
  const variation = poseVariations[poseIndex]

  return `
🎭 UNIQUE POSE FOR THIS SLIDE (Slide #${slideIndex + 1}):
• BODY POSE: ${variation.pose}
• FACIAL EXPRESSION: ${variation.expression}
• IMPORTANT: Use NATURAL GESTURES that match the content (e.g. speaking, explaining, thinking)
• Maintain professional eye contact or engagement
`
}

function generateImagePrompt(params: PromptParams): { userPrompt: string, fullPrompt: string } {
  const { topic, slideHeading, suggestedImage, isFirstSlide, slideIndex, entityFocus, hasHostImage, hasGuestImage } = params

  const hasBothImages = hasHostImage && hasGuestImage
  const showBothPeople = isFirstSlide && hasBothImages

  let userPrompt = `Create a premium, stunning image for: "${topic}"

Scene: ${slideHeading}
Visual: ${suggestedImage}

⚠️ CRITICAL: Generate ONLY visual imagery - absolutely NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY of any kind in the image.

🔴 IMPORTANT VISUAL REQUIREMENT:
• FOCUS ON SUBJECT - photorealistic portrait if a person is described
• KEEP BACKGROUND SIMPLE, CLUTTER-FREE, AND BLURRED (Bokeh effect)
• If including people, capture clear, realistic expressions and gestures
• Use professional lighting (Studio or Cinematic)
• Emphasize connection with the viewer through eye contact or engaging action
• Professional, high-end photography aesthetic
`

  if (showBothPeople) {
    userPrompt += `\nUsing uploaded HOST and GUEST images as inspiration only - focus on environment, not faces.`
  } else if (entityFocus === "host" && hasHostImage) {
    userPrompt += `\nUsing uploaded HOST image as inspiration only - focus on environment, not facial features.`
  } else if (entityFocus === "guest" && hasGuestImage) {
    userPrompt += `\nUsing uploaded GUEST image as inspiration only - focus on environment, not facial features.`
  } else if (hasHostImage) {
    userPrompt += `\nUsing uploaded HOST image as inspiration only - focus on environment, not facial features.`
  }

  userPrompt += `\n\nStyle: Ultra-high quality, cinematic lighting, professional photography aesthetic. TEXT-FREE AND FACE-OBSCURED IMAGE ONLY.`

  // Build full prompt based on context
  let fullPrompt = `MASTERPIECE QUALITY IMAGE for social media carousel.

🚫🚫🚫 ABSOLUTELY NO TEXT - IMAGE ONLY 🚫🚫🚫
Do NOT render any text, words, letters, numbers, titles, captions, labels, watermarks, or typography of ANY kind.
Generate HIGH-QUALITY, PHOTOREALISTIC HUMAN SUBJECTS if requested.

TOPIC: "${topic}"
SLIDE CONCEPT: "${slideHeading}"
VISUAL DIRECTION: "${suggestedImage}"

🎯 CREATIVE APPROACH - PORTRAIT FOCUSED:
1. SUBJECT AS FOCUS: Make the person the clear subject of the image
2. REALISTIC GESTURES: Capture specific body language matching the slide concept
   - Speaking passionately? Show hand gestures.
   - Thinking? Show hand on chin.
   - Welcoming? Show open arms.
3. SIMPLE BACKGROUND: Blurred office, studio, or stage background. Keep it non-distracting.
4. PHOTOREALISM: High skin texture detail, realistic lighting, natural pose.

`

  if (showBothPeople) {
    // FIRST SLIDE: Show environment inspired by both people
    fullPrompt += `=== TITLE SLIDE: PORTRAIT INSPIRED BY TWO PEOPLE ===
You have been provided with TWO PEOPLE images as reference for style.

🔴 CREATIVE INTERPRETATION - REALISTIC REPRODUCTION 🔴
Create a high-quality, photorealistic image of TWO PEOPLE interacting.
• Focus on realistic facial features and expressions
• Create a professional environment that suits both people
• Show an elegant space suitable for conversation
• Focus on connection and dialogue

CREATE A PROFESSIONAL ENVIRONMENT THAT:
1. Is suitable for podcast/meeting (studio style)
2. Has elegant, minimalist design
3. Has professional lighting and depth of field
4. Shows both people CLEARLY and REALISTICALLY
5. Emphasizes their interaction

⚠️ IMPORTANT: 
- Create realistic, identifiable human subjects based on descriptions
- Maintain consistent lighting and style
- Background should be blurred to keep focus on the people

`
  } else if ((entityFocus === "host" && hasHostImage) || (entityFocus !== "guest" && hasHostImage)) {
    // Single person: HOST - environment focus
    fullPrompt += `=== ENVIRONMENT INSPIRED BY HOST ===
You have been provided with a reference image of the HOST for STYLE INSPIRATION ONLY.

🔴 PORTRAIT-FOCUSED - REALISTIC REPRODUCTION 🔴
Create a high-quality, photorealistic portrait of the HOST.
• Focus on realistic facial features and expressions
• Capture GESTURES that match the "Slide Concept" (e.g. speaking passionately, pointing, thinking)
• Simple, uncluttered background (blurred office or stage)

CREATIVE INTERPRETATION:
• Use colors, lighting, style from reference image
• Create a professional yet engaging portrait
• Focus on the person's energy and presence
• Background should be simple/blurred to keep focus on the person

${getVariedPose(slideIndex, suggestedImage)}

⚠️ VISUAL APPROACH FOR PEOPLE:
- Show clear, mostly front-facing portrait
- Maintain direct eye contact or Engagement with content
- Use realistic skin textures and lighting
- Crop can be waist-up or mid-shot
- Focus on EXPRESSION and GESTURE

`
  } else if (entityFocus === "guest" && hasGuestImage) {
    // Single person: GUEST - environment focus
    fullPrompt += `=== ENVIRONMENT INSPIRED BY GUEST ===
You have been provided with a reference image of the GUEST for STYLE INSPIRATION ONLY.

🔴 PORTRAIT-FOCUSED - REALISTIC REPRODUCTION 🔴
Create a high-quality, photorealistic portrait of the GUEST.
• Focus on realistic facial features and expressions
• Capture GESTURES that match the "Slide Concept" (e.g. speaking passionately, pointing, thinking)
• Simple, uncluttered background (blurred office or stage)

CREATIVE INTERPRETATION:
• Use colors, lighting, style from reference image
• Create a professional yet engaging portrait
• Focus on the person's energy and presence
• Background should be simple/blurred to keep focus on the person

${getVariedPose(slideIndex, suggestedImage)}

⚠️ VISUAL APPROACH FOR PEOPLE:
- Show clear, mostly front-facing portrait
- Maintain direct eye contact or Engagement with content
- Use realistic skin textures and lighting
- Crop can be waist-up or mid-shot
- Focus on EXPRESSION and GESTURE

`
  }

  fullPrompt += `=== VISUAL STYLE - BACKGROUND FOCUSED ===
SETTING: Professional, elegant environment matching the slide's concept
• Adapt the setting to the VISUAL DIRECTION given above
• Create interesting, minimalist background
• Professional lighting with emphasis on atmosphere

COMPOSITION:
• Leave 40% of lower area empty (clean space for external text overlay)
• Environment as primary subject
• If people included: show from behind, silhouetted, or faces completely blurred
• Use creative angles that don't focus on faces

QUALITY:
• 8K resolution quality, hyper-detailed environments
• Professional color grading
• Cinematic lighting
• Clean, minimalist aesthetic

⛔ CRITICAL REQUIREMENTS ⛔
• Generate ZERO text, ZERO words, ZERO letters, ZERO numbers
• Do NOT show clear, identifiable human faces
• Focus on environment, setting, atmosphere over people
• Keep background simple, clean, elegant
• Create original composition that avoids facial focus
• Text will be overlaid separately - keep the image CLEAN and FACE-FREE`

  return { userPrompt, fullPrompt }
}

async function getImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith("/uploads/")) {
    const fullPath = path.join(process.cwd(), "public", imageUrl)
    return await readFile(fullPath)
  }

  if (imageUrl.startsWith("http")) {
    const response = await fetch(imageUrl)
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  }

  if (imageUrl.startsWith("data:")) {
    const base64 = imageUrl.split(",")[1]
    return Buffer.from(base64, "base64")
  }

  return Buffer.from(imageUrl, "base64")
}

async function stitchImagesSideBySide(hostImageUrl: string, guestImageUrl: string): Promise<Buffer> {
  console.log(`[API] 🔧 Stitching host and guest images side by side...`)

  const hostBuffer = await getImageBuffer(hostImageUrl)
  const guestBuffer = await getImageBuffer(guestImageUrl)

  const targetHeight = 512

  const hostResized = await sharp(hostBuffer)
    .resize({ height: targetHeight })
    .png()
    .toBuffer()

  const guestResized = await sharp(guestBuffer)
    .resize({ height: targetHeight })
    .png()
    .toBuffer()

  const hostMeta = await sharp(hostResized).metadata()
  const guestMeta = await sharp(guestResized).metadata()

  const totalWidth = (hostMeta.width || 512) + (guestMeta.width || 512)

  const combinedImage = await sharp({
    create: {
      width: totalWidth,
      height: targetHeight,
      channels: 4 as 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: hostResized, left: 0, top: 0 },
      { input: guestResized, left: hostMeta.width || 512, top: 0 }
    ])
    .png()
    .toBuffer()

  console.log(`[API] ✅ Images stitched successfully (${totalWidth}x${targetHeight})`)
  return combinedImage
}

export async function POST(request: NextRequest) {
  console.log(`\n[API] ========== IMAGE GENERATION REQUEST ==========`)
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { topic, slideHeading, suggestedImage, slideId, slideIndex, entityFocus, hostImage, guestImage } = body

    const isFirstSlide = slideIndex === 0
    const parsedEntityFocus = entityFocus || "none"

    console.log(`[API] 📝 Topic: ${topic}`)
    console.log(`[API] 📌 Slide Heading: ${slideHeading}`)
    console.log(`[API] 🖼️ Suggested Image: ${suggestedImage}`)
    console.log(`[API] 📍 Slide Index: ${slideIndex} ${isFirstSlide ? "(FIRST SLIDE)" : ""}`)
    console.log(`[API] 🎯 Entity Focus: ${parsedEntityFocus}`)
    if (hostImage) console.log(`[API] 👤 Host Image: ${hostImage}`)
    if (guestImage) console.log(`[API] 👥 Guest Image: ${guestImage}`)
    console.log(`[API] ⏰ Request received: ${new Date().toLocaleTimeString()}`)

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error(`[API] ❌ OpenAI API key not configured`)
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }
    console.log(`[API] ✅ API key found`)

    const hasHostImage = !!hostImage
    const hasGuestImage = !!guestImage
    const hasBothImages = hasHostImage && hasGuestImage
    const shouldShowBothPeople = isFirstSlide && hasBothImages

    const { userPrompt, fullPrompt } = generateImagePrompt({
      topic,
      slideHeading,
      suggestedImage,
      isFirstSlide,
      slideIndex: slideIndex || 0,
      entityFocus: parsedEntityFocus,
      hasHostImage,
      hasGuestImage
    })

    console.log(`[API] 📄 Full Prompt (first 500 chars):\n${fullPrompt.substring(0, 500)}...`)

    let response: Response

    // Determine which image(s) to use based on slide position and entityFocus
    if (shouldShowBothPeople) {
      // FIRST SLIDE: Stitch both images together
      console.log(`[API] 🎭 FIRST SLIDE: Using combined Host + Guest image for environment inspiration`)

      const combinedImageBuffer = await stitchImagesSideBySide(hostImage, guestImage)

      const formData = new FormData()
      formData.append("model", "gpt-image-1")
      formData.append("prompt", fullPrompt)
      formData.append("n", "1")
      formData.append("size", "1024x1024")

      const blob = new Blob([new Uint8Array(combinedImageBuffer)], { type: "image/png" })
      formData.append("image", blob, "combined.png")
      console.log(`[API] ✅ Combined image added as style reference only`)

      console.log(`[API] 🚀 Calling OpenAI API (environment-focused, combined reference)...`)
      response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      })
    } else if ((parsedEntityFocus === "host" && hasHostImage) || (parsedEntityFocus === "none" && hasHostImage && !hasGuestImage)) {
      // Use HOST image only for environment inspiration
      console.log(`[API] 🎭 Using HOST image for environment inspiration`)

      const imageBuffer = await getImageBuffer(hostImage)

      const formData = new FormData()
      formData.append("model", "gpt-image-1")
      formData.append("prompt", fullPrompt)
      formData.append("n", "1")
      formData.append("size", "1024x1024")

      const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" })
      formData.append("image", blob, "host.png")
      console.log(`[API] ✅ Host image added as style reference only`)

      console.log(`[API] 🚀 Calling OpenAI API (environment-focused, host reference)...`)
      response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      })
    } else if (parsedEntityFocus === "guest" && hasGuestImage) {
      // Use GUEST image only for environment inspiration
      console.log(`[API] 🎭 Using GUEST image for environment inspiration`)

      const imageBuffer = await getImageBuffer(guestImage)

      const formData = new FormData()
      formData.append("model", "gpt-image-1")
      formData.append("prompt", fullPrompt)
      formData.append("n", "1")
      formData.append("size", "1024x1024")

      const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" })
      formData.append("image", blob, "guest.png")
      console.log(`[API] ✅ Guest image added as style reference only`)

      console.log(`[API] 🚀 Calling OpenAI API (environment-focused, guest reference)...`)
      response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      })
    } else if (hasHostImage) {
      // Default to HOST if available (fallback)
      console.log(`[API] 🎭 Defaulting to HOST image for environment inspiration (fallback)`)

      const imageBuffer = await getImageBuffer(hostImage)

      const formData = new FormData()
      formData.append("model", "gpt-image-1")
      formData.append("prompt", fullPrompt)
      formData.append("n", "1")
      formData.append("size", "1024x1024")

      const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" })
      formData.append("image", blob, "host.png")

      console.log(`[API] 🚀 Calling OpenAI API (environment-focused, host fallback)...`)
      response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      })
    } else if (hasGuestImage) {
      // Default to GUEST if only that's available
      console.log(`[API] 🎭 Defaulting to GUEST image for environment inspiration (only available)`)

      const imageBuffer = await getImageBuffer(guestImage)

      const formData = new FormData()
      formData.append("model", "gpt-image-1")
      formData.append("prompt", fullPrompt)
      formData.append("n", "1")
      formData.append("size", "1024x1024")

      const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" })
      formData.append("image", blob, "guest.png")

      console.log(`[API] 🚀 Calling OpenAI API (environment-focused, guest only)...`)
      response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      })
    } else {
      // No face images - standard generation with background focus
      console.log(`[API] 🚀 Standard environment-focused generation (no face images)...`)

      response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
          quality: "high",
        }),
      })
    }

    console.log(`[API] 📡 OpenAI API response status: ${response.status}`)

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
          error: "Image generation was blocked by content filters. Try modifying the image prompt to be more generic."
        }, { status: 400 })
      }

      // Fallback to dall-e-3 with environment focus
      if (errorData.error?.code === "model_not_found" || errorData.error?.message?.includes("Unknown parameter")) {
        console.log(`[API] ⚠️ Falling back to dall-e-3...`)
        const fallbackResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: fullPrompt,
            n: 1,
            size: "1024x1024",
            quality: "hd",
          }),
        })

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          const tempUrl = fallbackData.data[0].url
          const filename = slideId ? `slide-${slideId}` : `slide-${Date.now()}`
          const localPath = await saveImage(tempUrl, filename)
          console.log(`[API] ✅ Image generated (fallback) in ${Date.now() - startTime}ms`)
          return NextResponse.json({ imageUrl: localPath, generatedPrompt: userPrompt })
        }
      }

      return NextResponse.json(
        { error: errorData.error?.message || "Failed to generate image" },
        { status: response.status },
      )
    }

    const data = await response.json()
    const tempUrl = data.data[0]?.url || data.data[0]?.b64_json

    if (!tempUrl) {
      console.error(`[API] ❌ No image returned from API`)
      return NextResponse.json({ error: "No image returned from API" }, { status: 500 })
    }

    const imageSource = tempUrl.startsWith("http") ? tempUrl : `data:image/png;base64,${tempUrl}`
    const filename = slideId ? `slide-${slideId}` : `slide-${Date.now()}`
    console.log(`[API] 💾 Saving image as: ${filename}`)
    const localPath = await saveImage(imageSource, filename)

    const elapsed = Date.now() - startTime
    console.log(`[API] ✅ Image generated successfully in ${elapsed}ms`)
    console.log(`[API] 🔗 Saved to: ${localPath}`)
    console.log(`[API] ================================================\n`)

    return NextResponse.json({ imageUrl: localPath, generatedPrompt: userPrompt })
  } catch (error) {
    console.error("[API] ❌ Image generation error:", error)
    console.log(`[API] ================================================\n`)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}