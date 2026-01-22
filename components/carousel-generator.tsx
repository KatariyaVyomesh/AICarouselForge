"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Sparkles, Type, Youtube, Link as LinkIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCarousel } from "@/components/carousel-context"
import { RecentProjects } from "@/components/recent-projects"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BrandKitSelector, BrandKit } from "@/components/brand-kit-selector"
import { type CarouselTemplate } from "@/lib/templates"

export function CarouselGenerator() {
  const router = useRouter()
  const {
    topic, setTopic,
    inputType, setInputType,
    setVariations,
    generatedSlideCount, setGeneratedSlideCount,
    brandKit, setBrandKit,
    hostImage, setHostImage,
    guestImage, setGuestImage,
    selectedTemplateId, setSelectedTemplateId
  } = useCarousel()

  const [slideCountInput, setSlideCountInput] = useState("5")
  const [language, setLanguage] = useState("English")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProject, setLoadingProject] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTemplateSelect = (template: CarouselTemplate | null) => {
    setSelectedTemplateId(template?.id || null)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string | null) => void) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")

      const data = await res.json()
      setter(data.imageUrl)
    } catch (err) {
      console.error("Upload error:", err)
      setError("Failed to upload image")
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return

    setIsLoading(true)
    setError(null)
    setVariations(null)

    try {
      // Auto-detect text mode if input is long
      const effectiveInputType = (inputType === "topic" && topic.length > 200) ? "text" : inputType

      const response = await fetch("/api/generate-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          tone: "professional",
          slideCount: Number.parseInt(slideCountInput),
          language,
          inputType: effectiveInputType,
          // Pass image URLs if they exist (only for YouTube mode, but safe to pass always)
          hostImage: inputType === "youtube" ? hostImage : null,
          guestImage: inputType === "youtube" ? guestImage : null
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
      case "youtube": return "Paste a YouTube video URL..."
      case "link": return "Paste a Blog or Article URL..."
      default: return ""
    }
  }

  // Removed conditional rendering for editor/variations - handled by routes now

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src="/icon.ico" alt="SayStory Logo" className="h-12 w-12 rounded-lg" />
          <h1 className="text-4xl font-bold tracking-tight">SayStory</h1>
        </div>
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
                <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-xl">
                  <TabsTrigger value="topic" className="text-xs">
                    <Type className="h-4 w-4 mr-2" />
                    Topic & Text
                  </TabsTrigger>
                  <TabsTrigger value="youtube" className="text-xs">
                    <Youtube className="h-4 w-4 mr-2" />
                    YT
                  </TabsTrigger>
                  <TabsTrigger value="link" className="text-xs">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Article/Blog
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="topic">
                  {inputType === "topic" && "Topic or Content"}
                  {inputType === "youtube" && "YouTube URL"}
                  {inputType === "link" && "Article/Blog URL"}
                </Label>
                <div className="relative">
                  {inputType === "topic" ? (
                    <Textarea
                      id="topic"
                      placeholder="Enter a topic or paste your content script here..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleGenerate()}
                      className="min-h-[80px] pr-10 resize-none"
                    />
                  ) : (
                    <Input
                      id="topic"
                      placeholder={getInputPlaceholder()}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                      className="pr-10"
                    />
                  )}
                  <div className="absolute right-3 top-3 text-muted-foreground">
                    {inputType === "youtube" && <Youtube className="h-4 w-4" />}
                    {inputType === "link" && <LinkIcon className="h-4 w-4" />}
                    {inputType === "topic" && <Type className="h-4 w-4" />}
                  </div>
                </div>
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




              <div className="md:col-span-2 space-y-2">
                <Label>Brand Kit</Label>
                <BrandKitSelector
                  selectedBrandId={brandKit?.id}
                  onBrandSelect={setBrandKit}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Italian">Italian</SelectItem>
                    <SelectItem value="Portuguese">Portuguese</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Japanese">Japanese</SelectItem>
                    <SelectItem value="Chinese">Chinese</SelectItem>
                  </SelectContent>
                </Select>
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

      {
        loadingProject && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading project...</span>
          </div>
        )
      }
    </div >
  )
}
