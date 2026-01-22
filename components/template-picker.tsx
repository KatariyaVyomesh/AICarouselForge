"use client"

import { useState } from "react"
import { Check, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { CAROUSEL_TEMPLATES, TEMPLATE_CATEGORIES, type CarouselTemplate, type TemplateCategory } from "@/lib/templates"

interface TemplatePickerProps {
    selectedTemplateId: string | null
    onTemplateSelect: (template: CarouselTemplate | null) => void
}

export function TemplatePicker({ selectedTemplateId, onTemplateSelect }: TemplatePickerProps) {
    const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all")

    const filteredTemplates = activeCategory === "all"
        ? CAROUSEL_TEMPLATES
        : CAROUSEL_TEMPLATES.filter((t) => t.category === activeCategory)

    const renderTemplatePreview = (template: CarouselTemplate) => {
        const { backgroundStyle } = template
        const layers = template.layers || []

        return (
            <div
                className="relative w-full aspect-square rounded-lg overflow-hidden"
                style={{
                    background: backgroundStyle.type === "gradient" || backgroundStyle.type === "solid"
                        ? backgroundStyle.value
                        : "#f0f0f0",
                }}
            >
                {layers.sort((a, b) => a.zIndex - b.zIndex).map((layer, idx) => {
                    const baseStyle: React.CSSProperties = {
                        position: "absolute",
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        width: layer.width ? `${layer.width}%` : undefined,
                        height: layer.height ? `${layer.height}%` : undefined,
                        transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                        opacity: layer.opacity ?? 1,
                        zIndex: layer.zIndex,
                        mixBlendMode: layer.blendMode as any,
                    }

                    if (layer.type === "shape") {
                        return (
                            <div
                                key={`preview-${template.id}-${idx}`}
                                style={{
                                    ...baseStyle,
                                    background: layer.fill,
                                    border: layer.stroke ? `1px solid ${layer.stroke}` : undefined,
                                    borderRadius: layer.shapeType === "circle" ? "50%" : layer.borderRadius ? `${layer.borderRadius}px` : undefined,
                                    boxShadow: layer.textStyle?.shadow, // reusing shadow prop
                                }}
                            />
                        )
                    }

                    if (layer.type === "text") {
                        // Simplify text for preview - just bars or generic text
                        const isHeading = layer.id === "heading"
                        const ts = layer.textStyle || {}

                        return (
                            <div
                                key={`preview-${template.id}-${idx}`}
                                style={{
                                    ...baseStyle,
                                    color: ts.color,
                                    textAlign: ts.align as any,
                                    fontFamily: "sans-serif", // Fallback for preview
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: ts.align === "center" ? "center" : ts.align === "right" ? "flex-end" : "flex-start",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                {isHeading ? (
                                    <div style={{
                                        fontWeight: 800,
                                        fontSize: "8px",
                                        lineHeight: 1,
                                        textTransform: ts.case as any
                                    }}>
                                        HEADING
                                    </div>
                                ) : (
                                    <div style={{
                                        fontSize: "4px",
                                        opacity: 0.7
                                    }}>
                                        Body text line
                                    </div>
                                )}
                            </div>
                        )
                    }

                    if (layer.type === "image") {
                        return (
                            <div
                                key={`preview-${template.id}-${idx}`}
                                style={{
                                    ...baseStyle,
                                    backgroundColor: "rgba(0,0,0,0.1)", // Placeholder if no src
                                    overflow: "hidden",
                                    clipPath: layer.mask,
                                }}
                            >
                                {layer.id === "bg-image" && (
                                    <div className="w-full h-full bg-gray-300 opacity-50 flex items-center justify-center">
                                        <div className="w-4 h-4 rounded-full bg-white/50" />
                                    </div>
                                )}
                            </div>
                        )
                    }

                    return null
                })}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 justify-center">
                {TEMPLATE_CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            activeCategory === cat.id
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        )}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {/* Start Blank Option */}
                <button
                    onClick={() => onTemplateSelect(null)}
                    className={cn(
                        "group relative aspect-square rounded-xl border-2 transition-all p-2",
                        "hover:shadow-lg hover:scale-105",
                        selectedTemplateId === null
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-dashed border-muted-foreground/30 hover:border-primary/50"
                    )}
                >
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <Sparkles className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                            Blank
                        </span>
                    </div>
                    {selectedTemplateId === null && (
                        <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                    )}
                </button>

                {/* Template Cards */}
                {filteredTemplates.map((template) => (
                    <button
                        key={template.id}
                        onClick={() => onTemplateSelect(template)}
                        className={cn(
                            "group relative aspect-square rounded-xl border-2 transition-all overflow-hidden",
                            "hover:shadow-lg hover:scale-105",
                            selectedTemplateId === template.id
                                ? "border-primary shadow-md ring-2 ring-primary/20"
                                : "border-transparent hover:border-primary/50"
                        )}
                    >
                        {renderTemplatePreview(template)}

                        {/* Hover overlay with name */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-medium text-center px-2">
                                {template.name}
                            </span>
                        </div>

                        {/* Selected indicator */}
                        {selectedTemplateId === template.id && (
                            <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}
