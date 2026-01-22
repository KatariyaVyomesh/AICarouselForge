export async function POST(request: Request) {
  try {
    const { slides, layout, topic } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const layoutConfig: Record<string, { contentSize: string; maxChars: number }> = {
      centered: { contentSize: "standard", maxChars: 200 },
      "split-left": { contentSize: "standard", maxChars: 180 },
      "split-right": { contentSize: "standard", maxChars: 180 },
      "arch-left": { contentSize: "standard", maxChars: 150 },
      "arch-right": { contentSize: "standard", maxChars: 150 },
      "circle-frame": { contentSize: "compact", maxChars: 80 },
      "diagonal-split": { contentSize: "compact", maxChars: 100 },
      card: { contentSize: "compact", maxChars: 100 },
      minimal: { contentSize: "compact", maxChars: 80 },
      bold: { contentSize: "standard", maxChars: 250 },
      quote: { contentSize: "standard", maxChars: 150 },
      numbered: { contentSize: "compact", maxChars: 120 },
      "gradient-text": { contentSize: "standard", maxChars: 150 },
      sidebar: { contentSize: "standard", maxChars: 180 },
      stacked: { contentSize: "standard", maxChars: 220 },
      magazine: { contentSize: "standard", maxChars: 280 },
    }

    const config = layoutConfig[layout] || layoutConfig["centered"]

    const systemPrompt = `You are an expert at adapting carousel content to fit different layouts.
You MUST respond with valid JSON only.

The user has a carousel about "${topic}" and wants to adapt the content for a ${layout} layout.
This layout has ${config.contentSize} space, so body text should be around ${config.maxChars} characters.

ADAPTATION RULES:
- For COMPACT layouts: Condense to essential points, remove examples, use shorter sentences
- For STANDARD layouts: Keep a balance of insight and brevity
- For standard layouts: Add more context, examples, and supporting details

Keep the same meaning and tone, but adjust length and detail level appropriately.
Never lose the core message - just adapt how it's expressed.

REQUIRED JSON STRUCTURE:
{
  "slides": [
    {
      "id": "string",
      "heading": "string - keep punchy, may shorten for compact",
      "body": "string - adapted body text for this layout",
      "bodyShort": "string - always include compact version",
      "bodyLong": "string - always include extended version",
      "suggested_image": "string - keep or enhance",
      "tone": "educational" | "storytelling" | "inspirational",
      "min_text_version": "string",
      "max_text_version": "string"
    }
  ]
}`

    const userPrompt = `Adapt this carousel content for a ${layout} layout (${config.contentSize} space, ~${config.maxChars} chars per body):

Current slides:
${JSON.stringify(slides, null, 2)}

Rewrite the body text to fit the new layout while preserving the message.
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
      return Response.json(
        { error: errorData.error?.message || "Failed to adapt content" },
        { status: response.status },
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return Response.json({ error: "No content generated" }, { status: 500 })
    }

    const adaptedData = JSON.parse(content)
    return Response.json(adaptedData)
  } catch (error) {
    console.error("Adaptation error:", error)
    return Response.json({ error: "Failed to adapt content" }, { status: 500 })
  }
}
