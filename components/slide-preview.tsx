"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import type { CarouselSlide, CarouselTheme, LayoutType, CustomText, TextStyle } from "@/lib/types"
import { getBodyForLayout } from "@/lib/types"
import { Quote, Loader2, Upload, Move } from "lucide-react"
import { getTemplateById } from "@/lib/templates"

interface SlidePreviewProps {
  slide: CarouselSlide
  theme: CarouselTheme
  layout: LayoutType
  slideNumber: number
  totalSlides: number
  authorName?: string
  category?: string
  websiteUrl?: string

  brandName?: string
  brandHandle?: string
  brandImage?: string | null
  showBrandImage?: boolean
  showBranding?: boolean
  onBrandNameChange?: (name: string) => void
  onBrandHandleChange?: (handle: string) => void
  onBrandImageChange?: (image: string | null) => void
  onCustomTextMove?: (textId: string, x: number, y: number) => void
  templateId?: string
}

function formatHeadingWithHighlight(heading: string, accentColor: string) {
  const words = heading.split(" ")
  if (words.length <= 2) {
    // Short heading - highlight all
    return (
      <span className="px-2 py-1 inline-block" style={{ backgroundColor: accentColor }}>
        {heading}
      </span>
    )
  }

  // Split into lines and highlight last word
  const lastWord = words.pop()
  const restOfWords = words.join(" ")

  return (
    <>
      <span className="block">{restOfWords}</span>
      <span className="px-3 py-1 inline-block mt-1" style={{ backgroundColor: accentColor, color: "#ffffff" }}>
        {lastWord}
      </span>
    </>
  )
}

function formatMultiLineHeading(heading: string) {
  const words = heading.split(" ")
  if (words.length <= 3) return heading

  // Split into 2-3 lines for visual impact
  const midpoint = Math.ceil(words.length / 2)
  const line1 = words.slice(0, midpoint).join(" ")
  const line2 = words.slice(midpoint).join(" ")

  return (
    <>
      <span className="block">{line1}</span>
      <span className="block">{line2}</span>
    </>
  )
}

interface StyledTextProps {
  as?: React.ElementType
  className?: string
  style?: TextStyle
  children: React.ReactNode
  defaultColor?: string
}

function StyledText({
  as: Component = "p",
  className,
  style,
  children,
  defaultColor
}: StyledTextProps) {
  // Container styles (block level)
  const containerStyles: React.CSSProperties = {
    textAlign: style?.textAlign,
    maxWidth: style?.maxWidthPercent ? `${style.maxWidthPercent}%` : undefined,
    marginLeft: style?.textAlign === 'center' || style?.textAlign === 'justify' ? 'auto' : undefined,
    marginRight: style?.textAlign === 'center' || style?.textAlign === 'justify' ? 'auto' : undefined,
    color: defaultColor
  }

  // Text styles (inline level - relative to parent)
  const spanStyles: React.CSSProperties = {
    fontSize: style?.fontSizePercent ? `${style.fontSizePercent}%` : undefined,
    fontWeight: style?.fontWeight,
    fontStyle: style?.fontStyle,
    textDecoration: style?.textDecoration,
    color: style?.color,
    display: 'inline-block', // Helps with transforms if we added them
    width: '100%' // Ensure it takes full width of container if needed
  }

  return (
    <Component className={className} style={containerStyles}>
      <span style={spanStyles}>{children}</span>
    </Component>
  )
}

export function SlidePreview({
  slide,
  theme,
  layout,
  slideNumber,
  totalSlides,
  authorName = "Your Name",
  category = "Tips",

  brandName = "Your Name",
  brandHandle = "@handle",
  brandImage = null,
  showBrandImage = true,
  showBranding = true,
  onBrandNameChange,
  onBrandHandleChange,
  onBrandImageChange,
  onCustomTextMove,
  templateId,
}: SlidePreviewProps) {
  // Use getBodyForLayout which respects user's explicit Short/Long choice and falls back to layout logic
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slideContainerRef = useRef<HTMLDivElement>(null)
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null)

  const bodyText = getBodyForLayout(slide, layout)
  const hasImage = !!slide.backgroundImageUrl

  // Handle keyboard navigation for custom text
  useEffect(() => {
    if (!selectedTextId || !onCustomTextMove) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedText = slide.customTexts?.find((t) => t.id === selectedTextId)
      if (!selectedText) return

      // If the user is typing in an input or textarea, don't capture arrow keys
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const step = 2 // Move by 2% each key press
      let newX = selectedText.x
      let newY = selectedText.y

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          newY = Math.max(0, selectedText.y - step)
          break
        case "ArrowDown":
          e.preventDefault()
          newY = Math.min(100, selectedText.y + step)
          break
        case "ArrowLeft":
          e.preventDefault()
          newX = Math.max(0, selectedText.x - step)
          break
        case "ArrowRight":
          e.preventDefault()
          newX = Math.min(100, selectedText.x + step)
          break
        case "Escape":
          setSelectedTextId(null)
          return
        default:
          return
      }

      onCustomTextMove(selectedTextId, newX, newY)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedTextId, slide.customTexts, onCustomTextMove])

  // Handle mouse drag for custom text
  useEffect(() => {
    if (!draggingTextId || !onCustomTextMove || !slideContainerRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = slideContainerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      // Clamp values between 0 and 100
      const clampedX = Math.max(0, Math.min(100, x))
      const clampedY = Math.max(0, Math.min(100, y))

      onCustomTextMove(draggingTextId, clampedX, clampedY)
    }

    const handleMouseUp = () => {
      setDraggingTextId(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [draggingTextId, onCustomTextMove])

  const renderPaperTexture = () => {
    const textureType = theme.texture || "dusty" // Default to dusty if not specified

    if (textureType === "none") return null

    const getTextureStyles = (): React.CSSProperties => {
      switch (textureType) {
        case "dusty":
          return {
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }
        case "grain":
          return {
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.7' numOctaves='3' seed='15' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
          }
        case "lines":
          return {
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(255, 255, 255, 0.08) 3px,
              rgba(255, 255, 255, 0.08) 4px
            )`,
          }
        case "dots":
          return {
            backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.15) 1.5px, transparent 1.5px)`,
            backgroundSize: "12px 12px",
          }
        case "grid":
          return {
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }
        default:
          return {}
      }
    }

    // Use higher opacity for lines/dots/grid since they have subtle patterns
    const getOpacity = () => {
      if (textureType === "lines" || textureType === "dots" || textureType === "grid") {
        return "opacity-80"
      }
      return "opacity-30"
    }

    return (
      <div
        className={`absolute inset-0 ${getOpacity()} pointer-events-none`}
        style={getTextureStyles()}
      />
    )
  }

  const renderArrowDecor = (position: "left" | "right" = "left") => (
    <div
      className={`absolute ${position === "left" ? "left-6" : "right-6"} top-1/2 -translate-y-1/2`}
      style={{ color: theme.accentColor }}
    >
      <svg
        width="40"
        height="24"
        viewBox="0 0 40 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {position === "left" ? <path d="M0 12H36M28 4L36 12L28 20" /> : <path d="M40 12H4M12 4L4 12L12 20" />}
      </svg>
    </div>
  )

  const renderHeader = () => (
    <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 py-4 text-xs font-medium z-20">
      <span style={{ color: theme.textColor }}>{authorName}</span>
      <span style={{ color: theme.textColor }}>{category}</span>
    </div>
  )

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onBrandImageChange) {
      const reader = new FileReader()
      reader.onloadend = () => {
        onBrandImageChange(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const renderBranding = () => {
    if (!showBranding) return null

    return (
      <div className="absolute bottom-3 left-3 z-30 flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleImageUpload}
        />

        {/* Profile Image - Click/Double click to upload */}
        {showBrandImage && (
          <div
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-sm cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0 bg-muted"
            style={{ backgroundColor: theme.accentColor }}
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload profile picture"
          >
            {brandImage ? (
              <img src={brandImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/80 font-bold text-sm">
                {brandName.charAt(0)}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col">
          <span
            className="font-bold text-sm leading-tight"
            style={{ color: theme.headingColor }}
          >
            {brandName}
          </span>

          <span
            className="text-xs opacity-70 leading-tight"
            style={{ color: theme.textColor }}
          >
            {brandHandle}
          </span>
        </div>
      </div>
    )
  }

  const renderDecorations = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 400 400">
      <ellipse cx="350" cy="80" rx="80" ry="60" fill={theme.accentColor} opacity="0.15" />
      <ellipse cx="30" cy="350" rx="60" ry="80" fill={theme.accentColor} opacity="0.1" />
      <circle cx="380" cy="380" r="40" fill={theme.accentColor} opacity="0.08" />
    </svg>
  )

  const renderCrossDecor = () => (
    <div className="absolute top-16 left-6 text-3xl font-light z-20" style={{ color: theme.accentColor, opacity: 0.5 }}>
      +
    </div>
  )

  const getTextColor = (colorType: CustomText["color"]) => {
    switch (colorType) {
      case "heading": return theme.headingColor
      case "text": return theme.textColor
      case "accent": return theme.accentColor
      case "white": return "#ffffff"
      case "black": return "#000000"
      default: return theme.textColor
    }
  }

  const getFontSizeClass = (size: CustomText["fontSize"]) => {
    switch (size) {
      case "sm": return "text-sm"
      case "base": return "text-base"
      case "lg": return "text-lg"
      case "xl": return "text-xl"
      case "2xl": return "text-2xl"
      case "3xl": return "text-3xl"
      default: return "text-base"
    }
  }

  const getFontWeightClass = (weight: CustomText["fontWeight"]) => {
    switch (weight) {
      case "normal": return "font-normal"
      case "medium": return "font-medium"
      case "semibold": return "font-semibold"
      case "bold": return "font-bold"
      case "black": return "font-black"
      default: return "font-normal"
    }
  }

  const renderCustomTexts = () => {
    if (!slide.customTexts || slide.customTexts.length === 0) return null

    return (
      <>
        {slide.customTexts.map((customText) => {
          const isSelected = selectedTextId === customText.id
          const isDragging = draggingTextId === customText.id
          return (
            <div
              key={customText.id}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedTextId(customText.id)
                setDraggingTextId(customText.id)
              }}
              onClick={(e) => {
                e.stopPropagation()
              }}
              className={`absolute z-40 transition-all select-none ${getFontSizeClass(customText.fontSize)} ${getFontWeightClass(customText.fontWeight)} ${isSelected ? "ring-2 ring-blue-500 ring-offset-2 rounded px-1" : "hover:ring-2 hover:ring-blue-300 hover:ring-offset-1 rounded px-1"
                }`}
              style={{
                left: `${customText.x}%`,
                top: `${customText.y}%`,
                transform: "translate(-50%, -50%)",
                color: getTextColor(customText.color),
                textShadow: customText.color === "white" ? "0 1px 3px rgba(0,0,0,0.5)" : "none",
                cursor: isDragging ? "grabbing" : "grab",
              }}
              title="Drag to move, or use arrow keys when selected"
            >
              {isSelected && (
                <Move className="absolute -top-5 left-1/2 -translate-x-1/2 h-4 w-4 text-blue-500" />
              )}
              {customText.text}
            </div>
          )
        })}
      </>
    )
  }

  // V2 Rendering Engine
  const renderTemplateLayout = () => {
    if (!templateId) return null
    // Type assertion or update import to get V2 type
    const template = getTemplateById(templateId) as any
    if (!template) return null

    // Determine which set of layers to use
    let layers = template.layers || []

    // Use Intro Layers for Slide 1 (if defined)
    if (slideNumber === 1 && template.introLayers) {
      layers = template.introLayers
    }
    // Use Outro Layers for Last Slide (if defined)
    else if (slideNumber === totalSlides && template.outroLayers) {
      layers = template.outroLayers
    }

    // Helper to generate Google Fonts URL
    const fontFamilies = template.fonts?.join("|").replace(/ /g, "+")

    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* Inject Google Fonts */}
        {fontFamilies && (
          <style dangerouslySetInnerHTML={{
            __html: `@import url('https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;500;600;700;800;900&display=swap');`
          }} />
        )}

        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            background: template.backgroundStyle?.value || theme.backgroundColor,
          }}
        >
          {layers.sort((a: any, b: any) => a.zIndex - b.zIndex).map((layer: any, idx: number) => {
            const baseStyle: React.CSSProperties = {
              position: "absolute",
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: layer.width ? `${layer.width}%` : undefined,
              height: layer.height ? `${layer.height}%` : undefined,
              transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
              opacity: layer.opacity ?? 1,
              zIndex: layer.zIndex,
              mixBlendMode: layer.blendMode as any,
            }

            // SHAPE LAYER
            if (layer.type === "shape") {
              return (
                <div
                  key={`${layer.id}-${idx}`}
                  style={{
                    ...baseStyle,
                    background: layer.fill,
                    border: layer.stroke ? `${layer.strokeWidth || 1}px solid ${layer.stroke}` : undefined,
                    borderRadius: layer.shapeType === "circle" ? "50%" : layer.borderRadius ? `${layer.borderRadius}px` : undefined,
                    boxShadow: layer.shadow,
                    backdropFilter: layer.blur ? `blur(${layer.blur}px)` : undefined,
                  }}
                />
              )
            }

            // IMAGE LAYER
            if (layer.type === "image") {
              // Determine which image to show
              let imgSrc = layer.src
              // If it's a dynamic image slot
              if (layer.id === "bg-image" || layer.id === "user-image") {
                if (hasImage) {
                  imgSrc = slide.backgroundImageUrl
                } else {
                  // Placeholder or hide if no image?
                  // If the template relies on an image (like split view), show a placeholder or keep transparent
                  return null
                }
              }

              if (!imgSrc) return null

              return (
                <div
                  key={`${layer.id}-${idx}`}
                  style={{
                    ...baseStyle,
                    overflow: "hidden",
                    // Apply mask to the container
                    clipPath: layer.mask,
                    borderRadius: layer.borderRadius,
                  }}
                >
                  <img
                    src={imgSrc}
                    alt="Visual"
                    className="w-full h-full object-cover"
                    style={{
                      // Apply filters?
                    }}
                  />
                </div>
              )
            }

            // TEXT LAYER
            if (layer.type === "text") {
              const ts = layer.textStyle || {}
              const commonStyle = {
                ...baseStyle,
                fontFamily: ts.fontFamily ? `'${ts.fontFamily}', sans-serif` : undefined,
                fontWeight: ts.weight,
                fontSize: ts.fontSize ? `${ts.fontSize}rem` : undefined,
                color: ts.color,
                textAlign: ts.align as any,
                textTransform: ts.case as any,
                letterSpacing: ts.letterSpacing,
                lineHeight: ts.lineHeight,
                textShadow: ts.shadow,
                padding: ts.padding,
                background: ts.background,
                whiteSpace: "pre-wrap" as const,
              }

              // HEADING (Rich Text)
              if (layer.id === "heading") {
                return (
                  <div key={`${layer.id}-${idx}`} style={commonStyle}>
                    <StyledText
                      as="h2"
                      className=""
                      style={{}}
                      defaultColor={ts.color}
                    >
                      {slide.heading}
                    </StyledText>
                  </div>
                )
              }

              // OTHER TEXT (String Content)
              let textContent = ""
              if (layer.id === "body") textContent = getBodyForLayout(slide, layout)
              else if (layer.id === "slide-number") textContent = `${slideNumber}/${totalSlides}`
              else textContent = "Text"

              if (!textContent) return null

              return (
                <div key={`${layer.id}-${idx}`} style={commonStyle}>
                  <span>{textContent}</span>
                </div>
              )
            }

            return null
          })}

          {renderBranding()}
          {renderCustomTexts()}
        </div>
      </div>
    )
  }

  const renderLayout = () => {
    // If template is selected, use template renderer
    if (templateId) {
      const templateResult = renderTemplateLayout()
      // If template ID is invalid or not found, fall back to standard layout
      if (templateResult) return templateResult
    }

    const baseStyles = {
      backgroundColor: theme.backgroundColor,
      color: theme.textColor,
    }

    switch (layout) {
      case "centered":
        return (
          <div className="flex flex-col h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderCrossDecor()}
            {renderArrowDecor("left")}

            <div className="flex-1 flex flex-col items-center justify-center text-center px-16 relative z-10">
              <StyledText
                as="h2"
                className="text-3xl md:text-4xl font-black mb-6 leading-none tracking-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatHeadingWithHighlight(slide.heading, theme.accentColor)}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed max-w-xs opacity-90 whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {renderBranding()}
          </div>
        )

      case "card":
        return (
          <div className="flex flex-col h-full relative" style={baseStyles}>
            {renderPaperTexture()}

            <div className="flex-1 flex items-center justify-center px-8 relative z-10">
              <div
                className="p-8 rounded-xl max-w-sm shadow-lg border"
                style={{
                  backgroundColor: theme.backgroundColor,
                  borderColor: theme.accentColor + "30",
                }}
              >
                <span
                  className="text-xs font-bold mb-4 px-3 py-1 rounded-full inline-block uppercase tracking-wider"
                  style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}
                >
                  Step {slideNumber}
                </span>
                <StyledText
                  as="h2"
                  className="text-2xl font-black mb-4 leading-tight uppercase"
                  style={slide.headingStyle}
                  defaultColor={theme.headingColor}
                >
                  {formatMultiLineHeading(slide.heading)}
                </StyledText>
                <StyledText as="p" className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap" style={slide.bodyStyle}>
                  {bodyText}
                </StyledText>
              </div>
            </div>

            {renderBranding()}
          </div>
        )

      case "diagonal-split":
        return (
          <div className="relative h-full overflow-hidden" style={baseStyles}>
            {renderPaperTexture()}

            {/* Diagonal image section - larger and more prominent */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: "polygon(0 0, 100% 0, 100% 75%, 0 90%)",
              }}
            >
              {hasImage ? (
                <img
                  src={slide.backgroundImageUrl || "/placeholder.svg"}
                  alt={slide.suggested_image}
                  className="w-full h-full object-cover"
                  style={{
                    transform: `translate(${((slide.backgroundImagePosition?.x ?? 50) - 50) * 1.5}%, ${((slide.backgroundImagePosition?.y ?? 50) - 50) * 1.5}%) scale(${slide.backgroundImageScale ? slide.backgroundImageScale / 100 : 1.05}) rotate(${slide.backgroundImageRotation || 0}deg)`,
                  }}
                />
              ) : (
                <div className="w-full h-full" style={{ backgroundColor: theme.accentColor + "20" }} />
              )}
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to bottom, transparent 30%, ${theme.backgroundColor} 95%)` }}
              />
            </div>

            {/* Text content - positioned in bottom right with more spacing */}
            <div className="absolute bottom-8 right-4 left-4 z-10 text-right">
              <div className="ml-auto max-w-[85%]">
                <StyledText
                  as="h2"
                  className="text-2xl md:text-3xl font-black mb-4 leading-tight tracking-tight uppercase"
                  style={slide.headingStyle}
                  defaultColor={theme.headingColor}
                >
                  {formatHeadingWithHighlight(slide.heading, theme.accentColor)}
                </StyledText>
                <StyledText
                  as="p"
                  className="text-sm md:text-base leading-relaxed ml-auto max-w-sm whitespace-pre-wrap opacity-95"
                  style={slide.bodyStyle}
                  defaultColor={theme.textColor}
                >
                  {bodyText}
                </StyledText>
              </div>
            </div>

            {renderBranding()}
          </div>
        )

      case "arch-left":
        return (
          <div className="flex h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}
            {renderCrossDecor()}

            {/* Arch-shaped image container on left */}
            <div className="w-3/5 h-full pt-14 pb-14 pl-4 relative z-10">
              <div
                className="w-full h-full overflow-hidden"
                style={{
                  borderRadius: "0 0 50% 0 / 0 0 30% 0",
                  borderTopRightRadius: "40%",
                }}
              >
                {hasImage ? (
                  <img
                    src={slide.backgroundImageUrl || "/placeholder.svg"}
                    alt={slide.suggested_image}
                    className="w-full h-full object-cover"
                    style={{
                      transform: `translate(${((slide.backgroundImagePosition?.x ?? 50) - 50) * 1.5}%, ${((slide.backgroundImagePosition?.y ?? 50) - 50) * 1.5}%) scale(${slide.backgroundImageScale ? slide.backgroundImageScale / 100 : 1}) rotate(${slide.backgroundImageRotation || 0}deg)`,
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: theme.accentColor + "20" }}
                  >
                    <p className="text-xs text-center px-4 opacity-60">{slide.suggested_image}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Text content on right */}
            <div className="w-2/5 flex flex-col justify-center pr-6 pl-4 relative z-10">
              <span
                className="text-xs font-bold mb-4 px-3 py-1 rounded-full w-fit uppercase tracking-wider"
                style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}
              >
                {String(slideNumber).padStart(2, "0")}
              </span>
              <StyledText
                as="h2"
                className="text-xl font-black mb-3 leading-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatMultiLineHeading(slide.heading)}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {renderBranding()}
          </div>
        )

      case "arch-right":
        return (
          <div className="flex h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}
            {renderCrossDecor()}

            {/* Text content on left */}
            <div className="w-2/5 flex flex-col justify-center pl-6 pr-4 relative z-10">
              <span
                className="text-xs font-bold mb-4 px-3 py-1 rounded-full w-fit uppercase tracking-wider"
                style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}
              >
                {String(slideNumber).padStart(2, "0")}
              </span>
              <StyledText
                as="h2"
                className="text-xl font-black mb-3 leading-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatMultiLineHeading(slide.heading)}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-90" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {/* Arch-shaped image container on right */}
            <div className="w-3/5 h-full pt-14 pb-14 pr-4 relative z-10">
              <div
                className="w-full h-full overflow-hidden"
                style={{
                  borderRadius: "0 0 0 50% / 0 0 0 30%",
                  borderTopLeftRadius: "40%",
                }}
              >
                {hasImage ? (
                  <img
                    src={slide.backgroundImageUrl || "/placeholder.svg"}
                    alt={slide.suggested_image}
                    className="w-full h-full object-cover"
                    style={{
                      transform: `translate(${((slide.backgroundImagePosition?.x ?? 50) - 50) * 1.5}%, ${((slide.backgroundImagePosition?.y ?? 50) - 50) * 1.5}%) scale(${slide.backgroundImageScale ? slide.backgroundImageScale / 100 : 1}) rotate(${slide.backgroundImageRotation || 0}deg)`,
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: theme.accentColor + "20" }}
                  >
                    <p className="text-xs text-center px-4 opacity-60">{slide.suggested_image}</p>
                  </div>
                )}
              </div>
            </div>

            {renderBranding()}
          </div>
        )

      case "bold":
        return (
          <div className="flex flex-col h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderArrowDecor("left")}

            <div className="flex-1 flex flex-col justify-center px-16 relative z-10">
              <StyledText
                as="h2"
                className="text-4xl md:text-5xl font-black mb-6 leading-none tracking-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatHeadingWithHighlight(slide.heading, theme.accentColor)}
              </StyledText>
              <StyledText as="p" className="text-base leading-relaxed opacity-85 max-w-md whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
              <span
                className="text-xs font-bold mt-8 px-3 py-1 rounded-full w-fit uppercase tracking-wider"
                style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}
              >
                {slideNumber}/{totalSlides}
              </span>
            </div>

            {renderBranding()}
          </div>
        )

      case "quote":
        return (
          <div className="flex flex-col h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderCrossDecor()}

            <div className="flex-1 flex flex-col justify-center px-12 relative z-10">
              <Quote className="h-12 w-12 mb-4" style={{ color: theme.accentColor }} />
              <StyledText
                as="h2"
                className="text-2xl font-bold mb-4 leading-relaxed italic"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                "{slide.heading}"
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-1 w-16" style={{ backgroundColor: theme.accentColor }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accentColor }}>
                  {slideNumber} of {totalSlides}
                </span>
              </div>
            </div>

            {renderBranding()}
          </div>
        )

      case "numbered":
        return (
          <div className="flex h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}

            <div
              className="w-24 flex items-center justify-center relative z-10"
              style={{ backgroundColor: theme.accentColor }}
            >
              <span className="text-5xl font-black" style={{ color: "#ffffff" }}>
                {String(slideNumber).padStart(2, "0")}
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center p-8 relative z-10">
              <StyledText
                as="h2"
                className="text-2xl font-black mb-4 leading-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatMultiLineHeading(slide.heading)}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {renderBranding()}
          </div>
        )

      case "split-left":
        return (
          <div className="flex h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}

            <div className="flex-1 flex flex-col justify-center p-8 relative z-10">
              <span
                className="text-xs font-bold mb-4 px-3 py-1 rounded-full w-fit uppercase tracking-wider"
                style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}
              >
                Step {slideNumber}
              </span>
              <StyledText
                as="h2"
                className="text-2xl font-black mb-4 leading-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatHeadingWithHighlight(slide.heading, theme.accentColor)}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>
            <div
              className="w-2/5 flex flex-col items-center justify-center p-4 relative z-10"
              style={{ backgroundColor: theme.accentColor + "10" }}
            >
              {hasImage ? (
                <img
                  src={slide.backgroundImageUrl || "/placeholder.svg"}
                  alt={slide.suggested_image}
                  className="w-full h-full object-cover rounded-xl"
                  style={{
                    transform: `translate(${((slide.backgroundImagePosition?.x ?? 50) - 50) * 1.5}%, ${((slide.backgroundImagePosition?.y ?? 50) - 50) * 1.5}%) scale(${slide.backgroundImageScale ? slide.backgroundImageScale / 100 : 1}) rotate(${slide.backgroundImageRotation || 0}deg)`,
                  }}
                />
              ) : (
                <>
                  <div
                    className="w-24 h-24 rounded-2xl mb-3 flex items-center justify-center"
                    style={{ backgroundColor: theme.accentColor + "30" }}
                  >
                    <div className="w-12 h-12 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                  </div>
                  <p className="text-xs text-center opacity-60 px-2 line-clamp-2">{slide.suggested_image}</p>
                </>
              )}
            </div>

            {renderBranding()}
          </div>
        )

      case "split-right":
        return (
          <div className="flex h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}

            <div
              className="w-2/5 flex flex-col items-center justify-center p-4 relative z-10"
              style={{ backgroundColor: theme.accentColor + "10" }}
            >
              {hasImage ? (
                <img
                  src={slide.backgroundImageUrl || "/placeholder.svg"}
                  alt={slide.suggested_image}
                  className="w-full h-full object-cover rounded-xl"
                  style={{
                    transform: `translate(${((slide.backgroundImagePosition?.x ?? 50) - 50) * 1.5}%, ${((slide.backgroundImagePosition?.y ?? 50) - 50) * 1.5}%) scale(${slide.backgroundImageScale ? slide.backgroundImageScale / 100 : 1}) rotate(${slide.backgroundImageRotation || 0}deg)`,
                  }}
                />
              ) : (
                <>
                  <div
                    className="w-24 h-24 rounded-2xl mb-3 flex items-center justify-center"
                    style={{ backgroundColor: theme.accentColor + "30" }}
                  >
                    <div className="w-12 h-12 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                  </div>
                  <p className="text-xs text-center opacity-60 px-2 line-clamp-2">{slide.suggested_image}</p>
                </>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center p-8 relative z-10">
              <span
                className="text-xs font-bold mb-4 px-3 py-1 rounded-full w-fit uppercase tracking-wider"
                style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}
              >
                Step {slideNumber}
              </span>
              <StyledText
                as="h2"
                className="text-2xl font-black mb-4 leading-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatHeadingWithHighlight(slide.heading, theme.accentColor)}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {renderBranding()}
          </div>
        )

      case "circle-frame":
        return (
          <div className="flex flex-col items-center justify-center h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}
            {renderCrossDecor()}

            <div className="relative z-10 flex flex-col items-center px-8">
              <div
                className="w-36 h-36 rounded-full overflow-hidden mb-6"
                style={{
                  boxShadow: `0 0 0 4px ${theme.accentColor}40`
                }}
              >
                {hasImage ? (
                  <img
                    src={slide.backgroundImageUrl || "/placeholder.svg"}
                    alt={slide.suggested_image}
                    className="w-full h-full object-cover"
                    style={{
                      transform: `translate(${((slide.backgroundImagePosition?.x ?? 50) - 50) * 1.5}%, ${((slide.backgroundImagePosition?.y ?? 50) - 50) * 1.5}%) scale(${slide.backgroundImageScale ? slide.backgroundImageScale / 100 : 1}) rotate(${slide.backgroundImageRotation || 0}deg)`,
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: theme.accentColor + "20" }}
                  >
                    <p className="text-xs text-center px-2 opacity-60">Image</p>
                  </div>
                )}
              </div>
              <span
                className="text-xs font-bold mb-3 px-3 py-1 rounded-full uppercase tracking-wider"
                style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}
              >
                {String(slideNumber).padStart(2, "0")}
              </span>
              <StyledText
                as="h2"
                className="text-xl font-black mb-3 text-center leading-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatMultiLineHeading(slide.heading)}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-90 text-center max-w-xs whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {renderBranding()}
          </div>
        )

      case "minimal":
        return (
          <div className="flex flex-col justify-end h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}

            <div className="p-10 pb-20 relative z-10">
              <span className="text-sm font-black tracking-widest block mb-6" style={{ color: theme.accentColor }}>
                {String(slideNumber).padStart(2, "0")}
              </span>
              <StyledText
                as="h2"
                className="text-3xl font-light mb-4 leading-tight"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {slide.heading}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-70 max-w-xs whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {renderBranding()}
          </div>
        )

      case "gradient-text":
        return (
          <div className="flex flex-col justify-center h-full text-center relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}

            <div className="px-12 relative z-10">
              <span
                className="text-xs font-bold mb-6 block uppercase tracking-wider"
                style={{ color: theme.accentColor }}
              >
                {slideNumber} / {totalSlides}
              </span>
              <StyledText
                as="h2"
                className="text-3xl font-black mb-4 leading-tight uppercase bg-clip-text text-transparent"
                style={slide.headingStyle}
                defaultColor="transparent"
              >
                {slide.heading}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-80 max-w-sm mx-auto whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {renderBranding()}
          </div>
        )

      case "sidebar":
        return (
          <div className="flex h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}

            <div className="w-2 relative z-10" style={{ backgroundColor: theme.accentColor }} />
            <div className="flex-1 flex flex-col justify-center p-10 relative z-10">
              <span className="text-xs font-bold mb-4 tracking-widest uppercase" style={{ color: theme.accentColor }}>
                Slide {slideNumber}
              </span>
              <StyledText
                as="h2"
                className="text-2xl font-black mb-4 leading-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatHeadingWithHighlight(slide.heading, theme.accentColor)}
              </StyledText>
              <StyledText as="p" className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {renderBranding()}
          </div>
        )

      case "stacked":
        return (
          <div className="flex flex-col h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}

            <div
              className="px-8 py-4 mt-12 flex items-center justify-between relative z-10"
              style={{ backgroundColor: theme.accentColor + "10" }}
            >
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.accentColor }}>
                Slide {slideNumber} of {totalSlides}
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center px-10 relative z-10">
              <StyledText
                as="h2"
                className="text-3xl font-black mb-4 leading-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatHeadingWithHighlight(slide.heading, theme.accentColor)}
              </StyledText>
              <StyledText as="p" className="text-base leading-relaxed opacity-90" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>
            </div>

            {renderBranding()}
          </div>
        )

      case "magazine":
        return (
          <div className="flex flex-col h-full relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}

            <div className="flex-1 flex flex-col justify-center px-10 relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-1 w-12" style={{ backgroundColor: theme.accentColor }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.accentColor }}>
                  {category}
                </span>
              </div>
              <StyledText
                as="h2"
                className="text-3xl font-black mb-5 leading-tight uppercase"
                style={slide.headingStyle}
                defaultColor={theme.headingColor}
              >
                {formatHeadingWithHighlight(slide.heading, theme.accentColor)}
              </StyledText>
              <StyledText as="p" className="text-base leading-relaxed opacity-90 max-w-md" style={slide.bodyStyle}>
                {bodyText}
              </StyledText>

            </div>

            {renderBranding()}
          </div>
        )

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 relative" style={baseStyles}>
            {renderPaperTexture()}
            {renderDecorations()}

            <div className="relative z-10">
              <span
                className="text-xs font-bold mb-4 px-3 py-1 rounded-full inline-block uppercase tracking-wider"
                style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}
              >
                {slideNumber} / {totalSlides}
              </span>
              <h2
                className="text-2xl md:text-3xl font-black mb-4 text-balance leading-tight uppercase"
                style={{ color: theme.headingColor }}
              >
                {formatHeadingWithHighlight(slide.heading, theme.accentColor)}
              </h2>
              <p className="text-base leading-relaxed max-w-md opacity-90">{bodyText}</p>
            </div>

            {renderBranding()}
          </div>
        )
    }
  }

  return (
    <div
      ref={slideContainerRef}
      className="w-full h-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl relative"
    >
      {slide.isGeneratingImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Generating image...</span>
          </div>
        </div>
      )}
      {renderLayout()}
      {renderCustomTexts()}
    </div>
  )
}
