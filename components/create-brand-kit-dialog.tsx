"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Globe, Palette } from "lucide-react"

interface CreateBrandKitDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onBrandCreated: (brandKit: any) => void
}

export function CreateBrandKitDialog({ open, onOpenChange, onBrandCreated }: CreateBrandKitDialogProps) {
    const [activeTab, setActiveTab] = useState("manual")
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [url, setUrl] = useState("")
    const [name, setName] = useState("")
    const [handle, setHandle] = useState("")
    const [website, setWebsite] = useState("")
    const [imageUrl, setImageUrl] = useState("")

    // Colors
    const [colors, setColors] = useState({
        background: "#0f172a",
        text: "#f1f5f9",
        accent: "#3b82f6",
        heading: "#ffffff"
    })

    // Fonts
    const [fonts, setFonts] = useState({
        heading: "Inter",
        body: "Inter"
    })

    // Reset form when dialog opens/closes
    const resetForm = () => {
        setName("")
        setHandle("")
        setWebsite("")
        setImageUrl("")
        setUrl("")
        setColors({
            background: "#0f172a",
            text: "#f1f5f9",
            accent: "#3b82f6",
            heading: "#ffffff"
        })
        setFonts({ heading: "Inter", body: "Inter" })
    }

    const handleExtract = async () => {
        if (!url) return
        setIsLoading(true)
        try {
            const response = await fetch("/api/extract-brand", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            })

            if (!response.ok) throw new Error("Failed to extract")

            const data = await response.json()

            setName(data.name || "")
            setHandle(data.handle || "")
            setWebsite(data.website || url)
            setImageUrl(data.imageUrl || "")
            if (data.colors) setColors(prev => ({ ...prev, ...data.colors }))
            if (data.fonts) setFonts(prev => ({ ...prev, ...data.fonts }))

            // Auto switch to manual to review
            setActiveTab("manual")

        } catch (error) {
            console.error(error)
            // Show error handling (toast)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        if (!name) return
        setIsLoading(true)
        try {
            const response = await fetch("/api/brand-kits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    website,
                    handle,
                    imageUrl,
                    colors,
                    fonts
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to create brand kit")
            }

            const newBrand = await response.json()
            onBrandCreated(newBrand)
            onOpenChange(false)
            resetForm()
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val)
            if (!val) resetForm()
        }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Brand Kit</DialogTitle>
                    <DialogDescription>
                        Add a new brand identity to use in your carousels.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                        <TabsTrigger value="website">From Website</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4 py-4">
                        <div className="grid gap-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="My Brand" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="handle" className="text-right">Handle</Label>
                                <Input id="handle" value={handle} onChange={e => setHandle(e.target.value)} className="col-span-3" placeholder="@mybrand" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="website" className="text-right">Website</Label>
                                <Input id="website" value={website} onChange={e => setWebsite(e.target.value)} className="col-span-3" placeholder="https://..." />
                            </div>

                            <div className="border-t pt-4 mt-2">
                                <h4 className="mb-2 font-medium text-sm text-muted-foreground">Brand Colors</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Background</Label>
                                        <div className="flex gap-2">
                                            <Input type="color" className="w-8 h-8 p-1" value={colors.background} onChange={e => setColors({ ...colors, background: e.target.value })} />
                                            <Input value={colors.background} onChange={e => setColors({ ...colors, background: e.target.value })} className="h-8 text-xs" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Text</Label>
                                        <div className="flex gap-2">
                                            <Input type="color" className="w-8 h-8 p-1" value={colors.text} onChange={e => setColors({ ...colors, text: e.target.value })} />
                                            <Input value={colors.text} onChange={e => setColors({ ...colors, text: e.target.value })} className="h-8 text-xs" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Accent</Label>
                                        <div className="flex gap-2">
                                            <Input type="color" className="w-8 h-8 p-1" value={colors.accent} onChange={e => setColors({ ...colors, accent: e.target.value })} />
                                            <Input value={colors.accent} onChange={e => setColors({ ...colors, accent: e.target.value })} className="h-8 text-xs" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Heading</Label>
                                        <div className="flex gap-2">
                                            <Input type="color" className="w-8 h-8 p-1" value={colors.heading} onChange={e => setColors({ ...colors, heading: e.target.value })} />
                                            <Input value={colors.heading} onChange={e => setColors({ ...colors, heading: e.target.value })} className="h-8 text-xs" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="website" className="space-y-4 py-4">
                        <div className="flex flex-col gap-4">
                            <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                                <p className="flex items-center gap-2 mb-2"><Globe className="w-4 h-4" /> Auto-Extract Brand</p>
                                Enter your website URL and we'll attempt to extract your logo, name, and color palette automatically.
                            </div>
                            <div className="space-y-2">
                                <Label>Website URL</Label>
                                <Input
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleExtract} disabled={!url || isLoading} variant="secondary">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Palette className="w-4 h-4 mr-2" />}
                                Extract Brand Identity
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!name || isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Brand Kit"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
