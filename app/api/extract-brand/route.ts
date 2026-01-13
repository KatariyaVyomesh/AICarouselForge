
import { extractWebContent } from "@/lib/scrapers"
import { JSDOM } from "jsdom"

export async function POST(req: Request) {
    try {
        const { url } = await req.json()

        if (!url) {
            return Response.json({ error: "URL is required" }, { status: 400 })
        }

        // Use a basic fetch first to get HTML, assuming simple scraping logic for now
        // We can reuse extractWebContent logic but we need metadata, not just text content.
        // So let's write a targeted scraper here.

        // Note: In production this should be more robust (puppeteer etc), but for now:
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        if (!response.ok) {
            throw new Error("Failed to fetch page")
        }

        const html = await response.text()
        const dom = new JSDOM(html)
        const doc = dom.window.document

        // Extract Name (Title)
        const title = doc.querySelector('title')?.textContent ||
            doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
            doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
            "Unknown Brand"

        // Extract Logo (favicon or og:image)
        // Try to find a logo
        let logoUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
            doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
            doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
            doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href')

        // Fix relative URLs for logo
        if (logoUrl && !logoUrl.startsWith('http')) {
            const baseUrl = new URL(url).origin
            if (logoUrl.startsWith('/')) {
                logoUrl = baseUrl + logoUrl
            } else {
                // handle relative paths not starting with / - simplistic approach
                logoUrl = baseUrl + '/' + logoUrl
            }
        }

        // Extract description/handle (approximation)
        const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || ""

        // Advanced Color Extraction
        // 1. Meta tags (highest priority for "official" accent)
        const themeColor = doc.querySelector('meta[name="theme-color"]')?.getAttribute('content')
        const tileColor = doc.querySelector('meta[name="msapplication-TileColor"]')?.getAttribute('content')

        // 2. Scan entire HTML + CSS for Color definitions
        let combinedContent = html // Start with HTML

        // Fetch external CSS (limit to top 3 to match performance constraints)
        const cssLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => link.getAttribute('href'))
            .filter(href => href && !href.startsWith('data:'))
            .slice(0, 3) as string[];

        // Fetch CSS contents in parallel
        const cssPromises = cssLinks.map(async (href) => {
            try {
                // Handle relative URLs
                let cssUrl = href;
                if (!href.startsWith('http')) {
                    const baseUrl = new URL(url).origin;
                    if (href.startsWith('/')) {
                        cssUrl = baseUrl + href;
                    } else {
                        cssUrl = baseUrl + '/' + href;
                    }
                }

                const res = await fetch(cssUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
                    signal: AbortSignal.timeout(2000) // 2s timeout per css
                });
                if (res.ok) return await res.text();
            } catch (e) {
                console.warn("Failed to fetch CSS:", href);
            }
            return "";
        });

        const cssContents = await Promise.all(cssPromises);
        combinedContent += cssContents.join(" ");

        // Regex to find Hex colors
        const hexRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
        const allHexCodes = combinedContent.match(hexRegex) || [];

        // Count frequency
        const colorCounts: Record<string, number> = {};
        allHexCodes.forEach(color => {
            const normalized = color.toLowerCase();
            // Filter out common utility colors if we want successful brand extraction?
            // Actually, keep them, but valid hex only.
            if (normalized.length === 4 || normalized.length === 7) {
                colorCounts[normalized] = (colorCounts[normalized] || 0) + 1;
            }
        });

        // Convert to array and sort by frequency
        const sortedColors = Object.entries(colorCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([color]) => color);

        // Heuristic Helpers
        const isWhiteOrBlack = (c: string) => {
            const hex = c.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15);
        }

        // Detect Background vs Text vs Accent
        // Usually:
        // - Background is often white/black OR a very frequent color.
        // - Text is often black/white (contrast to bg).
        // - Accent is a frequent color that is NOT black/white.

        // Try to find a "Colorful" dominant color for accent
        const dominantColorful = sortedColors.find(c => !isWhiteOrBlack(c));

        // Try to find CSS variable definitions for specific roles
        // Look for --background: #...
        const bgVarMatch = combinedContent.match(/--background:\s*(#[0-9a-fA-F]{3,6})/i);
        const textVarMatch = combinedContent.match(/--foreground:\s*(#[0-9a-fA-F]{3,6})/i) ||
            combinedContent.match(/--text:\s*(#[0-9a-fA-F]{3,6})/i);

        // Construct Palette
        let background = bgVarMatch ? bgVarMatch[1] : (sortedColors[0] || "#ffffff"); // Most frequent is likely bg (or white)
        let text = textVarMatch ? textVarMatch[1] : "#000000";
        let accent = dominantColorful || "#3b82f6";

        // Refine: If most frequent is NOT white/black, it might be a colored background site (like saystory.co)
        if (sortedColors.length > 0 && !isWhiteOrBlack(sortedColors[0])) {
            background = sortedColors[0];
            // If bg is dark, text should be light
            // Simple check: is it dark? (primitive)
            const hex = background.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) || 0;
            if (r < 128) text = "#ffffff";
            else text = "#000000";
        } else {
            // Fallback standard
            background = "#ffffff";
            text = "#000000";
        }

        // Meta tag overrides accent if present
        if (themeColor && /^#([0-9A-F]{3}){1,2}$/i.test(themeColor)) {
            accent = themeColor;
        }

        const brandData = {
            name: title.trim().split('|')[0].trim().substring(0, 50),
            website: url,
            handle: "@" + title.trim().substring(0, 15).replace(/\s+/g, ''),
            imageUrl: logoUrl || "",
            colors: {
                background,
                text,
                accent,
                heading: text // match text for now
            },
            fonts: {
                heading: "Inter",
                body: "Inter"
            }
        }

        return Response.json(brandData)

    } catch (error) {
        console.error("Brand extraction failed:", error)
        return Response.json({ error: "Failed to extract brand info" }, { status: 500 })
    }
}
