export type TemplateCategory = "modern" | "minimal" | "bold" | "creative" | "elegant"

// V2 Layer Architecture
export interface TemplateLayer {
    type: "text" | "image" | "shape" | "asset" | "gradient" | "pattern"
    id: string // "heading", "body", "slide-number", "bg-image", "overlay", "accent-shape"
    zIndex: number

    // Positioning (Percentage 0-100)
    x: number
    y: number
    width?: number
    height?: number
    rotation?: number

    // Styling
    opacity?: number
    blendMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"

    // Shape Specific
    shapeType?: "rectangle" | "circle" | "pill" | "blob"
    fill?: string // CSS color or gradient
    stroke?: string
    strokeWidth?: number
    borderRadius?: number // px or %

    // Text Specific
    textStyle?: {
        fontFamily: string
        weight: "400" | "500" | "600" | "700" | "800" | "900"
        fontSize: number // Scale factor relative to base (1.0 = normal, 2.0 = double)
        color: string
        align: "left" | "center" | "right"
        case?: "uppercase" | "lowercase" | "capitalize" | "none"
        letterSpacing?: string // e.g., "0.05em"
        lineHeight?: number
        shadow?: string // CSS text-shadow
        background?: string // CSS background for text box
        padding?: string // CSS padding
    }

    // Image/Asset Specific
    src?: string // For assets
    mask?: string // CSS clip-path or mask-image
    blur?: number // backdrop-filter blur in px
}

export interface CarouselTemplate {
    id: string
    name: string
    category: TemplateCategory
    description: string
    fonts: string[] // Fonts to load from Google Fonts
    layers: TemplateLayer[]
    introLayers?: TemplateLayer[] // Optional: Unique layout for Slide 1
    outroLayers?: TemplateLayer[] // Optional: Unique layout for Last Slide
    // Backward compatibility for picker preview (approximated)
    backgroundStyle: {
        type: "solid" | "gradient" | "image" | "pattern"
        value: string
    }
}

// Refined V2 Templates
export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
    {
        id: "modern-tech",
        name: "Modern Tech",
        category: "modern",
        description: "Deep tech aesthetic with glassmorphism and geometric accents",
        fonts: ["Plus Jakarta Sans", "Inter"],
        backgroundStyle: { type: "solid", value: "#0f172a" },
        layers: [
            { type: "shape", id: "bg-solid", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#0f172a" },
            { type: "shape", id: "orb-1", zIndex: 1, x: 80, y: 10, width: 60, height: 60, shapeType: "circle", fill: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", opacity: 0.3, blendMode: "screen" },
            { type: "shape", id: "orb-2", zIndex: 1, x: 10, y: 90, width: 70, height: 70, shapeType: "circle", fill: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", opacity: 0.25, blendMode: "screen" },

            // Content Card (Glassmorphism) - Taller to hold image
            {
                type: "shape", id: "content-card", zIndex: 10, x: 50, y: 50, width: 88, height: 85,
                shapeType: "rectangle", fill: "rgba(30, 41, 59, 0.6)", stroke: "rgba(255, 255, 255, 0.1)",
                strokeWidth: 1, borderRadius: 32, blur: 24, shadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            },

            // NEW: Image Layer (Top Section of Card)
            {
                type: "image", id: "bg-image", zIndex: 15, x: 50, y: 35, width: 80, height: 40,
                borderRadius: 20, mask: "none"
            },

            // Text Layers (Bottom Section)
            { type: "text", id: "heading", zIndex: 20, x: 50, y: 65, width: 75, textStyle: { fontFamily: "Plus Jakarta Sans", weight: "800", fontSize: 1.8, color: "#ffffff", align: "center", letterSpacing: "-0.02em", lineHeight: 1.2 } },
            { type: "text", id: "body", zIndex: 20, x: 50, y: 80, width: 75, textStyle: { fontFamily: "Inter", weight: "400", fontSize: 0.9, color: "#cbd5e1", align: "center", lineHeight: 1.5 } },
            { type: "text", id: "slide-number", zIndex: 30, x: 50, y: 92, textStyle: { fontFamily: "Plus Jakarta Sans", weight: "600", fontSize: 0.75, color: "#64748b", align: "center", letterSpacing: "0.1em" } }
        ],
        introLayers: [
            { type: "shape", id: "bg-solid", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#0f172a" },
            // NEW: Subtle Background Image
            { type: "image", id: "bg-image", zIndex: 0, x: 50, y: 50, width: 100, height: 100, opacity: 0.2, blendMode: "overlay" },
            { type: "shape", id: "hero-orb", zIndex: 1, x: 50, y: 50, width: 140, height: 140, shapeType: "circle", fill: "radial-gradient(circle, #3b82f6 0%, transparent 65%)", opacity: 0.5, blendMode: "screen" },

            { type: "text", id: "heading", zIndex: 20, x: 50, y: 48, width: 90, textStyle: { fontFamily: "Plus Jakarta Sans", weight: "900", fontSize: 3.8, color: "#ffffff", align: "center", letterSpacing: "-0.04em", lineHeight: 1.05, shadow: "0 10px 40px rgba(59, 130, 246, 0.4)" } },
            { type: "text", id: "body", zIndex: 20, x: 50, y: 85, width: 60, textStyle: { fontFamily: "Inter", weight: "600", fontSize: 0.9, color: "#64748b", align: "center", letterSpacing: "0.25em", case: "uppercase" } },
        ],
        outroLayers: [
            { type: "shape", id: "bg-solid", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#0f172a" },
            { type: "shape", id: "orb-bottom", zIndex: 1, x: 50, y: 80, width: 120, height: 100, shapeType: "circle", fill: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", opacity: 0.4, blendMode: "screen" },
            { type: "text", id: "heading", zIndex: 20, x: 50, y: 40, width: 80, textStyle: { fontFamily: "Plus Jakarta Sans", weight: "800", fontSize: 2.5, color: "#ffffff", align: "center", lineHeight: 1.2 } },
            { type: "shape", id: "cta-btn", zIndex: 19, x: 50, y: 65, width: 45, height: 10, shapeType: "pill", fill: "#3b82f6", shadow: "0 4px 20px rgba(59, 130, 246, 0.4)" },
            { type: "text", id: "body", zIndex: 20, x: 50, y: 65, width: 40, textStyle: { fontFamily: "Plus Jakarta Sans", weight: "700", fontSize: 0.9, color: "#ffffff", align: "center", case: "uppercase", letterSpacing: "0.05em" } },
        ]
    },
    {
        id: "bold-editorial",
        name: "Bold Editorial",
        category: "bold",
        description: "High impact typography with vibrant contrast",
        fonts: ["Oswald", "Roboto Mono"],
        backgroundStyle: { type: "solid", value: "#FFD700" },
        layers: [
            { type: "shape", id: "bg", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#FFD700" },
            // Image area
            { type: "shape", id: "img-area", zIndex: 1, x: 50, y: 25, width: 100, height: 50, shapeType: "rectangle", fill: "#000000" },
            { type: "image", id: "bg-image", zIndex: 2, x: 50, y: 25, width: 100, height: 50, opacity: 0.8 },

            // Text Block Area
            { type: "shape", id: "text-bg", zIndex: 15, x: 50, y: 72, width: 100, height: 55, shapeType: "rectangle", fill: "#111111" },

            // Typography - Less rotation, cleaner look
            { type: "text", id: "heading", zIndex: 20, x: 50, y: 65, width: 85, textStyle: { fontFamily: "Oswald", weight: "700", fontSize: 2.4, color: "#ffffff", align: "center", case: "uppercase", lineHeight: 1.1 } },
            { type: "text", id: "body", zIndex: 20, x: 50, y: 85, width: 80, textStyle: { fontFamily: "Roboto Mono", weight: "400", fontSize: 0.85, color: "#FFD700", align: "center", lineHeight: 1.5 } }
        ],
        introLayers: [
            { type: "shape", id: "bg", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#FFD700" },
            { type: "image", id: "bg-image", zIndex: 1, x: 50, y: 50, width: 100, height: 100, blendMode: "multiply", opacity: 0.4 }, // Lighter image for readability
            { type: "text", id: "heading", zIndex: 20, x: 50, y: 50, width: 90, rotation: -3, textStyle: { fontFamily: "Oswald", weight: "900", fontSize: 5.5, color: "#111111", align: "center", case: "uppercase", lineHeight: 0.9, letterSpacing: "-0.02em" } },
            { type: "shape", id: "line", zIndex: 19, x: 50, y: 50, width: 90, height: 35, shapeType: "rectangle", fill: "#ffffff", rotation: -3, opacity: 0.95 }
        ],
        outroLayers: [
            { type: "shape", id: "bg", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#111111" },
            { type: "shape", id: "border", zIndex: 1, x: 50, y: 50, width: 92, height: 92, shapeType: "rectangle", fill: "transparent", stroke: "#FFD700", strokeWidth: 1 },
            // Reduced font size and adjusted spacing to prevent overflow/overlap
            { type: "text", id: "heading", zIndex: 20, x: 50, y: 40, width: 85, textStyle: { fontFamily: "Oswald", weight: "700", fontSize: 2.2, color: "#FFD700", align: "center", case: "uppercase", lineHeight: 1.1 } },
            { type: "shape", id: "arrow", zIndex: 20, x: 50, y: 68, width: 12, height: 12, shapeType: "circle", fill: "#FFD700" },
            { type: "text", id: "body", zIndex: 21, x: 50, y: 82, width: 80, textStyle: { fontFamily: "Roboto Mono", weight: "700", fontSize: 0.8, color: "#ffffff", align: "center", case: "uppercase", letterSpacing: "0.1em" } }
        ]
    },
    {
        id: "soft-aesthetic",
        name: "Soft Aesthetic",
        category: "elegant",
        description: "Creamy tones with serif typography and organic shapes",
        fonts: ["Playfair Display", "Lato"],
        backgroundStyle: { type: "solid", value: "#FAF9F6" }, // Off-white
        layers: [
            { type: "shape", id: "bg", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#FAF9F6" },
            { type: "shape", id: "blob-1", zIndex: 1, x: 15, y: 15, width: 45, height: 45, shapeType: "blob", fill: "#E8E4D9", opacity: 0.6, borderRadius: 60 },
            { type: "shape", id: "blob-2", zIndex: 1, x: 85, y: 85, width: 55, height: 55, shapeType: "blob", fill: "#D6CFC2", opacity: 0.4, borderRadius: 70 },

            // Image Frame - Cleaner Arch
            { type: "shape", id: "image-frame-bg", zIndex: 5, x: 50, y: 38, width: 55, height: 45, shapeType: "rectangle", fill: "#ffffff", borderRadius: 200, shadow: "0 10px 30px rgba(0,0,0,0.05)" },
            { type: "image", id: "bg-image", zIndex: 6, x: 50, y: 38, width: 50, height: 40, mask: "inset(0% round 150px 150px 0 0)" },

            // Text - More elegant spacing
            { type: "text", id: "heading", zIndex: 10, x: 50, y: 72, width: 80, textStyle: { fontFamily: "Playfair Display", weight: "700", fontSize: 1.8, color: "#2C2C2C", align: "center", lineHeight: 1.3 } },
            { type: "text", id: "body", zIndex: 10, x: 50, y: 86, width: 65, textStyle: { fontFamily: "Lato", weight: "400", fontSize: 0.95, color: "#666666", align: "center", lineHeight: 1.7, letterSpacing: "0.01em" } }
        ],
        introLayers: [
            { type: "shape", id: "bg", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#FAF9F6" },
            { type: "shape", id: "blob-main", zIndex: 1, x: 50, y: 50, width: 90, height: 90, shapeType: "blob", fill: "#E8E4D9", opacity: 0.4, borderRadius: 100 },
            { type: "text", id: "heading", zIndex: 10, x: 50, y: 52, width: 85, textStyle: { fontFamily: "Playfair Display", weight: "700", fontSize: 3.2, color: "#1a1a1a", align: "center", lineHeight: 1.15, fontStyle: "italic" } },
            { type: "image", id: "bg-image", zIndex: 5, x: 50, y: 22, width: 25, height: 25, mask: "circle(50%)" },
            { type: "text", id: "body", zIndex: 10, x: 50, y: 75, width: 60, textStyle: { fontFamily: "Lato", weight: "400", fontSize: 1.1, color: "#666666", align: "center", letterSpacing: "0.1em", case: "uppercase" } }
        ],
        outroLayers: [
            { type: "shape", id: "bg", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#E8E4D9" },
            { type: "shape", id: "card", zIndex: 1, x: 50, y: 50, width: 85, height: 85, shapeType: "rectangle", fill: "#FAF9F6", borderRadius: 4, shadow: "0 20px 40px rgba(0,0,0,0.05)" },
            { type: "image", id: "avatar", zIndex: 2, x: 50, y: 30, width: 20, height: 20, mask: "circle(50%)" },
            { type: "text", id: "heading", zIndex: 5, x: 50, y: 52, width: 70, textStyle: { fontFamily: "Playfair Display", weight: "700", fontSize: 1.8, color: "#1a1a1a", align: "center" } },
            { type: "text", id: "body", zIndex: 5, x: 50, y: 75, width: 60, textStyle: { fontFamily: "Lato", weight: "400", fontSize: 0.9, color: "#666666", align: "center" } }
        ]
    },
    {
        id: "lux-fashion",
        name: "Lux Fashion",
        category: "elegant",
        description: "High-end fashion editorial style",
        fonts: ["Bodoni Moda", "Inter"],
        backgroundStyle: { type: "solid", value: "#ffffff" },
        layers: [
            { type: "shape", id: "bg", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#ffffff" },
            { type: "image", id: "bg-image", zIndex: 1, x: 25, y: 50, width: 50, height: 100, },
            { type: "shape", id: "line", zIndex: 2, x: 50, y: 50, width: 0.1, height: 80, fill: "#000000" }, // Thinner line

            // Text refined
            { type: "text", id: "heading", zIndex: 5, x: 75, y: 42, width: 40, textStyle: { fontFamily: "Bodoni Moda", weight: "700", fontSize: 2.2, color: "#000000", align: "left", lineHeight: 1.1 } },
            { type: "text", id: "body", zIndex: 5, x: 75, y: 62, width: 40, textStyle: { fontFamily: "Inter", weight: "400", fontSize: 0.85, color: "#444444", align: "left", lineHeight: 1.6 } },
            { type: "text", id: "slide-number", zIndex: 5, x: 92, y: 92, textStyle: { fontFamily: "Bodoni Moda", weight: "500", fontSize: 1.2, color: "#000000", align: "right" } }
        ],
        introLayers: [
            { type: "shape", id: "bg", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#ffffff" },
            { type: "image", id: "bg-image", zIndex: 1, x: 50, y: 35, width: 80, height: 50, }, // Top large image
            { type: "text", id: "heading", zIndex: 5, x: 50, y: 75, width: 80, textStyle: { fontFamily: "Bodoni Moda", weight: "700", fontSize: 3.5, color: "#000000", align: "center", lineHeight: 1.0, letterSpacing: "-0.03em" } },
            // Small detail line
            { type: "shape", id: "line", zIndex: 5, x: 50, y: 62, width: 10, height: 0.2, fill: "#000000" }
        ],
        outroLayers: [
            { type: "shape", id: "bg", zIndex: 0, x: 50, y: 50, width: 100, height: 100, fill: "#000000" },
            { type: "shape", id: "border", zIndex: 1, x: 50, y: 50, width: 90, height: 90, shapeType: "rectangle", fill: "transparent", stroke: "#ffffff", strokeWidth: 1 },
            // Moved heading up to 40% and body down to 75% to prevent overlap on multiline text
            { type: "text", id: "heading", zIndex: 5, x: 50, y: 40, width: 80, textStyle: { fontFamily: "Bodoni Moda", weight: "700", fontSize: 2.5, color: "#ffffff", align: "center" } },
            { type: "text", id: "body", zIndex: 5, x: 50, y: 75, width: 60, textStyle: { fontFamily: "Inter", weight: "400", fontSize: 0.9, color: "#cccccc", align: "center", case: "uppercase", letterSpacing: "0.2em" } }
        ]
    }
]

export function getTemplateById(id: string): CarouselTemplate | undefined {
    return CAROUSEL_TEMPLATES.find((t) => t.id === id)
}

export function getTemplatesByCategory(category: TemplateCategory): CarouselTemplate[] {
    return CAROUSEL_TEMPLATES.filter((t) => t.category === category)
}

export const TEMPLATE_CATEGORIES: { id: TemplateCategory | "all"; name: string }[] = [
    { id: "all", name: "All" },
    { id: "modern", name: "Modern" },
    { id: "bold", name: "Bold" },
    { id: "elegant", name: "Elegant" },
    { id: "creative", name: "Creative" },
    { id: "minimal", name: "Minimal" },
]
