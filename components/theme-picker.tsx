"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import type { CarouselTheme } from "@/lib/types"
import { DEFAULT_THEMES } from "@/lib/types"

interface ThemePickerProps {
  currentTheme: CarouselTheme
  onThemeChange: (theme: CarouselTheme) => void
}

export function ThemePicker({ currentTheme, onThemeChange }: ThemePickerProps) {
  const [customMode, setCustomMode] = useState(false)

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
              className={`relative h-12 rounded-lg transition-all ${
                currentTheme.id === theme.id ? "ring-2 ring-primary ring-offset-2" : "hover:scale-105"
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
