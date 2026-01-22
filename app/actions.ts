"use server"

import { generateObject } from "ai"
import { z } from "zod"

const CarouselSlideSchema = z.object({
  heading: z.string().describe("The slide headline - punchy and attention-grabbing"),
  body: z.string().describe("The main body text for the slide - informative but concise"),
  suggested_image: z.string().describe("Image mood suggestion: backgrounds, icons, themes"),
  tone: z.enum(["educational", "storytelling", "inspirational"]).describe("The tone of this specific slide"),
  min_text_version: z.string().max(50).describe("Short version of body text, max 50 chars"),
  max_text_version: z.string().describe("Extended version of body text, up to 120 words"),
})

const CarouselDataSchema = z.object({
  topic: z.string().describe("The main topic of the carousel"),
  slides: z.array(CarouselSlideSchema).describe("Array of carousel slides"),
})

export async function generateCarouselContent(topic: string, tone: string, slideCount: number) {
  const { object } = await generateObject({
    model: "anthropic/claude-sonnet-4",
    schema: CarouselDataSchema,
    prompt: `You are an expert carousel-content generator for social media (Instagram, LinkedIn, etc).
Generate a ${slideCount}-slide carousel about: "${topic}"

TONE: ${tone}

CONTENT RULES:
- Follow logical narrative flow: Hook → Value → Details → Takeaways → CTA
- Body text should be punchy—not corporate-speak
- Avoid plagiarism, clichés and generic filler
- Never repeat exact sentences across slides

LAYOUT AWARENESS:
- "min_text_version" should be <= 50 chars
- "max_text_version" may be up to ~120 words

SLIDE STRUCTURE:
- Slide 1: Hook - grab attention with a bold statement or question
- Slides 2-${slideCount - 2}: Value & Details - deliver the main content
- Slide ${slideCount - 1}: Key takeaway or summary
- Slide ${slideCount}: CTA with 3 action options

For each slide, suggest an image mood (backgrounds, icons, visual themes).`,
  })

  return object
}
