// Using transcriptAPI.com for YouTube transcripts (AWS compatible)
import * as cheerio from 'cheerio';

/* ---------------- STOPWORDS ---------------- */

const STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'i', 'me', 'my', 'mine', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
    'this', 'that', 'these', 'those',
    'to', 'of', 'in', 'on', 'at', 'for', 'from', 'by', 'with', 'about', 'as',
    'do', 'does', 'did', 'doing',
    'have', 'has', 'had',
    'will', 'would', 'should', 'could', 'can',
    'not', 'no', 'yes',
    'so', 'very', 'just', 'really',
    'there', 'here', 'what', 'which', 'who', 'whom', 'why', 'how'
]);

/* ---------------- HTML DECODING ---------------- */

function decodeHTMLEntities(text: string) {
    let decoded = text;

    // handle double-encoded entities
    decoded = decoded.replace(/&amp;/g, '&');

    // numeric entities (&#39;)
    decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
        String.fromCharCode(Number(code))
    );

    // named entities
    decoded = decoded
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    return decoded;
}

/* ---------------- CONTRACTION EXPANSION ---------------- */

function expandContractions(text: string) {
    return text
        .replace(/\bI'm\b/gi, 'i am')
        .replace(/\bI'd\b/gi, 'i would')
        .replace(/\bI'll\b/gi, 'i will')
        .replace(/\bI've\b/gi, 'i have')
        .replace(/\byou're\b/gi, 'you are')
        .replace(/\bwe're\b/gi, 'we are')
        .replace(/\bthey're\b/gi, 'they are')
        .replace(/\bit's\b/gi, 'it is')
        .replace(/\bthat's\b/gi, 'that is')
        .replace(/\bthere's\b/gi, 'there is')
        .replace(/\bcan't\b/gi, 'can not')
        .replace(/\bwon't\b/gi, 'will not')
        .replace(/\bhaven't\b/gi, 'have not')
        .replace(/\bhasn't\b/gi, 'has not')
        .replace(/\bdon't\b/gi, 'do not')
        .replace(/\bdoesn't\b/gi, 'does not')
        .replace(/\bdidn't\b/gi, 'did not');
}

/* ---------------- STOPWORD REMOVAL (Unicode Safe) ---------------- */

function removeStopwords(text: string) {
    return text
        .split(/\s+/)
        .map(word => {
            // Remove punctuation from start/end but preserve unicode letters (Hindi, etc)
            // Using a simple approach: remove specific common punctuation
            return word.replace(/^["'.,!?;:()]+|["'.,!?;:()]+$/g, '').toLowerCase();
        })
        .filter(word => word && !STOPWORDS.has(word))
        .join(' ');
}

/* ---------------- BROWSER-LIKE HEADERS FOR AWS COMPATIBILITY ---------------- */

function getBrowserHeaders(): Record<string, string> {
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
    };
}

/* ---------------- EXTRACT VIDEO ID ---------------- */

// Exported for use in generation extraction
export function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/* ---------------- FALLBACK: Extract Video Metadata (Title + Description) ---------------- */

export async function fetchVideoMetadata(videoId: string): Promise<string> {
    console.log('[Scraper] Fallback: Extracting video title and description...');

    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const response = await fetch(watchUrl, { headers: getBrowserHeaders() });

    if (!response.ok) {
        throw new Error(`Failed to fetch YouTube page: ${response.status}`);
    }

    const html = await response.text();

    // Extract title - try multiple patterns
    let title = '';
    const titlePatterns = [
        /"title":\s*"([^"]+)"/,
        /"videoDetails".*?"title":\s*"([^"]+)"/,
        /<meta\s+name="title"\s+content="([^"]+)"/,
        /<title>([^<]+)<\/title>/
    ];

    for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            title = match[1].replace(' - YouTube', '').trim();
            break;
        }
    }

    // Extract description from the page - try multiple patterns
    let description = '';
    const descPatterns = [
        /"shortDescription":\s*"((?:[^"\\]|\\.)*)"/,
        /"description":\s*"((?:[^"\\]|\\.)*)"/,
        /<meta\s+name="description"\s+content="([^"]+)"/
    ];

    for (const pattern of descPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            description = match[1];
            break;
        }
    }

    // Unescape the description
    description = description
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, '')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\u0026/g, '&');

    // Combine title and description
    let combined = `${title}. ${description}`.trim();

    // If we have no description, just use the title
    if (!description && title) {
        combined = title;
    }

    // Apply HTML decoding and contraction expansion
    let processed = decodeHTMLEntities(combined);
    processed = expandContractions(processed);

    // For metadata fallback, DON'T apply aggressive stopword removal
    // The AI needs the full context from title/description
    // Just clean up excessive whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    // Use a lower threshold - even just a title can be enough
    if (!processed || processed.length < 10) {
        throw new Error('Could not extract meaningful content from video metadata');
    }

    console.log(`[Scraper] ✅ Extracted metadata for: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`);
    console.log(`[Scraper] Processed metadata length: ${processed.length} characters`);
    return processed;
}

/* ---------------- API FETCH HELPER ---------------- */

async function fetchTranscriptFromApi(videoId: string, apiKey: string, lang: string): Promise<string | null> {
    try {
        console.log(`[Scraper] 🌍 Trying transcript fetch for language: ${lang.toUpperCase()}...`);
        const apiUrl = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${videoId}&format=json&include_timestamp=false&lang=${lang}`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            console.warn(`[Scraper] ⚠️ Failed for ${lang}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const segments = data.transcript || [];

        if (!segments || segments.length === 0) return null;

        const processedParts: string[] = [];
        segments.forEach((item: any) => {
            let text = item.text || '';
            text = decodeHTMLEntities(text);
            text = expandContractions(text);
            text = removeStopwords(text);
            if (text) processedParts.push(text);
        });

        return processedParts.join(' ');
    } catch (e) {
        console.warn(`[Scraper] ⚠️ API error for ${lang}:`, e);
        return null;
    }
}

export async function extractYouTubeTranscript(url: string): Promise<string> {
    console.log(`[Scraper] Fetching transcript for URL: ${url}`);

    const videoId = extractVideoId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL. Could not extract video ID.');
    }

    const TRANSCRIPT_API_KEY = process.env.TRANSCRIPT_API_KEY;
    if (!TRANSCRIPT_API_KEY) {
        throw new Error('TRANSCRIPT_API_KEY environment variable is not set');
    }

    try {
        console.log(`[Scraper] Calling transcriptAPI.com for video ID: ${videoId}`);

        // STRATEGY: Try English ('en'), then Hindi ('hi'), then auto/default (no lang param)
        // User requested: English if available, otherwise Hindi.

        let transcript = await fetchTranscriptFromApi(videoId, TRANSCRIPT_API_KEY, 'en');

        if (!transcript) {
            console.log(`[Scraper] ⚠️ English transcript not found/empty. Trying Hindi...`);
            transcript = await fetchTranscriptFromApi(videoId, TRANSCRIPT_API_KEY, 'hi');
        }

        if (transcript && transcript.length > 50) {
            console.log(`[Scraper] ✅ Transcript fetched successfully! Length: ${transcript.length}`);
            return transcript;
        }

        throw new Error("No valid transcript found in EN or HI");

    } catch (transcriptError: any) {
        console.warn('⚠️ Transcript extraction failed:', transcriptError?.message);
        console.log('[Scraper] Attempting fallback to video metadata...');

        // Fallback to video metadata
        try {
            const metadata = await fetchVideoMetadata(videoId);
            console.log('[Scraper] ⚠️ Using video title/description as fallback');
            return metadata;
        } catch (metadataError: any) {
            throw new Error(
                `Failed to extract content. Transcript API failed. Metadata fallback failed.`
            );
        }
    }
}

export async function extractWebContent(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error("Failed to fetch page");

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove non-content elements
        $('script, style, nav, footer, iframe, header, noscript, .ad, .advertisement').remove();

        // Try to find main content container
        let content = $('article').text() || $('main').text() || $('.content').text() || $('body').text();

        return content.replace(/\s+/g, ' ').trim();

    } catch (error) {
        console.error("Web Extraction failed:", error);
        throw new Error("Failed to extract content from the link.");
    }
}
