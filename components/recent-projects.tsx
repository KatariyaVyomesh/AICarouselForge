"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Clock, ArrowRight, Grid, ChevronLeft } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Project {
    id: string
    topic: string
    updatedAt: string
    slides: {
        backgroundImageUrl?: string
        heading: string
    }[]
    _count: {
        slides: number
    }
}

interface RecentProjectsProps {
    onSelectProject: (projectId: string) => void
}

const INITIAL_DISPLAY_COUNT = 4

export function RecentProjects({ onSelectProject }: RecentProjectsProps) {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showAll, setShowAll] = useState(false)

    const fetchProjects = async () => {
        try {
            const response = await fetch("/api/projects")
            if (response.ok) {
                const data = await response.json()
                setProjects(data.projects)
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayedProjects.map((project) => (
                        <Card
                            key={project.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow group relative overflow-hidden"
                            onClick={() => onSelectProject(project.id)}
                        >
                            {/* Thumbnail */}
                            <div className="h-32 bg-muted relative overflow-hidden">
                                {project.slides[0]?.backgroundImageUrl ? (
                                    <img
                                        src={project.slides[0].backgroundImageUrl}
                                        alt={project.topic}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                        <span className="text-4xl font-bold text-primary/30">
                                            {project.topic.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}

                                {/* Delete button */}
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => handleDelete(e, project.id)}
                                    disabled={deletingId === project.id}
                                >
                                    {deletingId === project.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            <CardContent className="p-4">
                                <h3 className="font-medium line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                                    {project.topic}
                                </h3>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{project._count.slides} slides</span>
                                    <span>{formatDate(project.updatedAt)}</span>
                                </div>

                                {/* Continue editing indicator */}
                                <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span>Continue editing</span>
                                    <ArrowRight className="h-3 w-3" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <ScrollArea className="w-full">
                    <div className="flex gap-4 pb-4">
                        {displayedProjects.map((project) => (
                            <Card
                                key={project.id}
                                className="flex-shrink-0 w-64 cursor-pointer hover:shadow-lg transition-shadow group relative overflow-hidden"
                                onClick={() => onSelectProject(project.id)}
                            >
                                {/* Thumbnail */}
                                <div className="h-32 bg-muted relative overflow-hidden">
                                    {project.slides[0]?.backgroundImageUrl ? (
                                        <img
                                            src={project.slides[0].backgroundImageUrl}
                                            alt={project.topic}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                            <span className="text-4xl font-bold text-primary/30">
                                                {project.topic.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Delete button */}
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => handleDelete(e, project.id)}
                                        disabled={deletingId === project.id}
                                    >
                                        {deletingId === project.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <CardContent className="p-4">
                                    <h3 className="font-medium line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                                        {project.topic}
                                    </h3>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{project._count.slides} slides</span>
                                        <span>{formatDate(project.updatedAt)}</span>
                                    </div>

                                    {/* Continue editing indicator */}
                                    <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span>Continue editing</span>
                                        <ArrowRight className="h-3 w-3" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    )
}
