"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Clock, ArrowRight, Grid, ChevronLeft } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SlidePreview } from "@/components/slide-preview"
import type { CarouselTheme, CarouselSlide } from "@/lib/types"

interface Project {
    id: string
    topic: string
    updatedAt: string
    themeName: string
    themeBackground: string
    themeText: string
    themeAccent: string
    themeHeading: string
    brandName: string
    brandHandle: string
    brandImage: string | null
    slides: CarouselSlide[]
    _count: {
        slides: number
    }
}

interface RecentProjectsProps {
    onSelectProject: (projectId: string) => void
}

const INITIAL_DISPLAY_COUNT = 4
const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}

const ProjectCard = ({
    project,
    onClick,
    onDelete,
    isDeleting,
    className
}: {
    project: Project
    onClick: () => void
    onDelete: (e: React.MouseEvent, id: string) => void
    isDeleting: boolean
    className?: string
}) => {
    const [activeSlideIndex, setActiveSlideIndex] = useState(0)
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isHovered && project.slides.length > 1) {
            interval = setInterval(() => {
                setActiveSlideIndex((prev) => (prev + 1) % project.slides.length)
            }, 1500)
        } else {
            setActiveSlideIndex(0)
        }
        return () => clearInterval(interval)
    }, [isHovered, project.slides.length])

    const currentSlide = project.slides[activeSlideIndex]

    // Construct theme object
    const theme: CarouselTheme = {
        id: "preview",
        name: project.themeName,
        backgroundColor: project.themeBackground,
        textColor: project.themeText,
        accentColor: project.themeAccent,
        headingColor: project.themeHeading,
    }

    const observerRef = useRef<ResizeObserver | null>(null)
    const [scale, setScale] = useState(0)

    const containerRef = useCallback((node: HTMLDivElement | null) => {
        if (node) {
            // Initial measure
            const initialWidth = node.getBoundingClientRect().width
            if (initialWidth > 0) {
                setScale(initialWidth / 1080)
            }

            // Setup observer using contentRect for accuracy
            if (observerRef.current) observerRef.current.disconnect()
            observerRef.current = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.contentRect.width > 0) {
                        setScale(entry.contentRect.width / 1080)
                    }
                }
            })
            observerRef.current.observe(node)
        } else {
            // Cleanup when node is removed
            if (observerRef.current) observerRef.current.disconnect()
        }
    }, [])

    // Cleanup observer on unmount
    useEffect(() => {
        return () => {
            if (observerRef.current) observerRef.current.disconnect()
        }
    }, [])

    return (
        <Card
            className={className}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Thumbnail Container */}
            <div
                ref={containerRef}
                className="aspect-[4/5] w-full bg-muted relative overflow-hidden group-hover:shadow-md transition-all"
            >
                {/* Scaled Preview Wrapper */}
                <div
                    className="absolute inset-0 w-full h-full origin-top-left transition-opacity duration-300"
                    style={{ opacity: scale > 0 ? 1 : 0 }}
                >
                    <div
                        className="transition-all duration-500 ease-in-out"
                        style={{
                            width: '1080px',
                            height: '1350px',
                            transform: `scale(${scale})`,
                            transformOrigin: "top left",
                        }}
                        key={activeSlideIndex}
                    >
                        <div className="w-full h-full animate-fadeIn">
                            <SlidePreview
                                slide={currentSlide}
                                theme={theme}
                                layout={currentSlide.layout}
                                slideNumber={activeSlideIndex + 1}
                                totalSlides={project._count.slides}
                                brandName={project.brandName}
                                brandHandle={project.brandHandle}
                                brandImage={project.brandImage}
                            />
                        </div>
                    </div>
                </div>{/* Overlay for interaction (so clicks register on card, not specific slide elements) */}
                <div className="absolute inset-0 bg-transparent z-10" />

                {/* Progress Indicators (dots) */}
                {isHovered && project.slides.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1 z-20 px-2 pointer-events-none">
                        {project.slides.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === activeSlideIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Delete button */}
                <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                    onClick={(e) => onDelete(e, project.id)}
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                </Button>
            </div>

            <CardContent className="p-3">
                <h3 className="font-medium line-clamp-1 text-sm mb-1 group-hover:text-primary transition-colors">
                    {project.topic}
                </h3>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wide">
                    <span>{project._count.slides} slides</span>
                    <span>{formatDate(project.updatedAt)}</span>
                </div>
            </CardContent>
        </Card>
    )
}

export function RecentProjects({ onSelectProject }: RecentProjectsProps) {
    // Component logic remains similar, relying on fetchProjects to get data matching new Interface
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showAll, setShowAll] = useState(false)

    const fetchProjects = async () => {
        try {
            const response = await fetch("/api/projects")
            if (response.ok) {
                const data = await response.json()
                // Parse customTexts if it is a string (legacy/db format compatibility)
                const projectsWithParsedData = data.projects.map((project: any) => ({
                    ...project,
                    slides: project.slides.map((slide: any) => ({
                        ...slide,
                        customTexts: typeof slide.customTexts === 'string'
                            ? JSON.parse(slide.customTexts)
                            : (slide.customTexts || [])
                    }))
                }))
                setProjects(projectsWithParsedData)
            }
        } catch (error) {
            console.error("Failed to fetch projects:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProjects()
    }, [])

    const handleDelete = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation()
        if (!confirm("Are you sure you want to delete this project?")) return

        setDeletingId(projectId)
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: "DELETE",
            })
            if (response.ok) {
                setProjects((prev) => prev.filter((p) => p.id !== projectId))
            }
        } catch (error) {
            console.error("Failed to delete project:", error)
        } finally {
            setDeletingId(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (projects.length === 0) {
        return null
    }

    const displayedProjects = showAll ? projects : projects.slice(0, INITIAL_DISPLAY_COUNT)
    const hasMoreProjects = projects.length > INITIAL_DISPLAY_COUNT

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Recent Projects
                </h2>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{projects.length} projects</span>
                    {hasMoreProjects && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAll(!showAll)}
                            className="flex items-center gap-1.5"
                        >
                            {showAll ? (
                                <>
                                    <ChevronLeft className="h-4 w-4" />
                                    Show Less
                                </>
                            ) : (
                                <>
                                    <Grid className="h-4 w-4" />
                                    View All
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {showAll ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {displayedProjects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onClick={() => onSelectProject(project.id)}
                            onDelete={handleDelete}
                            isDeleting={deletingId === project.id}
                            className="cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 duration-300 group relative overflow-hidden border-0 bg-transparent"
                        />
                    ))}
                </div>
            ) : (
                <ScrollArea className="w-full">
                    <div className="flex gap-4 pb-4">
                        {displayedProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onClick={() => onSelectProject(project.id)}
                                onDelete={handleDelete}
                                isDeleting={deletingId === project.id}
                                className="flex-shrink-0 w-[240px] cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 duration-300 group relative overflow-hidden border-0 bg-transparent"
                            />
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    )
}