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
    brandKit: any | null
    setBrandKit: (brandKit: any | null) => void
    generatedSlideCount: number
    setGeneratedSlideCount: (count: number) => void
    hostImage: string | null
    setHostImage: (url: string | null) => void
    guestImage: string | null
    setGuestImage: (url: string | null) => void
    selectedTemplateId: string | null
    setSelectedTemplateId: (id: string | null) => void
}

const CarouselContext = createContext<CarouselContextType | undefined>(undefined)

export function CarouselProvider({ children }: { children: ReactNode }) {
    const [topic, setTopic] = useState("")
    const [inputType, setInputType] = useState<"topic" | "text" | "youtube" | "link">("topic")
    const [variations, setVariations] = useState<ContentVariation[] | null>(null)
    const [generatedSlideCount, setGeneratedSlideCount] = useState(5)
    const [brandKit, setBrandKit] = useState<any | null>(null)
    const [hostImage, setHostImage] = useState<string | null>(null)
    const [guestImage, setGuestImage] = useState<string | null>(null)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

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
                setGeneratedSlideCount,
                brandKit,
                setBrandKit,
                hostImage,
                setHostImage,
                guestImage,
                setGuestImage,
                selectedTemplateId,
                setSelectedTemplateId
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
