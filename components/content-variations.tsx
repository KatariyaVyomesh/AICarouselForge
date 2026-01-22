"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, RefreshCw, ArrowLeft, Loader2 } from "lucide-react"
import { assignSlideLayouts } from "@/lib/types"
import type { CarouselData, ContentVariation } from "@/lib/types"
import { useCarousel } from "@/components/carousel-context"

interface ContentVariationsProps {
  variations: ContentVariation[]
  onSelect: (variation: ContentVariation) => void
  onRegenerate: () => void
  onReset: () => void
  isLoading: boolean
}

const styleColors: Record<string, string> = {
  "Direct & Actionable": "bg-blue-500/10 text-blue-600 border-blue-200",
  "Story-driven": "bg-amber-500/10 text-amber-600 border-amber-200",
  "Data & Authority": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
}

export function ContentVariations({ variations, onSelect, onRegenerate, onReset, isLoading }: ContentVariationsProps) {
  /* Add useCarousel hook to get selectedTemplateId */
  const { selectedTemplateId } = useCarousel()

  const handleSelect = (variation: ContentVariation) => {
    const variationWithLayouts = {
      ...variation,
      data: {
        ...variation.data,
        slides: assignSlideLayouts(variation.data.slides),
        templateId: selectedTemplateId
      },
    }
    onSelect(variationWithLayouts)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" size="sm" onClick={onReset} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Start Over
          </Button>
          <h2 className="text-3xl font-bold">Choose Your Content Style</h2>
          <p className="text-muted-foreground mt-1">Select one of the variations below to customize and edit</p>
        </div>
        <Button variant="outline" onClick={onRegenerate} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Regenerate
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {variations.map((variation) => (
          <Card
            key={variation.id}
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
            onClick={() => handleSelect(variation)}
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge className={styleColors[variation.style] || "bg-muted"}>{variation.style}</Badge>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              </div>
              <CardTitle className="text-lg">{variation.data.topic}</CardTitle>
              <CardDescription>{variation.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {variation.data.slides.slice(0, 3).map((slide, index) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm line-clamp-1">{slide.heading}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{slide.body}</p>
                  </div>
                ))}
                {variation.data.slides.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{variation.data.slides.length - 3} more slides
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
