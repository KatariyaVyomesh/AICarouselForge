"use client"

import React, { useState, useEffect } from "react"
import { Trash2, Edit2, ChevronDown, ChevronRight, RefreshCw, Search, X, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Slide {
    id: string
    index: number
    heading: string
    body: string
    bodyShort: string | null
    bodyLong: string | null
    suggestedImage: string
    backgroundImageUrl: string | null
    layout: string | null
}

interface BrandKit {
    id: string
    name: string
    website: string | null
    handle: string | null
    imageUrl: string | null
    colors: string
    fonts: string
    createdAt: string
    updatedAt: string
}

interface Project {
    id: string
    topic: string
    createdAt: string
    updatedAt: string
    themeId: string
    themeName: string
    themeBackground: string
    brandName: string | null
    brandHandle: string | null
    slides: Slide[]
    _count: { slides: number }
}

interface Stats {
    totalProjects: number
    totalSlides: number
    totalBrandKits: number
}

export function AdminPortal() {
    const [projects, setProjects] = useState<Project[]>([])
    const [brandKits, setBrandKits] = useState<BrandKit[]>([])
    const [activeTab, setActiveTab] = useState<"projects" | "brand-kits">("projects")
    const [stats, setStats] = useState<Stats>({ totalProjects: 0, totalSlides: 0, totalBrandKits: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedProject, setExpandedProject] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    // Alias for backward compatibility if needed, using selectedItems for both now
    const selectedProjects = selectedItems
    const setSelectedProjects = setSelectedItems
    const [editingProject, setEditingProject] = useState<string | null>(null)
    const [editingSlide, setEditingSlide] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<Record<string, string>>({})
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: "project" | "slide" | "brand" | "bulk" | "bulk-brand", id?: string } | null>(null)

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        try {
            const [projectsResult, brandsResult] = await Promise.allSettled([
                fetch("/api/admin/projects"),
                fetch("/api/admin/brand-kits")
            ])

            let newStats = { totalProjects: 0, totalSlides: 0, totalBrandKits: 0 }
            const errors: string[] = []

            // Handle Projects
            if (projectsResult.status === "fulfilled" && projectsResult.value.ok) {
                const data = await projectsResult.value.json()
                setProjects(data.projects)
                newStats = { ...newStats, ...data.stats }
            } else {
                errors.push("Failed to fetch projects")
            }

            // Handle Brand Kits
            if (brandsResult.status === "fulfilled" && brandsResult.value.ok) {
                const data = await brandsResult.value.json()
                setBrandKits(data.brandKits)
                newStats = { ...newStats, ...data.stats }
            } else {
                // Only add error if we actually care (silent fail might be ok if just starting, but better to show)
                errors.push("Failed to fetch brand kits")
            }

            // Merge stats properly - carefully to not overwrite with zeros if one succeeded
            if (projectsResult.status === "fulfilled" && projectsResult.value.ok) {
                // Already merged above
            }

            // Actually, let's just use the state update with what we have
            setStats(prev => ({
                ...prev, // Keep existing in case
                ...newStats
            }))

            if (errors.length > 0) {
                // If both failed, show generic, else show specific
                if (errors.length === 2) setError("Failed to fetch data")
                else setError(errors.join(", "))
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    const fetchProjects = fetchData // Alias to keep existing calls working


    useEffect(() => {
        fetchProjects()
    }, [])

    const handleDeleteProject = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" })
            if (!response.ok) throw new Error("Failed to delete project")
            setProjects(projects.filter(p => p.id !== id))
            setStats(prev => ({
                ...prev,
                totalProjects: prev.totalProjects - 1,
                totalSlides: prev.totalSlides - (projects.find(p => p.id === id)?._count.slides || 0)
            }))
            setDeleteConfirm(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete")
        }
    }

    const handleDeleteBrandKit = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/brand-kits/${id}`, { method: "DELETE" })
            if (!response.ok) throw new Error("Failed to delete brand kit")
            setBrandKits(brandKits.filter(b => b.id !== id))
            setStats(prev => ({ ...prev, totalBrandKits: prev.totalBrandKits - 1 }))
            setDeleteConfirm(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete")
        }
    }

    const handleBulkDelete = async () => {
        try {
            const ids = Array.from(selectedItems)
            if (activeTab === "projects") {
                const response = await fetch("/api/admin/projects", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids })
                })
                if (!response.ok) throw new Error("Failed to delete projects")
                setProjects(projects.filter(p => !selectedItems.has(p.id)))
            } else {
                const response = await fetch("/api/admin/brand-kits", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids })
                })
                if (!response.ok) throw new Error("Failed to delete brand kits")
                setBrandKits(brandKits.filter(b => !selectedItems.has(b.id)))
            }

            setSelectedItems(new Set())
            setDeleteConfirm(null)
            fetchData() // Refresh stats
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete")
        }
    }

    const handleDeleteSlide = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/slides/${id}`, { method: "DELETE" })
            if (!response.ok) throw new Error("Failed to delete slide")
            setProjects(projects.map(p => ({
                ...p,
                slides: p.slides.filter(s => s.id !== id),
                _count: { slides: p._count.slides - (p.slides.some(s => s.id === id) ? 1 : 0) }
            })))
            setStats(prev => ({ ...prev, totalSlides: prev.totalSlides - 1 }))
            setDeleteConfirm(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete")
        }
    }

    const handleUpdateProject = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: editValues[id] })
            })
            if (!response.ok) throw new Error("Failed to update project")
            const data = await response.json()
            setProjects(projects.map(p => p.id === id ? { ...p, topic: data.project.topic } : p))
            setEditingProject(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update")
        }
    }

    const handleUpdateSlide = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/slides/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    heading: editValues[`${id}_heading`],
                    body: editValues[`${id}_body`]
                })
            })
            if (!response.ok) throw new Error("Failed to update slide")
            const data = await response.json()
            setProjects(projects.map(p => ({
                ...p,
                slides: p.slides.map(s => s.id === id ? { ...s, ...data.slide } : s)
            })))
            setEditingSlide(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update")
        }
    }

    const filteredProjects = projects.filter(p =>
        p.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredBrandKits = brandKits.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.handle && b.handle.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const currentFilteredItems = activeTab === "projects" ? filteredProjects : filteredBrandKits

    const toggleSelectAll = () => {
        setSelectedItems(new Set(currentFilteredItems.map(item => item.id)))
    }


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    Admin Portal
                                </h1>
                                <p className="text-sm text-slate-400">Database Management</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchProjects}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-6 border border-blue-500/20 backdrop-blur-sm">
                        <p className="text-blue-300 text-sm font-medium">Total Projects</p>
                        <p className="text-4xl font-bold mt-2">{stats.totalProjects}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-6 border border-purple-500/20 backdrop-blur-sm">
                        <p className="text-purple-300 text-sm font-medium">Total Slides</p>
                        <p className="text-4xl font-bold mt-2">{stats.totalSlides}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-2xl p-6 border border-emerald-500/20 backdrop-blur-sm">
                        <p className="text-emerald-300 text-sm font-medium">Total Brand Kits</p>
                        <p className="text-4xl font-bold mt-2">
                            {stats.totalBrandKits}
                        </p>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-4 mb-6 border-b border-slate-800">
                    <button
                        onClick={() => {
                            setActiveTab("projects")
                            setSelectedItems(new Set())
                            setSearchQuery("")
                        }}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "projects"
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        Projects
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("brand-kits")
                            setSelectedItems(new Set())
                            setSearchQuery("")
                        }}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "brand-kits"
                            ? "border-purple-500 text-purple-400"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        Brand Kits
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                    </div>
                    {selectedProjects.size > 0 && (
                        <button
                            onClick={() => setDeleteConfirm({ type: "bulk" })}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Selected ({selectedProjects.size})
                        </button>
                    )}
                </div>

                {/* Projects Table */}
                {activeTab === "projects" && (
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800/50">
                                        <th className="p-4 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.size === filteredProjects.length && filteredProjects.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                                            />
                                        </th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Topic</th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Slides</th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Created</th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Updated</th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : filteredProjects.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                                {searchQuery ? "No projects match your search" : "No projects found"}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProjects.map((project) => (
                                            <React.Fragment key={project.id}>
                                                <tr
                                                    className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors"
                                                >
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.has(project.id)}
                                                            onChange={(e) => {
                                                                const newSelected = new Set(selectedItems)
                                                                if (e.target.checked) {
                                                                    newSelected.add(project.id)
                                                                } else {
                                                                    newSelected.delete(project.id)
                                                                }
                                                                setSelectedItems(newSelected)
                                                            }}
                                                            className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                                                                className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                                                            >
                                                                {expandedProject === project.id ? (
                                                                    <ChevronDown className="w-4 h-4" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                            {editingProject === project.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editValues[project.id] ?? project.topic}
                                                                    onChange={(e) => setEditValues({ ...editValues, [project.id]: e.target.value })}
                                                                    className="flex-1 px-3 py-1 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 outline-none"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <span className="font-medium">{project.topic}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-3 py-1 rounded-full bg-slate-700/50 text-sm">
                                                            {project._count.slides}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-400">
                                                        {new Date(project.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-400">
                                                        {new Date(project.updatedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            {editingProject === project.id ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleUpdateProject(project.id)}
                                                                        className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors"
                                                                    >
                                                                        <Save className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingProject(null)}
                                                                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingProject(project.id)
                                                                            setEditValues({ ...editValues, [project.id]: project.topic })
                                                                        }}
                                                                        className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 transition-colors"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeleteConfirm({ type: "project", id: project.id })}
                                                                        className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
                                                     
                                                     >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Expanded Slides */}
                                                {expandedProject === project.id && (
                                                    <tr>
                                                        <td colSpan={6} className="p-0">
                                                            <div className="bg-slate-800/30 border-y border-slate-700/30">
                                                                <div className="p-4 pl-16">
                                                                    <h4 className="text-sm font-medium text-slate-400 mb-3">Slides</h4>
                                                                    {project.slides.length === 0 ? (
                                                                        <p className="text-slate-500 text-sm">No slides</p>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {project.slides.map((slide) => (
                                                                                <div
                                                                                    key={slide.id}
                                                                                    className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700/30"
                                                                                >
                                                                                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-sm font-medium">
                                                                                        {slide.index + 1}
                                                                                    </span>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        {editingSlide === slide.id ? (
                                                                                            <div className="space-y-2">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={editValues[`${slide.id}_heading`] ?? slide.heading}
                                                                                                    onChange={(e) => setEditValues({
                                                                                                        ...editValues,
                                                                                                        [`${slide.id}_heading`]: e.target.value
                                                                                                    })}
                                                                                                    placeholder="Heading"
                                                                                                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 outline-none text-sm"
                                                                                                />
                                                                                                <textarea
                                                                                                    value={editValues[`${slide.id}_body`] ?? slide.body}
                                                                                                    onChange={(e) => setEditValues({
                                                                                                        ...editValues,
                                                                                                        [`${slide.id}_body`]: e.target.value
                                                                                                    })}
                                                                                                    placeholder="Body"
                                                                                                    rows={3}
                                                                                                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 outline-none text-sm resize-none"
                                                                                                />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <>
                                                                                                <p className="font-medium text-sm">{slide.heading}</p>
                                                                                                <p className="text-slate-400 text-sm mt-1 line-clamp-2">{slide.body}</p>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        {editingSlide === slide.id ? (
                                                                                            <>
                                                                                                <button
                                                                                                    onClick={() => handleUpdateSlide(slide.id)}
                                                                                                    className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors"
                                                                                                >
                                                                                                    <Save className="w-4 h-4" />
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => setEditingSlide(null)}
                                                                                                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                                                                                                >
                                                                                                    <X className="w-4 h-4" />
                                                                                                </button>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setEditingSlide(slide.id)
                                                                                                        setEditValues({
                                                                                                            ...editValues,
                                                                                                            [`${slide.id}_heading`]: slide.heading,
                                                                                                            [`${slide.id}_body`]: slide.body
                                                                                                        })
                                                                                                    }}
                                                                                                    className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 transition-colors"
                                                                                                >
                                                                                                    <Edit2 className="w-4 h-4" />
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => setDeleteConfirm({ type: "slide", id: slide.id })}
                                                                                                    className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
                                                                                                >
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                                </button>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Brand Kits Table */}
                {activeTab === "brand-kits" && (
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800/50">
                                        <th className="p-4 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.size === filteredBrandKits.length && filteredBrandKits.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                                            />
                                        </th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Name</th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Handle</th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Website</th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Created</th>
                                        <th className="p-4 text-left text-sm font-medium text-slate-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : filteredBrandKits.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                                {searchQuery ? "No brand kits match your search" : "No brand kits found"}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBrandKits.map((brand) => (
                                            <tr
                                                key={brand.id}
                                                className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors"
                                            >
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.has(brand.id)}
                                                        onChange={(e) => {
                                                            const newSelected = new Set(selectedItems)
                                                            if (e.target.checked) {
                                                                newSelected.add(brand.id)
                                                            } else {
                                                                newSelected.delete(brand.id)
                                                            }
                                                            setSelectedItems(newSelected)
                                                        }}
                                                        className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                                                    />
                                                </td>
                                                <td className="p-4 font-medium">{brand.name}</td>
                                                <td className="p-4 text-slate-400">{brand.handle || "-"}</td>
                                                <td className="p-4 text-slate-400">
                                                    {brand.website ? (
                                                        <a href={brand.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 hover:underline">
                                                            {brand.website.replace(/^https?:\/\//, '')}
                                                        </a>
                                                    ) : "-"}
                                                </td>
                                                <td className="p-4 text-sm text-slate-400">
                                                    {new Date(brand.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => setDeleteConfirm({ type: "brand", id: brand.id })}
                                                        className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-xl font-bold mb-2">Confirm Delete</h3>
                        <p className="text-slate-400 mb-6">
                            {deleteConfirm.type === "bulk"
                                ? `Are you sure you want to delete ${selectedItems.size} ${activeTab === "projects" ? "projects" : "brand kits"}? This action cannot be undone.`
                                : deleteConfirm.type === "project"
                                    ? "Are you sure you want to delete this project and all its slides? This action cannot be undone."
                                    : deleteConfirm.type === "brand"
                                        ? "Are you sure you want to delete this brand kit? This action cannot be undone."
                                        : "Are you sure you want to delete this slide? This action cannot be undone."
                            }
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteConfirm.type === "bulk") {
                                        handleBulkDelete()
                                    } else if (deleteConfirm.type === "project" && deleteConfirm.id) {
                                        handleDeleteProject(deleteConfirm.id)
                                    } else if (deleteConfirm.type === "brand" && deleteConfirm.id) {
                                        handleDeleteBrandKit(deleteConfirm.id)
                                    } else if (deleteConfirm.type === "slide" && deleteConfirm.id) {
                                        handleDeleteSlide(deleteConfirm.id)
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
