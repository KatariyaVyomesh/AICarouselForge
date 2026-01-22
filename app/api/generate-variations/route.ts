import { extractYouTubeTranscript, extractWebContent, extractVideoId, TranscriptSegment } from "@/lib/scrapers"
import { extractVideoFrames, extractFramesFromRanges, FrameData } from "@/lib/videoFrameExtractor"

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
    const { topic, tone, slideCount, inputType, language, hostImage, guestImage } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json({ error: "OpenAI API key not configured. Please add OPENAI_API_KEY to .env.local" }, { status: 500 })
    }

    // Content Extraction Logic
    let contextContent = ""
    let videoMetadataText = ""
    let displayTopic = topic
    let detectedCaptionLanguage = language || "English" // Start with user-selected language, but may override for YouTube
    let transcriptSegments: TranscriptSegment[] = [] // Store for frame matching

    if (inputType === "youtube" || inputType === "link") {
      try {
        if (inputType === "youtube") {
          // Extract transcript WITH timestamps for frame matching
          const transcriptResult = await extractYouTubeTranscript(topic, true)
          // Rebuild contextContent with timestamps if segments exist
          if (transcriptResult.segments && transcriptResult.segments.length > 0) {
            contextContent = transcriptResult.segments.map(s => {
              const m = Math.floor(s.startTime / 60);
              const secs = Math.floor(s.startTime % 60);
              const ts = `${m.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
              // Include simplified text with timestamp
              return `[${ts}] ${s.text}`;
            }).join('\n');
          } else {
            contextContent = transcriptResult.text
          }
          transcriptSegments = transcriptResult.segments || []
          displayTopic = "YouTube Video Summary"

          // Use detected caption language for AI output if it's different from English
          // Map common language codes to full language names
          const languageMap: Record<string, string> = {
            'hi': 'Hindi',
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'pt': 'Portuguese',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'ru': 'Russian',
            'it': 'Italian',
            'nl': 'Dutch',
            'ta': 'Tamil',
            'te': 'Telugu',
            'bn': 'Bengali',
            'mr': 'Marathi',
            'gu': 'Gujarati',
            'kn': 'Kannada',
            'ml': 'Malayalam',
            'pa': 'Punjabi',
            'ur': 'Urdu',
          }

          // Extract the base language code (e.g., 'hi' from 'hi-IN')
          const baseLangCode = transcriptResult.detectedLanguage.split('-')[0].toLowerCase()
          detectedCaptionLanguage = languageMap[baseLangCode] || language || 'English'

          console.log(`[API] Detected caption language: ${transcriptResult.detectedLanguage} -> Output language: ${detectedCaptionLanguage}`)

          // Metadata extraction disabled - using only frames for YouTube videos
          // // NEW: Fetch metadata for entity extraction (Host/Guest names)
          // try {
          //   const videoId = extractVideoId(topic)
          //   if (videoId) {
          //     const meta = await fetchVideoMetadata(videoId)
          //     videoMetadataText = meta
          //   }
          // } catch (e) {
          //   console.warn("Failed to fetch video metadata for entity extraction", e)
          // }
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

    DESIGN RULES FOR VIDEO FRAMES (CRITICAL):
    - Extracted video frames will be used as FULL-BLEED backgrounds for slides
    - DO NOT suggest AI-generated imagery - the actual video frames will be used
    - In 'suggested_image', describe what TEXT OVERLAY and VISUAL TREATMENT should be applied:
      * Subtle dark gradients (e.g., "bottom-to-top dark gradient for text readability")
      * Blur effects (e.g., "slight background blur with sharp text")
      * Color overlays (e.g., "semi-transparent black overlay, 40% opacity")
    - Ensure strong visual hierarchy: BOLD headlines, short punchy text, minimal clutter
    - Keep text always clearly readable against the video frame
    - Design for Instagram/LinkedIn carousel format (square 1:1 ratio)
    - One slide = one video frame, visually balanced composition
    
    QUOTE-TO-FRAME EXACT MAPPING (CRITICAL):
    - You must output the "timestamp_seconds" for the quote used in each slide.
    - Select quotes that are powerful and identifiable in the provided timestamped text.
    - Format: "timestamp_seconds": 123
    ` : ""}
    
    NARRATIVE SEGMENTATION RULES (CRITICAL):
    - Divide the content into ${slideCount} sequential segments.
    - PRIORITIZE IMPORTANT CONTENT: Start with the most valuable/impactful information first.
    - For each slide, provide a "segment" object with "start" and "end" (in seconds).
    - Use the provided transcript timestamps [MM:SS] to determine exact boundaries.
    - Each segment represents one key point from the video.
    - Format: "segment": { "start": 10.5, "end": 20.0 }
    
    You MUST respond with valid JSON only.
    
    Generate 3 DIFFERENT CONTENT VARIATIONS:
    1. "Direct & Actionable" - Punchy, clear, action-oriented.
    2. "Story-driven" - Narrative approach (if source allows).
    3. "Data & Authority" - Expert tone, focusing on hard facts/steps.

    CONTENT MASTERY RULES:
    - Headlines: use power words.
    - Body text: speak directly to "you".
    - bodyShort: concise summary (< 140 chars) for compact layouts.
    - bodyLong: brief expanded explanation for standard layouts (~50 words max, don't repeat bodyShort).
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
                "heading": "punchy headline",
                "body": "standard conversational body",
                "bodyShort": "concise version (< 140 chars)",
                "bodyLong": "detailed version with more depth",
                "segment": { "start": 120.0, "end": 135.0 },
                "suggested_image": "FOR YOUTUBE: describe overlay/gradient treatment. FOR OTHER INPUTS: describe image to generate",
                "entityFocus": "host" 
              }
            ]
          }
        }
      ]
    }

    ENTITY FOCUS RULES:
    - You MUST add an "entityFocus" field to each slide: "host" | "guest" | "none".
    - "host": Use when the slide represents the main speaker or host. ALWAYS use for the Title slide if it's a podcast.
    - "guest": Use when the slide quotes the guest or is about the guest.
    - "none": Use for general concepts, objects, or when no specific person needs to be shown.
    - Default to "none" if unsure.`

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

      // Inject user-provided images into the extracted entities if they exist
      if (hostImage || guestImage) {
        carouselData.extracted_entities = {
          ...carouselData.extracted_entities,
          hostImage: hostImage || null,
          guestImage: guestImage || null
        }
      }

      // POST-PROCESSING: Enforce entityFocus logic
      if (carouselData.variations) {
        carouselData.variations.forEach((variation: any) => {
          if (variation.data?.slides) {
            variation.data.slides.forEach((slide: any, index: number) => {
              // Rule 1: First slide (Title) is ALWAYS Host for podcasts if not specified
              if (index === 0 && (!slide.entityFocus || slide.entityFocus === "none")) {
                slide.entityFocus = "host"
              }

              // Rule 2: Fallback - if no entityFocus, default to "none"
              if (!slide.entityFocus) {
                slide.entityFocus = "none"
              }
            })
          }
        })
      }


      if (!carouselData.variations || !Array.isArray(carouselData.variations)) {
        console.error("[v0] Invalid structure:", carouselData)
        return Response.json({ error: "Invalid response structure" }, { status: 500 })
      }

      // NEW: Frame Extraction for YouTube videos (MEDIAN MODE)
      if (inputType === "youtube" && transcriptSegments.length > 0) {
        try {
          const videoId = extractVideoId(topic)
          if (videoId) {
            console.log("\n╔══════════════════════════════════════════════════════╗")
            console.log("║       🎬 FRAME EXTRACTION (MEDIAN MODE)              ║")
            console.log("╚══════════════════════════════════════════════════════╝")

            // Collect ranges from slides
            const allSlides = carouselData.variations.flatMap((v: any) => v.data?.slides || [])
            const rangeSlides: any[] = []
            const rangesToScan: any[] = []

            allSlides.forEach((slide: any, idx: number) => {
              if (slide.segment && typeof slide.segment.start === 'number' && typeof slide.segment.end === 'number') {
                // Assign a temporary index to track this slide
                slide._tempIndex = idx
                rangeSlides.push(slide)
                rangesToScan.push({
                  start: slide.segment.start,
                  end: slide.segment.end,
                  index: idx
                })
              }
            })

            if (rangesToScan.length > 0) {
              console.log(`  📍 Found ${rangesToScan.length} slides with time segments`)
              console.log(`  📥 Downloading video and extracting median frames...\n`)

              // Call the Median Frame Extractor
              const rangeResult = await extractFramesFromRanges(topic, videoId, rangesToScan)

              if (rangeResult.success) {
                // Map frames back to slides
                rangeSlides.forEach((slide: any) => {
                  // Find the frame extracted for this specific slide index
                  const frame = rangeResult.frames.find(f => f.slideIndex === slide._tempIndex)

                  if (frame && frame.status === 'VALID' && frame.url) {
                    slide.backgroundImageUrl = frame.url
                    slide.validatedFrame = frame
                  } else if (frame && frame.status === 'SKIP_FRAME') {
                    slide.backgroundImageUrl = null
                    slide.validatedFrame = frame
                    console.log(`[RangeMode] ⚠ Slide #${slide._tempIndex + 1}: SKIP (${frame.reason})`)
                  }
                })
              }
            } else {
              console.log("[FrameExtraction] No segment ranges provided by AI. Using legacy even distribution.")
              // LEGACY FALLBACK
              const frameResult = await extractVideoFrames(topic, videoId)
              if (frameResult.success && frameResult.frames.length > 0) {
                // ... (same as before) ...
                for (const variation of carouselData.variations) {
                  if (variation.data?.slides) {
                    const slides = variation.data.slides
                    const totalFrames = frameResult.frames.length
                    const totalSlides = slides.length
                    slides.forEach((slide: any, slideIndex: number) => {
                      const frameIndex = Math.floor((slideIndex / totalSlides) * totalFrames)
                      const selectedFrame = frameResult.frames[Math.min(frameIndex, totalFrames - 1)]
                      slide.backgroundImageUrl = selectedFrame.url
                      slide.extractedFrame = selectedFrame
                    })
                  }
                }
              }
            }
            console.log("==========================================\n")
          }
        } catch (frameError) {
          console.error("[FrameExtraction] Failed to extract/distribute frames:", frameError)
        }
      }


      // PROFESSIONAL SUMMARY LOGGING
      if (carouselData.variations && carouselData.variations.length > 0) {
        console.log("\n")
        console.log("╔════════════════════════════════════════════════════════════════════════════════╗")
        console.log("║                           📊 FINAL CAROUSEL PLAN                              ║")
        console.log("╠═══════╦═══════════════════╦══════════╦════════════════╦════════════════════════╣")
        console.log("║ SLIDE ║    TIME RANGE     ║  MEDIAN  ║     STATUS     ║        HEADLINE        ║")
        console.log("╠═══════╬═══════════════════╬══════════╬════════════════╬════════════════════════╣")

        const slides = carouselData.variations[0].data?.slides || []
        let extractedCount = 0
        let skippedCount = 0

        slides.forEach((slide: any, idx: number) => {
          // Determine status
          let status = "❌ NO_IMAGE"
          if (slide.validatedFrame) {
            if (slide.validatedFrame.status === 'VALID') {
              status = "✅ EXTRACTED"
              extractedCount++
            } else {
              status = `⚠️ ${slide.validatedFrame.reason?.substring(0, 10) || 'SKIP'}`
              skippedCount++
            }
          } else if (slide.backgroundImageUrl) {
            status = "✅ LEGACY"
            extractedCount++
          } else {
            skippedCount++
          }

          // Format time range
          const start = slide.segment?.start ?? slide.validatedFrame?.startTime ?? 0
          const end = slide.segment?.end ?? slide.validatedFrame?.endTime ?? 0
          const median = slide.validatedFrame?.timestamp ?? ((start + end) / 2)

          const formatTime = (s: number) => {
            const m = Math.floor(s / 60)
            const sec = Math.floor(s % 60)
            return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
          }

          const timeRange = `${formatTime(start)} → ${formatTime(end)}`
          const medianStr = formatTime(median)
          const headline = (slide.heading || "No heading").substring(0, 20)

          console.log(`║ #${(idx + 1).toString().padEnd(4)} ║ ${timeRange.padEnd(17)} ║ ${medianStr.padEnd(8)} ║ ${status.padEnd(14)} ║ ${headline.padEnd(22)} ║`)
        })

        console.log("╠═══════╩═══════════════════╩══════════╩════════════════╩════════════════════════╣")
        console.log(`║  📸 EXTRACTED: ${extractedCount}  |  ⚠️ SKIPPED: ${skippedCount}  |  📝 TOTAL SLIDES: ${slides.length}`.padEnd(80) + "║")
        console.log("╚════════════════════════════════════════════════════════════════════════════════╝\n")
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
