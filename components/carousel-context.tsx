"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import type { CarouselData, ContentVariation } from "@/lib/types"

interface CarouselContextType {
    topic: string
    setTopic: (topic: string) => void
    inputType: "topic" | "text" | "youtube" | "link"
    setInputType: (type: "topic" | "text" | "youtube" | "link") => void
    variations: ContentVariation[] | null
    setVariations: (variations: ContentVariation[] | null) => void
    generatedSlideCount: number
    setGeneratedSlideCount: (count: number) => void
}

const CarouselContext = createContext<CarouselContextType | undefined>(undefined)

export function CarouselProvider({ children }: { children: ReactNode }) {
    const [topic, setTopic] = useState("")
    const [inputType, setInputType] = useState<"topic" | "text" | "youtube" | "link">("topic")
    const [variations, setVariations] = useState<ContentVariation[] | null>(null)
    const [generatedSlideCount, setGeneratedSlideCount] = useState(5)

    return (
        <CarouselContext.Provider
            value={{
                topic,
                setTopic,
                inputType,
                setInputType,
                variations,
                setVariations,
                generatedSlideCount,
                setGeneratedSlideCount
            }}
        >
            {children}
        </CarouselContext.Provider>
    )
}

export function useCarousel() {
    const context = useContext(CarouselContext)
    if (context === undefined) {
        throw new Error("useCarousel must be used within a CarouselProvider")
    }
    return context
}
