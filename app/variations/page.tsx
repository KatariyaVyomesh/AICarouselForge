"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ContentVariations } from "@/components/content-variations"
import { useCarousel } from "@/components/carousel-context"
import { Loader2 } from "lucide-react"

export default function VariationsPage() {
    const router = useRouter()
    const { variations, setVariations, topic, inputType, generatedSlideCount, brandKit, hostImage, guestImage } = useCarousel()

    // If no variations, redirect home
    useEffect(() => {
        if (!variations && topic === "") {
            router.push("/")
        }
    }, [variations, topic, router])

    const handleSelectVariation = async (variation: any) => {
        try {
            // Prepare theme from brand kit or default
            const themeData = brandKit ? {
                id: "custom", // or generate one
                name: brandKit.name + " Theme",
                backgroundColor: brandKit.colors.background,
                textColor: brandKit.colors.text,
                accentColor: brandKit.colors.accent,
                headingColor: brandKit.colors.heading,
            } : (variation.data.theme || {
                id: "dark",
                name: "Dark",
                backgroundColor: "#0f172a",
                textColor: "#f1f5f9",
                accentColor: "#3b82f6",
                headingColor: "#ffffff",
            })



            // Create Project in DB
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Ensure we handle defaults if variation data is missing some fields
                body: JSON.stringify({
                    topic: variation.data.topic || topic,
                    slides: variation.data.slides,
                    theme: themeData,
                    brandName: brandKit?.name || "Your Name",
                    brandHandle: brandKit?.handle || "@handle",
                    brandImage: brandKit?.imageUrl || null,
                    hostImage: hostImage || null,
                    guestImage: guestImage || null,
                    templateId: variation.data.templateId || null
                }),
            })

            if (response.ok) {
                const data = await response.json()
                if (data.project?.id) {
                    router.push(`/editor/${data.project.id}`)
                }
            } else {
                console.error("Failed to create project")
            }
        } catch (e) {
            console.error("Error creating project:", e)
        }
    }

    const handleRegenerate = async () => {
        // Re-trigger generation logic (simplified duplicate of generator logic)
        // Ideally we should move generation logic to a hook or utility
        // For now, let's redirect back to home to regenerate? 
        // Or we can just Implement it here if we have topic.
        if (!topic) {
            router.push("/")
            return
        }

        // Quick regenerate redirect to home with params? 
        // Easier for now: Redirect home to change prompt
        router.push("/")
    }

    const handleReset = () => {
        setVariations(null)
        router.push("/")
    }

    if (!variations) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-background">
            <ContentVariations
                variations={variations}
                onSelect={handleSelectVariation}
                onRegenerate={handleRegenerate}
                onReset={handleReset}
                isLoading={false}
            />
        </main>
    )
}
