"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Sparkles, Type, FileText, Youtube, Link as LinkIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCarousel } from "@/components/carousel-context"
import { RecentProjects } from "@/components/recent-projects"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export function CarouselGenerator() {
  const router = useRouter()
  const {
    topic, setTopic,
    inputType, setInputType,
    setVariations,
    generatedSlideCount, setGeneratedSlideCount
  } = useCarousel()

  const [slideCountInput, setSlideCountInput] = useState("5")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProject, setLoadingProject] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!topic.trim()) return

    setIsLoading(true)
    setError(null)
    setVariations(null)
    setVariations(null)

    try {
      const response = await fetch("/api/generate-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          tone: "professional",
          slideCount: Number.parseInt(slideCountInput),
          inputType
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate carousel")
      }

      const data = await response.json()
      setVariations(data.variations)
      setGeneratedSlideCount(Number.parseInt(slideCountInput))
      router.push("/variations")
    } catch (err) {
      console.error("Failed to generate carousel:", err)
      setError(err instanceof Error ? err.message : "Failed to generate carousel")
    } finally {
      setIsLoading(false)
    }
  }

  /* Removed local handlers for internal navigation */

  const handleSelectProject = async (projectId: string) => {
    setLoadingProject(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        // For existing projects, we redirect directly to editor
        router.push(`/editor/${projectId}`)
      }
    } catch (error) {
      console.error("Failed to load project:", error)
    } finally {
      setLoadingProject(false)
    }
  }

  const getInputPlaceholder = () => {
    switch (inputType) {
      case "topic": return "e.g., 5 Productivity Tips for Remote Workers"
      case "text": return "Paste your article, notes, or script here..."
      case "youtube": return "Paste a YouTube video URL..."
      case "link": return "Paste a Blog or Article URL..."
      default: return ""
    }
  }

  // Removed conditional rendering for editor/variations - handled by routes now

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">SayStory</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Generate engaging slide-by-slide content for Instagram and LinkedIn carousels with AI
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Carousel
          </CardTitle>
          <CardDescription>
            Enter your topic and we will generate 3 content variations for you to choose from
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex justify-center -mt-2 mb-2">
              <Tabs
                value={inputType}
                onValueChange={(val) => {
                  setInputType(val as any)
                  setTopic("")
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4 bg-muted p-1 rounded-xl">
                  <TabsTrigger value="topic" className="text-xs">
                    <Type className="h-4 w-4 mr-2" />
                    Topic
                  </TabsTrigger>
                  <TabsTrigger value="text" className="text-xs">
                    <FileText className="h-4 w-4 mr-2" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="youtube" className="text-xs">
                    <Youtube className="h-4 w-4 mr-2" />
                    YT
                  </TabsTrigger>
                  <TabsTrigger value="link" className="text-xs">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="topic">
                  {inputType === "topic" && "Topic or Title"}
                  {inputType === "text" && "Paste Content"}
                  {inputType === "youtube" && "YouTube URL"}
                  {inputType === "link" && "Article/Blog URL"}
                </Label>
                {inputType === "topic" || inputType === "text" ? (
                  <Textarea
                    id="topic"
                    placeholder={getInputPlaceholder()}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleGenerate()}
                    className={inputType === "text" ? "min-h-[120px]" : "min-h-[50px] resize-none"}
                  />
                ) : (
                  <div className="relative">
                    <Input
                      id="topic"
                      placeholder={getInputPlaceholder()}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {inputType === "youtube" ? <Youtube className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slides">Slide Count</Label>
                <Input
                  id="slides"
                  type="number"
                  min={1}
                  max={20}
                  value={slideCountInput}
                  onChange={(e) => setSlideCountInput(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          {error && <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

          <div className="mt-6">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
              size="lg"
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating 3 Variations...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Content Variations
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!loadingProject && <RecentProjects onSelectProject={handleSelectProject} />}

      {loadingProject && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading project...</span>
        </div>
      )}
    </div>
  )
}
