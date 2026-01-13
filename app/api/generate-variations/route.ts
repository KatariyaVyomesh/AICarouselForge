import { extractYouTubeTranscript, extractWebContent, extractVideoId, fetchVideoMetadata } from "@/lib/scrapers"

/**
 * Smart truncation that captures content from the ENTIRE video/article
 * instead of just the beginning. Splits into beginning, middle, and end sections.
 */
function smartTruncate(text: string, maxChars: number = 30000): string {
  if (text.length <= maxChars) return text;

  console.log(`[Truncation] Original length: ${text.length} chars, truncating to ~${maxChars} chars`);

  // Divide into 3 equal parts to capture content throughout the video
  const partSize = Math.floor(maxChars / 3);

  // Beginning section
  const beginning = text.slice(0, partSize);

  // Middle section (centered around the midpoint)
  const middleStart = Math.floor(text.length / 2) - Math.floor(partSize / 2);
  const middle = text.slice(middleStart, middleStart + partSize);

  // End section (last part of the content)
  const end = text.slice(-partSize);

  return `[BEGINNING OF CONTENT]\n${beginning}\n\n[MIDDLE OF CONTENT]\n${middle}\n\n[END OF CONTENT]\n${end}`;
}

export async function POST(request: Request) {
  try {
    const { topic, tone, slideCount, inputType, language } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json({ error: "OpenAI API key not configured. Please add OPENAI_API_KEY to .env.local" }, { status: 500 })
    }

    // Content Extraction Logic
    let contextContent = ""
    let videoMetadataText = ""
    let displayTopic = topic

    if (inputType === "youtube" || inputType === "link") {
      try {
        if (inputType === "youtube") {
          contextContent = await extractYouTubeTranscript(topic)
          displayTopic = "YouTube Video Summary"

          // NEW: Fetch metadata for entity extraction (Host/Guest names)
          try {
            const videoId = extractVideoId(topic)
            if (videoId) {
              const meta = await fetchVideoMetadata(videoId)
              // Append metadata to context or store separately? 
              // Better to store separately to explicitly label it in prompt
              videoMetadataText = meta
            }
          } catch (e) {
            console.warn("Failed to fetch video metadata for entity extraction", e)
          }
        } else {
          contextContent = await extractWebContent(topic)
          displayTopic = "Article Summary"
        }
      } catch (err) {
        console.error("Extraction failed:", err)
        return Response.json({ error: "Failed to extract content. Please ensure the video has captions/subtitles available." }, { status: 400 })
      }
    } else if (inputType === "text") {
      contextContent = topic // User pasted full text
      displayTopic = "Text Content Summary"
    }

    // CRITICAL: Validation to prevent hallucinations
    // If user wanted "YouTube" or "Link" but we got no content, DO NOT PROCEED.
    if ((inputType === "youtube" || inputType === "link") && (!contextContent || contextContent.length < 50)) {
      return Response.json({ error: "Could not retrieve transcript or content from this link. Please check the URL or try a video with clear captions." }, { status: 400 })
    }

    // DEBUG: Log Host/Guest context
    if (videoMetadataText) {
      console.log("\n====== [DEBUG] VIDEO METADATA FOR ENTITY EXTRACTION ======")
      console.log(videoMetadataText)
      console.log("=========================================================\n")
    }

    // DEBUG: Log content to ensure it's working
    if (contextContent) {
      console.log(`--- Extracted Content (Total Length: ${contextContent.length} chars) ---`);
      console.log("--- Preview (First 500 chars) ---");
      console.log(contextContent.slice(0, 500));
      console.log("-------------------------------------------");
    } else {
      console.log("--- No Context Content Extracted ---");
    }

    const systemPrompt = `You are a strict Content Converter and Editor.
    ${contextContent ? `
    SOURCE MATERIAL PROVIDED:
    You have been provided with a raw transcript or article text. 
    
    CRITICAL RULE: NO RANDOM DATA. NO HALLUCINATIONS.
    - You must ONLY use the information present in the source text below.
    - Do not invent statistics, quotes, or steps that are not in the text.
    - If the text is about "A", do NOT write about "B".
    
    YOUR GOAL: Refine the content and convert it into a structured carousel.
    1. READ the source text thoroughly.
    2. TRIM INTRO/OUTRO: Ignore all "Welcome back", "Subscribe", "channel updates", and fluff. Start directly with the core value.
    3. REMOVE FILLER: Filter out conversational stopwords ("um", "like", "you know") if any remain.
    4. EXTRACT PRECISE DATA: Focus on actionable steps, specific numbers, and hard facts.
    5. REPHRASE for clarity and brevity. Be direct. Avoid "In this slide we will discuss". Just say it.

    ` : "You are a helpful assistant."}
    
    ${videoMetadataText ? `
    VIDEO METADATA (Use this to identify speakers):
    "${videoMetadataText}"

    IMAGE GENERATION RULES (CRITICAL):
    - You must identifying the HOST and GUEST names from the metadata above if this is an interview/podcast.
    - In your 'suggested_image' descriptions, EXPLICITLY mention these names.
    - RATIO RULE: Use a 2:1 ratio favoring the HOST. 
      * For every 3 slides: 2 should feature the HOST, 1 should feature the GUEST.
      * The HOST is the main personality, so show them more often.
    - Example: "A cinematic photo of [Host Name] speaking..." instead of "A man speaking".
    - If the guest is famous, use their name. If not, describe their appearance based on the video context.
    ` : ""}
    
    You MUST respond with valid JSON only.
    
    Generate 3 DIFFERENT CONTENT VARIATIONS:
    1. "Direct & Actionable" - Punchy, clear, action-oriented.
    2. "Story-driven" - Narrative approach (if source allows).
    3. "Data & Authority" - Expert tone, focusing on hard facts/steps.

    CONTENT MASTERY RULES:
    - Headlines: use power words.
    - Body text: speak directly to "you".
    - bodyShort: concise summary (< 140 chars) for compact layouts.
    - bodyLong: detailed explanation for standard layouts (don't repeat bodyShort, expand on it).
    - No filler words in the output (clean, professional text).
    - If the topic implies a specific number of items (e.g. "5 tips") but the slide count is lower, you MUST merge multiple items onto single slides. Do NOT truncate the list.

    LANGUAGE RULES (CRITICAL):
    - OUTPUT LANGUAGE: ${language || 'English'}
    - You MUST generate all HEADINGS and BODY text in ${language || 'English'}.
    - The JSON KEYS (like "heading", "body", "variations", "slides") MUST remain in English.
    - Only the user-facing content values should be translated.

    LAYOUT SELECTION RULES:
    You MUST select a "layout" for each slide from this list: 
    [centered, split-left, split-right, card, minimal, bold, quote, numbered, gradient-text, sidebar, stacked, magazine, arch-left, arch-right, circle-frame, diagonal-split]
    
    - 'quote': Use for testimonials, quotes, or powerful statements.
    - 'numbered': Use for list items or steps (e.g. "Step 1", "3. Analysis").
    - 'split-left'/'split-right': Use when describing a distinct visual concept alongside text.
    - 'bold': Use for short, high-impact statements.
    - 'centered': Use for generic content.
    - 'diagonal-split': Use for the FIRST slide (Title slide).
    - 'card': Use for summary or final slide.
    
    REQUIRED JSON FORMAT:
    {
      "extracted_entities": { "host": "Name", "guest": "Name" },
      "variations": [
        {
          "id": "1",
          "style": "Direct & Actionable",
          "description": "Brief description",
          "data": {
            "topic": "${contextContent ? "Summary: [Insert specific video topic here]" : "topic string"}",
            "slides": [
              {
                "id": "slide-1",
                "layout": "diagonal-split", 
                "heading": "punchy headline",
                "body": "standard conversational body",
                "bodyShort": "concise version (< 140 chars)",
                "bodyLong": "detailed version with more depth",
                "suggested_image": "image description"
              }
            ]
          }
        }
      ]
    }`

    const userPrompt = contextContent
      ? `Create a ${slideCount}-slide carousel based on the SOURCE MATERIAL provided in the system prompt.
      
      SOURCE CONTEXT (Transcript/Article):
      "${smartTruncate(contextContent)}" 
      
      INSTRUCTIONS:
      - OUTPUT LANGUAGE: ${language || 'English'}
      - Extract the MOST IMPORTANT lessons.
      - Ignore any "welcome back to the channel" or "click subscribe" fluff.
      - Convert the spoken/written content into high-impact carousel slides.
      `
      : `Generate 3 IRRESISTIBLE content variations for a ${slideCount}-slide carousel about: "${topic}"
      
      TONE: ${tone || 'professional'}
      LANGUAGE: ${language || 'English'}
      
      Each variation needs exactly ${slideCount} slides.
      Ensure ALL key points/tips are covered, even if you must group them.`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        return Response.json({ error: "Invalid API key. Please check your OpenAI API key." }, { status: 401 })
      }
      if (response.status === 429) {
        return Response.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
      }
      if (response.status === 403) {
        return Response.json({ error: "Access denied. Your API key may not have access to GPT-4o." }, { status: 403 })
      }

      return Response.json(
        { error: errorData.error?.message || "Failed to generate content" },
        { status: response.status },
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      console.error("[v0] No content in response:", data)
      return Response.json({ error: "No content generated" }, { status: 500 })
    }

    if (data.choices[0]?.finish_reason === "length") {
      console.error("[v0] Response was truncated")
      return Response.json({ error: "Response was truncated. Try reducing slide count." }, { status: 500 })
    }

    try {
      const carouselData = JSON.parse(content)

      // DEBUG: Log the extracted entities (Host/Guest)
      if (carouselData.extracted_entities) {
        console.log("\n====== [DEBUG] AI IDENTIFIED ENTITIES ======")
        console.log("Host:", carouselData.extracted_entities.host || "Not identified")
        console.log("Guest:", carouselData.extracted_entities.guest || "Not identified")
        console.log("===========================================\n")
      }

      if (!carouselData.variations || !Array.isArray(carouselData.variations)) {
        console.error("[v0] Invalid structure:", carouselData)
        return Response.json({ error: "Invalid response structure" }, { status: 500 })
      }

      return Response.json(carouselData)
    } catch (parseError) {
      console.error("[v0] JSON parse error:", parseError)
      console.error("[v0] Raw content:", content.substring(0, 500))
      return Response.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Generation error:", error)

    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ error: "Failed to generate carousel content" }, { status: 500 })
  }
}
