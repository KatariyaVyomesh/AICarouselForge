"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, ImageIcon, FileText, Maximize2, Minimize2 } from "lucide-react"
import type { CarouselData } from "@/components/carousel-generator"

interface CarouselPreviewProps {
  data: CarouselData
}

const slideColors = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-fuchsia-500 to-fuchsia-600",
  "from-orange-500 to-orange-600",
  "from-teal-500 to-teal-600",
  "from-indigo-500 to-indigo-600",
  "from-pink-500 to-pink-600",
]

export function CarouselPreview({ data }: CarouselPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [textMode, setTextMode] = useState<"default" | "min" | "max">("default")
  const [isExpanded, setIsExpanded] = useState(false)

  const goToSlide = (index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, data.slides.length - 1)))
  }

  const currentSlideData = data.slides[currentSlide]

  const getDisplayText = () => {
    switch (textMode) {
      case "min":
        return currentSlideData.min_text_version
      case "max":
        return currentSlideData.max_text_version
      default:
        return currentSlideData.body
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{data.topic}</h2>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
          {isExpanded ? "Collapse" : "Expand"}
        </Button>
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList>
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Visual Preview
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Slides
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-6">
          <div className="flex flex-col items-center">
            {/* Slide Preview */}
            <div
              className={`relative bg-gradient-to-br ${slideColors[currentSlide % slideColors.length]} rounded-2xl p-8 text-white shadow-xl transition-all duration-300 ${
                isExpanded ? "w-full max-w-2xl aspect-square" : "w-full max-w-md aspect-square"
              }`}
            >
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {currentSlide + 1} / {data.slides.length}
                </Badge>
              </div>

              <div className="flex flex-col justify-center h-full">
                <Badge className="w-fit mb-4 bg-white/20 text-white border-0">{currentSlideData.tone}</Badge>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 leading-tight text-balance">
                  {currentSlideData.heading}
                </h3>
                <p className="text-base md:text-lg opacity-95 leading-relaxed">{getDisplayText()}</p>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs opacity-70 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {currentSlideData.suggested_image}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToSlide(currentSlide - 1)}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex gap-2">
                {data.slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentSlide
                        ? "w-8 bg-primary"
                        : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToSlide(currentSlide + 1)}
                disabled={currentSlide === data.slides.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Text Mode Toggle */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Text version:</span>
              <div className="flex gap-1">
                {(["min", "default", "max"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={textMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTextMode(mode)}
                  >
                    {mode === "min" ? "Short" : mode === "max" ? "Long" : "Default"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="text" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {data.slides.map((slide, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  index === currentSlide ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => {
                  setCurrentSlide(index)
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Slide {index + 1}</Badge>
                    <Badge variant="secondary">{slide.tone}</Badge>
                  </div>
                  <CardTitle className="text-lg">{slide.heading}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{slide.body}</p>
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs">
                      <span className="font-medium">Short:</span>{" "}
                      <span className="text-muted-foreground">{slide.min_text_version}</span>
                    </p>
                    <p className="text-xs">
                      <span className="font-medium">Image:</span>{" "}
                      <span className="text-muted-foreground">{slide.suggested_image}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
