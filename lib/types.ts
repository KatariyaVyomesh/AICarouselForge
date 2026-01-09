export interface CustomText {
  id: string
  text: string
  x: number // Percentage position (0-100)
  y: number // Percentage position (0-100)
  fontSize: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl"
  fontWeight: "normal" | "medium" | "semibold" | "bold" | "black"
  color: "heading" | "text" | "accent" | "white" | "black"
}

export interface CarouselSlide {
  id: string
  heading: string
  body: string
  bodyShort: string // For compact layouts (card, split)
  bodyLong: string // For standard layouts (bold, magazine)
  suggested_image: string
  tone: "educational" | "storytelling" | "inspirational"
  min_text_version: string
  max_text_version: string
  backgroundImageUrl?: string
  isGeneratingImage?: boolean
  layout?: LayoutType
  useExtendedDescription?: boolean
  useShortDescription?: boolean // User's explicit choice: true for short, false for long
  customTexts?: CustomText[]
}

export interface LayoutContentConfig {
  id: string
  name: string
  description: string
  contentSize: "compact" | "standard" | "standard"
  hasImageArea: boolean
  maxBodyChars: number
}

export interface ContentVariation {
  id: string
  style: string
  description: string
  data: CarouselData
}

export interface CarouselData {
  topic: string
  slides: CarouselSlide[]
  brandName?: string
  brandHandle?: string
  brandImage?: string | null
  theme?: CarouselTheme
}

export interface CarouselTheme {
  id: string
  name: string
  backgroundColor: string
  textColor: string
  accentColor: string
  headingColor: string
}

export type LayoutType =
  | "centered"
  | "split-left"
  | "split-right"
  | "card"
  | "minimal"
  | "bold"
  | "quote"
  | "numbered"
  | "gradient-text"
  | "sidebar"
  | "stacked"
  | "magazine"
  | "arch-left"
  | "arch-right"
  | "circle-frame"
  | "diagonal-split"

export interface LayoutOption {
  id: LayoutType
  name: string
  description: string
}

export const LAYOUT_OPTIONS: LayoutContentConfig[] = [
  {
    id: "centered",
    name: "Centered",
    description: "Classic centered text layout",
    contentSize: "standard",
    hasImageArea: false,
    maxBodyChars: 200,
  },
  {
    id: "split-left",
    name: "Split Left",
    description: "Text on left, visual space on right",
    contentSize: "standard",
    hasImageArea: true,
    maxBodyChars: 180,
  },
  {
    id: "split-right",
    name: "Split Right",
    description: "Visual space on left, text on right",
    contentSize: "standard",
    hasImageArea: true,
    maxBodyChars: 180,
  },
  {
    id: "arch-left",
    name: "Arch Left",
    description: "Image in arch frame on left",
    contentSize: "standard",
    hasImageArea: true,
    maxBodyChars: 150,
  },
  {
    id: "arch-right",
    name: "Arch Right",
    description: "Image in arch frame on right",
    contentSize: "standard",
    hasImageArea: true,
    maxBodyChars: 150,
  },
  {
    id: "circle-frame",
    name: "Circle Frame",
    description: "Image in circular frame",
    contentSize: "compact",
    hasImageArea: true,
    maxBodyChars: 80,
  },
  {
    id: "diagonal-split",
    name: "Diagonal Split",
    description: "Diagonal image with text overlay",
    contentSize: "compact",
    hasImageArea: true,
    maxBodyChars: 100,
  },
  {
    id: "card",
    name: "Card",
    description: "Content in a floating card",
    contentSize: "compact",
    hasImageArea: false,
    maxBodyChars: 100,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean with lots of whitespace",
    contentSize: "compact",
    hasImageArea: false,
    maxBodyChars: 80,
  },
  {
    id: "bold",
    name: "Bold",
    description: "Large impactful typography",
    contentSize: "standard",
    hasImageArea: false,
    maxBodyChars: 250,
  },
  {
    id: "quote",
    name: "Quote",
    description: "Quote-style with decorative marks",
    contentSize: "standard",
    hasImageArea: false,
    maxBodyChars: 150,
  },
  {
    id: "numbered",
    name: "Numbered",
    description: "Large slide numbers as accent",
    contentSize: "compact",
    hasImageArea: false,
    maxBodyChars: 120,
  },
  {
    id: "gradient-text",
    name: "Gradient Text",
    description: "Text with gradient effect",
    contentSize: "standard",
    hasImageArea: false,
    maxBodyChars: 150,
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description: "Accent bar on the side",
    contentSize: "standard",
    hasImageArea: false,
    maxBodyChars: 180,
  },
  {
    id: "stacked",
    name: "Stacked",
    description: "Heading and body stacked vertically",
    contentSize: "standard",
    hasImageArea: false,
    maxBodyChars: 220,
  },
  {
    id: "magazine",
    name: "Magazine",
    description: "Editorial magazine style",
    contentSize: "standard",
    hasImageArea: false,
    maxBodyChars: 280,
  },
]

export function getBodyForLayout(slide: CarouselSlide, layoutId: LayoutType): string {
  const layout = LAYOUT_OPTIONS.find((l) => l.id === layoutId)
  if (!layout) return slide.body

  // If user has explicitly chosen a version, respect that choice
  if (slide.useExtendedDescription && slide.useShortDescription !== undefined) {
    if (slide.useShortDescription) {
      return slide.bodyShort || slide.body
    } else {
      return slide.bodyLong || slide.body
    }
  }

  // Otherwise, fall back to layout-based logic
  switch (layout.contentSize) {
    case "compact":
      return slide.bodyShort || slide.body.slice(0, layout.maxBodyChars)
    case "standard":
      return slide.bodyLong || slide.body
    default:
      return slide.body
  }
}

export function assignSlideLayouts(slides: CarouselSlide[]): CarouselSlide[] {
  const middleLayouts: LayoutType[] = [
    "arch-left",
    "arch-right",
    "circle-frame",
    "split-left",
    "split-right",
    "quote",
    "numbered",
    "sidebar",
    "stacked",
  ]

  const lastSlideLayouts: LayoutType[] = ["centered", "card"]

  return slides.map((slide, index) => {
    // If layout is already assigned (e.g. by AI), keep it.
    if (slide.layout) {
      return slide
    }

    let layout: LayoutType

    if (index === 0) {
      // First slide: always diagonal-split
      layout = "diagonal-split"
    } else if (index === slides.length - 1) {
      // Last slide: centered or card (random)
      layout = lastSlideLayouts[Math.floor(Math.random() * lastSlideLayouts.length)]
    } else {
      // Middle slides: random from middle layouts
      layout = middleLayouts[Math.floor(Math.random() * middleLayouts.length)]
    }

    return { ...slide, layout }
  })
}

export const DEFAULT_THEMES: CarouselTheme[] = [
  {
    id: "dark",
    name: "Dark",
    backgroundColor: "#0f172a",
    textColor: "#f1f5f9",
    accentColor: "#3b82f6",
    headingColor: "#ffffff",
  },
  {
    id: "light",
    name: "Light",
    backgroundColor: "#ffffff",
    textColor: "#334155",
    accentColor: "#2563eb",
    headingColor: "#0f172a",
  },
  {
    id: "ocean",
    name: "Ocean",
    backgroundColor: "#0c4a6e",
    textColor: "#e0f2fe",
    accentColor: "#38bdf8",
    headingColor: "#ffffff",
  },
  {
    id: "forest",
    name: "Forest",
    backgroundColor: "#14532d",
    textColor: "#dcfce7",
    accentColor: "#4ade80",
    headingColor: "#ffffff",
  },
  {
    id: "sunset",
    name: "Sunset",
    backgroundColor: "#7c2d12",
    textColor: "#fed7aa",
    accentColor: "#fb923c",
    headingColor: "#ffffff",
  },
  {
    id: "lavender",
    name: "Lavender",
    backgroundColor: "#4c1d95",
    textColor: "#ede9fe",
    accentColor: "#a78bfa",
    headingColor: "#ffffff",
  },
  {
    id: "coral",
    name: "Coral",
    backgroundColor: "#be123c",
    textColor: "#ffe4e6",
    accentColor: "#fb7185",
    headingColor: "#ffffff",
  },
  {
    id: "mint",
    name: "Mint",
    backgroundColor: "#115e59",
    textColor: "#ccfbf1",
    accentColor: "#2dd4bf",
    headingColor: "#ffffff",
  },
]
