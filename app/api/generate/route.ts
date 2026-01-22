export async function POST(request: Request) {
  try {
    const { topic, tone, slideCount, apiKey } = await request.json()

    if (!apiKey) {
      return Response.json({ error: "API key is required" }, { status: 400 })
    }

    if (!topic) {
      return Response.json({ error: "Topic is required" }, { status: 400 })
    }

    const systemPrompt = `You are an expert carousel-content generator for social media (Instagram, LinkedIn, etc).
You MUST respond with valid JSON only, no markdown or extra text.

CONTENT RULES:
- Follow logical narrative flow: Hook → Value → Details → Takeaways → CTA
- Body text should be punchy—not corporate-speak
- Avoid plagiarism, clichés and generic filler
- Never repeat exact sentences across slides
- If the topic implies a specific count (e.g., "5 tips"), you MUST cover ALL items, even if it means grouping multiple items per slide.

LAYOUT AWARENESS:
- "min_text_version" should be <= 50 chars
- "max_text_version" may be up to ~50 words

SLIDE STRUCTURE:
- Slide 1: Hook - grab attention with a bold statement or question
- Middle slides: Value & Details - deliver the main content (group multiple points per slide if needed to fit all content)
- Second to last slide: Key takeaway or summary
- Last slide: CTA with 3 action options

For each slide, suggest an image mood (backgrounds, icons, visual themes).

REQUIRED JSON STRUCTURE:
{
  "topic": "string",
  "slides": [
    {
      "heading": "string - punchy headline",
      "body": "string - main body text",
      "suggested_image": "string - image mood suggestion",
      "tone": "educational" | "storytelling" | "inspirational",
      "min_text_version": "string - max 50 chars",
      "max_text_version": "string - up to 50 words"
    }
  ]
}`

    const userPrompt = `Generate a ${slideCount}-slide carousel about: "${topic}"
TONE: ${tone}

Respond with valid JSON only.`

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
        temperature: 0.7,
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
        {
          error: errorData.error?.message || "Failed to generate content",
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return Response.json({ error: "No content generated" }, { status: 500 })
    }

    const carouselData = JSON.parse(content)
    return Response.json(carouselData)
  } catch (error) {
    console.error("Generation error:", error)

    if (error instanceof SyntaxError) {
      return Response.json({ error: "Failed to parse generated content" }, { status: 500 })
    }

    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ error: "Failed to generate carousel content" }, { status: 500 })
  }
}
