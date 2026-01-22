"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CarouselEditor } from "@/components/carousel-editor"
import { Loader2 } from "lucide-react"
import type { CarouselData } from "@/lib/types"

export default function EditorPage() {
    const params = useParams()
    const router = useRouter()
    const [projectData, setProjectData] = useState<CarouselData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await fetch(`/api/projects/${params.id}`)
                if (response.ok) {
                    const data = await response.json()
                    setProjectData({
                        topic: data.project.topic,
                        slides: data.project.slides,
                        brandName: data.project.brandName,
                        brandHandle: data.project.brandHandle,
                        brandImage: data.project.brandImage,
                        theme: data.project.theme,
                        hostImage: data.project.hostImage,
                        guestImage: data.project.guestImage,
                    })
                } else {
                    router.push("/") // Redirect if project not found
                }
            } catch (error) {
                console.error("Failed to load project", error)
            } finally {
                setLoading(false)
            }
        }

        if (params.id) {
            fetchProject()
        }
    }, [params.id, router])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading Editor...</span>
            </div>
        )
    }

    if (!projectData) return null

    return (
        <CarouselEditor
            initialData={projectData}
            projectId={params.id as string}
            onBack={() => router.push("/")}
        />
    )
}
