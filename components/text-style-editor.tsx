"use client"

import { TextStyle } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Button } from "@/components/ui/button"
import {
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Italic,
    Underline,
    Bold,
    Type
} from "lucide-react"

interface TextStyleEditorProps {
    style?: TextStyle
    onChange: (updates: TextStyle) => void
    label: string
}

export function TextStyleEditor({ style, onChange, label }: TextStyleEditorProps) {
    const currentStyle: TextStyle = {
        fontSizePercent: 100,
        fontWeight: "bold", // Default for headings usually
        fontStyle: "normal",
        textDecoration: "none",
        textAlign: "left",
        maxWidthPercent: 100,
        ...style
    }

    const handleUpdate = (updates: Partial<TextStyle>) => {
        onChange({ ...currentStyle, ...updates })
    }

    return (
        <div className="space-y-4 p-3 bg-muted/30 rounded-lg border mt-2">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Type className="w-3 h-3" /> {label} Style
                </h4>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => onChange({})} // Reset to defaults (empty object means use layout defaults)
                >
                    Reset
                </Button>
            </div>

            {/* Font Size & Width */}
            <div className="space-y-3">
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Label className="text-xs">Size</Label>
                        <span className="text-[10px] text-muted-foreground">{currentStyle.fontSizePercent ?? 100}%</span>
                    </div>
                    <Slider
                        value={[currentStyle.fontSizePercent ?? 100]}
                        min={50}
                        max={200}
                        step={5}
                        onValueChange={(val) => handleUpdate({ fontSizePercent: val[0] })}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Label className="text-xs">Max Width</Label>
                        <span className="text-[10px] text-muted-foreground">{currentStyle.maxWidthPercent ?? 100}%</span>
                    </div>
                    <Slider
                        value={[currentStyle.maxWidthPercent ?? 100]}
                        min={20}
                        max={100}
                        step={5}
                        onValueChange={(val) => handleUpdate({ maxWidthPercent: val[0] })}
                    />
                </div>
            </div>

            {/* Alignment */}
            <div className="space-y-2">
                <Label className="text-xs">Alignment</Label>
                <ToggleGroup
                    type="single"
                    value={currentStyle.textAlign}
                    onValueChange={(val) => val && handleUpdate({ textAlign: val as any })}
                    className="justify-start w-full border rounded-md p-1 bg-background"
                >
                    <ToggleGroupItem value="left" size="sm" aria-label="Left Align" className="flex-1 h-7">
                        <AlignLeft className="h-3 w-3" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center" size="sm" aria-label="Center Align" className="flex-1 h-7">
                        <AlignCenter className="h-3 w-3" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right" size="sm" aria-label="Right Align" className="flex-1 h-7">
                        <AlignRight className="h-3 w-3" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="justify" size="sm" aria-label="Justify" className="flex-1 h-7">
                        <AlignJustify className="h-3 w-3" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            {/* Text Styles */}
            <div className="space-y-2">
                <Label className="text-xs">Style</Label>
                <div className="flex gap-1 h-8 border rounded-md bg-background p-1 items-center">
                    <Button
                        variant={currentStyle.fontWeight === "bold" ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 h-full px-0"
                        onClick={() => handleUpdate({ fontWeight: currentStyle.fontWeight === "bold" ? "normal" : "bold" })}
                    >
                        <Bold className="h-3 w-3" />
                    </Button>
                    <div className="w-[1px] bg-border h-4" />
                    <Button
                        variant={currentStyle.fontStyle === "italic" ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 h-full px-0"
                        onClick={() => handleUpdate({ fontStyle: currentStyle.fontStyle === "italic" ? "normal" : "italic" })}
                    >
                        <Italic className="h-3 w-3" />
                    </Button>
                    <div className="w-[1px] bg-border h-4" />
                    <Button
                        variant={currentStyle.textDecoration === "underline" ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 h-full px-0"
                        onClick={() => handleUpdate({ textDecoration: currentStyle.textDecoration === "underline" ? "none" : "underline" })}
                    >
                        <Underline className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
