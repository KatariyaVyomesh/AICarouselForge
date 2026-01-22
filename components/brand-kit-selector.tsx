"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, Plus, Paintbrush } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { CreateBrandKitDialog } from "./create-brand-kit-dialog"

export interface BrandKit {
    id: string
    name: string
    colors: any
    fonts: any
    handle?: string
    website?: string
}

interface BrandKitSelectorProps {
    selectedBrandId?: string
    onBrandSelect: (brand: BrandKit | null) => void
}

export function BrandKitSelector({ selectedBrandId, onBrandSelect }: BrandKitSelectorProps) {
    const [open, setOpen] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [brands, setBrands] = useState<BrandKit[]>([])
    const [loading, setLoading] = useState(true)

    const fetchBrands = async () => {
        try {
            const res = await fetch("/api/brand-kits")
            if (res.ok) {
                const data = await res.json()
                // Parse JSON strings in colors/fonts if they come as strings from DB
                const parsed = data.map((b: any) => ({
                    ...b,
                    colors: typeof b.colors === 'string' ? JSON.parse(b.colors) : b.colors,
                    fonts: typeof b.fonts === 'string' ? JSON.parse(b.fonts) : b.fonts
                }))
                setBrands(parsed)
            }
        } catch (e) {
            console.error("Failed to fetch brands", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBrands()
    }, [])

    const selectedBrand = brands.find(b => b.id === selectedBrandId)

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {selectedBrand ? (
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded-full border"
                                    style={{ background: selectedBrand.colors.accent || '#000' }}
                                />
                                {selectedBrand.name}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Paintbrush className="w-4 h-4" />
                                Select Brand Kit (Optional)
                            </div>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                    <Command>
                        <CommandInput placeholder="Search brand kits..." />
                        <CommandList>
                            <CommandEmpty>No brand kit found.</CommandEmpty>
                            <CommandGroup heading="My Brands">
                                <CommandItem
                                    onSelect={() => {
                                        onBrandSelect(null)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            !selectedBrandId ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    None (Default Style)
                                </CommandItem>
                                {brands.map((brand) => (
                                    <CommandItem
                                        key={brand.id}
                                        value={brand.name}
                                        onSelect={() => {
                                            onBrandSelect(brand)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedBrandId === brand.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div
                                            className="w-3 h-3 rounded-full mr-2 border"
                                            style={{ background: brand.colors.accent || '#000' }}
                                        />
                                        {brand.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandGroup>
                                <CommandItem onSelect={() => {
                                    setOpen(false)
                                    setDialogOpen(true)
                                }} className="text-primary cursor-pointer">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New Brand Kit
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <CreateBrandKitDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onBrandCreated={(newBrand) => {
                    // Refresh list and select new brand
                    fetchBrands().then(() => {
                        // We need to find the fully parsed object from the new list ideally, 
                        // or just optimistically add it. Let's fetch to be safe.
                        // But we can also just select it by ID if we trust the refresh.
                    })
                    // Manually parsing the response to immediately select it without waiting for re-fetch
                    const parsed = {
                        ...newBrand,
                        colors: typeof newBrand.colors === 'string' ? JSON.parse(newBrand.colors) : newBrand.colors,
                        fonts: typeof newBrand.fonts === 'string' ? JSON.parse(newBrand.fonts) : newBrand.fonts
                    }
                    setBrands(prev => [parsed, ...prev])
                    onBrandSelect(parsed)
                }}
            />
        </div>
    )
}
