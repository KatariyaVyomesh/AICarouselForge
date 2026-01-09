import { type NextRequest, NextResponse } from "next/server"
import { saveImage } from "@/lib/save-image"

function generateImagePrompt(topic: string, slideHeading: string, suggestedImage: string): { userPrompt: string, fullPrompt: string } {
  // This is the clean, user-visible prompt - just the meaningful content
  const userPrompt = `Create a premium, stunning image for: "${topic}"

Scene: ${slideHeading}
Visual: ${suggestedImage}

Style: Ultra-high quality, cinematic lighting, professional photography aesthetic. Leave center area clear for text overlay. Rich colors, depth with bokeh effect.`

  // This is the full technical prompt sent to the AI
  const fullPrompt = `MASTERPIECE QUALITY IMAGE for social media carousel.

TOPIC: "${topic}"
SLIDE CONCEPT: "${slideHeading}"
VISUAL DIRECTION: "${suggestedImage}"

=== CORE VISUAL STYLE ===
Create a STUNNING, ULTRA-PREMIUM image with these exact specifications:

RENDERING STYLE: High-end lifestyle photography - Editorial quality, magazine-worthy, premium brand aesthetic

LIGHTING & ATMOSPHERE:
• Cinematic rim lighting with soft key light
• Gentle volumetric haze for depth and atmosphere
• Golden hour warmth OR cool professional tones (based on topic mood)
• Subtle lens flare or light bloom for premium feel
• Soft shadows with gradient falloff

COLOR PALETTE:
• Rich, saturated colors with professional color grading
• Cohesive palette: 2-3 dominant colors + 1-2 accent colors
• Matte finishes on surfaces for modern aesthetic
• Deep blacks and clean whites for contrast

=== COMPOSITION REQUIREMENTS ===
LAYOUT:
• Leave 60% of center area CLEAR for text overlay
• Place visual elements at edges, corners, or background
• Create depth with foreground blur (bokeh) and background elements
• Use rule of thirds for element placement

HUMAN SUBJECTS (if applicable):
• Natural, candid expressions - NOT stock photo poses
• Diverse representation
• Professional styling and grooming
• Emotion that matches the topic mood

=== ABSOLUTE RESTRICTIONS ===
NEVER INCLUDE:
❌ ANY text, letters, numbers, words, typography
❌ Logos, watermarks, brand marks, icons
❌ Wireframes, technical diagrams, flowcharts
❌ Messy abstract patterns in the center
❌ Low quality, grainy, or blurry elements
❌ Cluttered or busy compositions
❌ Generic stock photo aesthetic

=== QUALITY STANDARDS ===
• 8K resolution quality, hyper-detailed
• Professional retouching and color correction
• Award-winning photography quality
• Suitable for premium brand marketing`

  return { userPrompt, fullPrompt }
}

export async function POST(request: NextRequest) {
  console.log(`\n[API] ========== IMAGE GENERATION REQUEST ==========`)
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { topic, slideHeading, suggestedImage, slideId } = body

    // Log incoming request details
    console.log(`[API] 📝 Topic: ${topic}`)
    console.log(`[API] 📌 Slide Heading: ${slideHeading}`)
    console.log(`[API] 🖼️ Suggested Image: ${suggestedImage}`)
    console.log(`[API] 🆔 Slide ID: ${slideId || 'auto-generated'}`)
    console.log(`[API] ⏰ Request received: ${new Date().toLocaleTimeString()}`)

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error(`[API] ❌ OpenAI API key not configured`)
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }
    console.log(`[API] ✅ API key found`)

    const { userPrompt, fullPrompt } = generateImagePrompt(topic, slideHeading, suggestedImage)
    console.log(`[API] 📄 User Prompt:\n${userPrompt}`)

    // Call OpenAI's gpt-image-1 for image generation
    console.log(`[API] 🚀 Calling OpenAI API (model: gpt-image-1)...`)
    const response = await fetch("https://api.openai.com/v1/images/generations", {
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
    console.log(`[API] 📡 OpenAI API response status: ${response.status}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`[API] ❌ OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)

      if (response.status === 401) {
        console.error(`[API] ❌ Invalid API key`)
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
      }
      if (response.status === 429) {
        console.error(`[API] ❌ Rate limit exceeded`)
        return NextResponse.json({ error: "Rate limit exceeded. Please wait and try again." }, { status: 429 })
      }
      if (errorData.error?.code === "model_not_found") {
        // Fallback to dall-e-3 if gpt-image-1 is not available
        console.log(`[API] ⚠️ gpt-image-1 not available, falling back to dall-e-3...`)
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
        console.log(`[API] 📡 Fallback API response status: ${fallbackResponse.status}`)

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          const tempUrl = fallbackData.data[0].url

          // Save the image locally
          const filename = slideId ? `slide-${slideId}` : `slide-${Date.now()}`
          console.log(`[API] 💾 Saving fallback image as: ${filename}`)
          const localPath = await saveImage(tempUrl, filename)

          const elapsed = Date.now() - startTime
          console.log(`[API] ✅ Image generated successfully (fallback) in ${elapsed}ms`)
          console.log(`[API] 🔗 Saved to: ${localPath}`)
          console.log(`[API] ================================================\n`)

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

    // Save the image locally immediately
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
