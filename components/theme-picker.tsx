"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import type { CarouselTheme, TextureType } from "@/lib/types"
import { DEFAULT_THEMES, TEXTURE_OPTIONS } from "@/lib/types"
import { BrandKitSelector, BrandKit } from "@/components/brand-kit-selector"

interface ThemePickerProps {
  currentTheme: CarouselTheme
  onThemeChange: (theme: CarouselTheme) => void
}

export function ThemePicker({ currentTheme, onThemeChange }: ThemePickerProps) {
  const [customMode, setCustomMode] = useState(false)

  const handleBrandSelect = (brand: BrandKit | null) => {
    if (brand && brand.colors) {
      onThemeChange({
        id: `brand-${brand.id}`,
        name: brand.name,
        backgroundColor: brand.colors.background || brand.colors.primary || "#1a1a2e",
        textColor: brand.colors.text || "#ffffff",
        headingColor: brand.colors.heading || brand.colors.text || "#ffffff",
        accentColor: brand.colors.accent || brand.colors.primary || "#e94560",
      })
      setCustomMode(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Preset Themes */}
      <div className="space-y-3">
        <Label>Preset Themes</Label>
        <div className="grid grid-cols-4 gap-2">
          {DEFAULT_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onThemeChange(theme)
                setCustomMode(false)
              }}
              className={`relative h-12 rounded-lg transition-all ${currentTheme?.id === theme.id ? "ring-2 ring-primary ring-offset-2" : "hover:scale-105"
                }`}
              style={{ backgroundColor: theme.backgroundColor }}
              title={theme.name}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accentColor }} />
              </div>
              {currentTheme.id === theme.id && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Texture Picker */}
      <div className="pt-4 border-t space-y-3">
        <Label>Background Texture</Label>
        <div className="grid grid-cols-3 gap-2">
          {TEXTURE_OPTIONS.map((texture) => (
            <button
              key={texture.id}
              onClick={() => {
                onThemeChange({ ...currentTheme, texture: texture.id })
              }}
              className={`relative h-16 rounded-lg transition-all overflow-hidden ${(currentTheme.texture || "dusty") === texture.id
                ? "ring-2 ring-primary ring-offset-2"
                : "hover:scale-105"
                }`}
              style={{ backgroundColor: currentTheme.backgroundColor }}
              title={texture.description}
            >
              {/* Texture Preview */}
              {texture.id !== "none" && (
                <div
                  className="absolute inset-0 opacity-50 pointer-events-none"
                  style={
                    texture.id === "dusty"
                      ? { backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }
                      : texture.id === "grain"
                        ? { backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.7' numOctaves='3' seed='15' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")` }
                        : texture.id === "lines"
                          ? { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(128, 128, 128, 0.15) 2px, rgba(128, 128, 128, 0.15) 4px)` }
                          : texture.id === "dots"
                            ? { backgroundImage: `radial-gradient(circle, rgba(128, 128, 128, 0.3) 1px, transparent 1px)`, backgroundSize: "6px 6px" }
                            : texture.id === "grid"
                              ? { backgroundImage: `linear-gradient(rgba(128, 128, 128, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(128, 128, 128, 0.15) 1px, transparent 1px)`, backgroundSize: "12px 12px" }
                              : {}
                  }
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded bg-black/30 backdrop-blur-sm"
                  style={{ color: currentTheme.textColor }}
                >
                  {texture.name}
                </span>
              </div>
              {(currentTheme.texture || "dusty") === texture.id && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Kit Section */}
      <div className="pt-4 border-t space-y-3">
        <Label>Brand Kit</Label>
        <BrandKitSelector
          selectedBrandId={currentTheme.id?.startsWith('brand-') ? currentTheme.id.replace('brand-', '') : undefined}
          onBrandSelect={handleBrandSelect}
        />
      </div>

      {/* Custom Colors Toggle */}
      <div className="pt-4 border-t">
        <Button
          variant={customMode ? "default" : "outline"}
          size="sm"
          onClick={() => setCustomMode(!customMode)}
          className="w-full"
        >
          {customMode ? "Using Custom Colors" : "Customize Colors"}
        </Button>
      </div>

      {/* Custom Color Inputs */}
      {customMode && (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="bg-color">Background Color</Label>
            <div className="flex gap-2">
              <Input
                id="bg-color"
                type="color"
                value={currentTheme.backgroundColor}
                onChange={(e) =>
                  onThemeChange({ ...currentTheme, id: "custom", name: "Custom", backgroundColor: e.target.value })
                }
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={currentTheme.backgroundColor}
                onChange={(e) =>
                  onThemeChange({ ...currentTheme, id: "custom", name: "Custom", backgroundColor: e.target.value })
                }
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text-color">Text Color</Label>
            <div className="flex gap-2">
              <Input
                id="text-color"
                type="color"
                value={currentTheme.textColor}
                onChange={(e) =>
                  onThemeChange({ ...currentTheme, id: "custom", name: "Custom", textColor: e.target.value })
                }
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={currentTheme.textColor}
                onChange={(e) =>
                  onThemeChange({ ...currentTheme, id: "custom", name: "Custom", textColor: e.target.value })
                }
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="heading-color">Heading Color</Label>
            <div className="flex gap-2">
              <Input
                id="heading-color"
                type="color"
                value={currentTheme.headingColor}
                onChange={(e) =>
                  onThemeChange({ ...currentTheme, id: "custom", name: "Custom", headingColor: e.target.value })
                }
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={currentTheme.headingColor}
                onChange={(e) =>
                  onThemeChange({ ...currentTheme, id: "custom", name: "Custom", headingColor: e.target.value })
                }
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accent-color">Accent Color</Label>
            <div className="flex gap-2">
              <Input
                id="accent-color"
                type="color"
                value={currentTheme.accentColor}
                onChange={(e) =>
                  onThemeChange({ ...currentTheme, id: "custom", name: "Custom", accentColor: e.target.value })
                }
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={currentTheme.accentColor}
                onChange={(e) =>
                  onThemeChange({ ...currentTheme, id: "custom", name: "Custom", accentColor: e.target.value })
                }
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
