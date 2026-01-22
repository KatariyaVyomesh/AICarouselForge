"use client"

import { Label } from "@/components/ui/label"
import { Check, Sparkles, ImageIcon } from "lucide-react"
import type { CarouselTheme, LayoutType } from "@/lib/types"
import { LAYOUT_OPTIONS } from "@/lib/types"

interface LayoutPickerProps {
  currentLayout: LayoutType
  onLayoutChange: (layout: LayoutType) => void
  theme: CarouselTheme
}

export function LayoutPicker({ currentLayout, onLayoutChange, theme }: LayoutPickerProps) {
  const currentConfig = LAYOUT_OPTIONS.find((l) => l.id === currentLayout)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Choose Layout</Label>
        {currentConfig && (
          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {currentConfig.contentSize} content
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onLayoutChange(option.id as LayoutType)}
            className={`relative p-3 rounded-lg border text-left transition-all ${
              currentLayout === option.id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            {/* Layout Preview Thumbnail */}
            <div
              className="h-16 rounded mb-2 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: theme.backgroundColor }}
            >
              <LayoutThumbnail layout={option.id as LayoutType} theme={theme} />
            </div>
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium">{option.name}</p>
              {option.hasImageArea && <ImageIcon className="h-3 w-3 text-muted-foreground" />}
              {option.contentSize !== "standard" && !option.hasImageArea && (
                <Sparkles className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{option.description}</p>
            {currentLayout === option.id && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function LayoutThumbnail({ layout, theme }: { layout: LayoutType; theme: CarouselTheme }) {
  const accentStyle = { backgroundColor: theme.accentColor }
  const textStyle = { backgroundColor: theme.textColor + "40" }

  switch (layout) {
    case "arch-left":
      return (
        <div className="flex w-full h-full">
          <div
            className="w-8 h-12 m-1"
            style={{
              backgroundColor: theme.accentColor + "40",
              borderRadius: "0 40% 0 0",
            }}
          />
          <div className="flex-1 flex flex-col justify-center gap-1 px-1">
            <div className="w-6 h-1 rounded" style={textStyle} />
            <div className="w-4 h-1 rounded" style={textStyle} />
          </div>
        </div>
      )
    case "arch-right":
      return (
        <div className="flex w-full h-full">
          <div className="flex-1 flex flex-col justify-center gap-1 px-1">
            <div className="w-6 h-1 rounded" style={textStyle} />
            <div className="w-4 h-1 rounded" style={textStyle} />
          </div>
          <div
            className="w-8 h-12 m-1"
            style={{
              backgroundColor: theme.accentColor + "40",
              borderRadius: "40% 0 0 0",
            }}
          />
        </div>
      )
    case "circle-frame":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full" style={{ backgroundColor: theme.accentColor + "40" }} />
          <div className="w-6 h-1 rounded" style={textStyle} />
        </div>
      )
    case "diagonal-split":
      return (
        <div className="relative w-full h-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: theme.accentColor + "40",
              clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 100%)",
            }}
          />
          <div className="absolute bottom-1 left-1 flex flex-col gap-0.5">
            <div className="w-8 h-1 rounded" style={textStyle} />
            <div className="w-6 h-1 rounded" style={textStyle} />
          </div>
        </div>
      )
    case "centered":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-1 rounded" style={textStyle} />
          <div className="w-12 h-1 rounded" style={textStyle} />
        </div>
      )
    case "split-left":
      return (
        <div className="flex w-full h-full">
          <div className="flex-1 flex flex-col justify-center gap-1 px-2">
            <div className="w-8 h-1 rounded" style={textStyle} />
            <div className="w-6 h-1 rounded" style={textStyle} />
          </div>
          <div className="w-6" style={accentStyle} />
        </div>
      )
    case "split-right":
      return (
        <div className="flex w-full h-full">
          <div className="w-6" style={accentStyle} />
          <div className="flex-1 flex flex-col justify-center gap-1 px-2">
            <div className="w-8 h-1 rounded" style={textStyle} />
            <div className="w-6 h-1 rounded" style={textStyle} />
          </div>
        </div>
      )
    case "card":
      return (
        <div className="w-12 h-10 rounded bg-white/10 flex flex-col items-center justify-center gap-1 p-1">
          <div className="w-6 h-0.5 rounded" style={textStyle} />
          <div className="w-8 h-0.5 rounded" style={textStyle} />
        </div>
      )
    case "minimal":
      return (
        <div className="flex flex-col justify-end w-full h-full p-2">
          <div className="w-8 h-1 rounded" style={textStyle} />
        </div>
      )
    case "bold":
      return (
        <div className="flex flex-col gap-1 px-2">
          <div className="w-12 h-2 rounded" style={textStyle} />
          <div className="w-8 h-1 rounded" style={textStyle} />
        </div>
      )
    case "quote":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs" style={{ color: theme.accentColor }}>
            "
          </div>
          <div className="w-10 h-1 rounded" style={textStyle} />
        </div>
      )
    case "numbered":
      return (
        <div className="flex w-full h-full">
          <div className="w-6 flex items-center justify-center" style={accentStyle}>
            <span className="text-xs font-bold" style={{ color: theme.backgroundColor }}>
              01
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1 px-2">
            <div className="w-8 h-1 rounded" style={textStyle} />
          </div>
        </div>
      )
    case "gradient-text":
      return (
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-10 h-1.5 rounded"
            style={{ background: `linear-gradient(90deg, ${theme.accentColor}, ${theme.headingColor})` }}
          />
          <div className="w-8 h-1 rounded" style={textStyle} />
        </div>
      )
    case "sidebar":
      return (
        <div className="flex w-full h-full">
          <div className="w-1" style={accentStyle} />
          <div className="flex-1 flex flex-col justify-center gap-1 px-2">
            <div className="w-8 h-1 rounded" style={textStyle} />
            <div className="w-6 h-1 rounded" style={textStyle} />
          </div>
        </div>
      )
    case "stacked":
      return (
        <div className="flex flex-col w-full h-full">
          <div className="h-3" style={{ backgroundColor: theme.accentColor + "40" }} />
          <div className="flex-1 flex flex-col justify-center gap-1 px-2">
            <div className="w-8 h-1 rounded" style={textStyle} />
          </div>
        </div>
      )
    case "magazine":
      return (
        <div className="flex flex-col w-full h-full p-2">
          <div className="w-4 h-0.5 rounded mb-auto" style={accentStyle} />
          <div className="w-10 h-1 rounded mb-1" style={textStyle} />
          <div className="w-8 h-0.5 rounded" style={textStyle} />
        </div>
      )
    default:
      return null
  }
}
