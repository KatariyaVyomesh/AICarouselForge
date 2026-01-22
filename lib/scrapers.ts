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

/* ---------------- STOPWORD REMOVAL ---------------- */

function removeStopwords(text: string) {
    return text
        .split(/\s+/)
        .map(word =>
            word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
        )
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

// export async function fetchVideoMetadata(videoId: string): Promise<string> {
//     console.log('[Scraper] Fallback: Extracting video title and description...');

//     const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

//     const response = await fetch(watchUrl, { headers: getBrowserHeaders() });

//     if (!response.ok) {
//         throw new Error(`Failed to fetch YouTube page: ${response.status}`);
//     }

//     const html = await response.text();

//     // Extract title - use SPECIFIC patterns to avoid matching incorrect JSON fields like likeButtonViewModel
//     // Priority: videoDetails.title (most reliable) -> meta title -> page title
//     let title = '';
//     const titlePatterns = [
//         // Most specific: videoDetails object near the start of the JSON
//         /"videoDetails"\s*:\s*\{[^}]*"videoId"\s*:\s*"[^"]+"\s*,\s*"title"\s*:\s*"([^"]+)"/,
//         // Alternative: look for title right after videoId in videoDetails
//         /"videoDetails"[^}]*?"title"\s*:\s*"([^"]+)"/,
//         // videoPrimaryInfoRenderer contains the actual displayed title
//         /"videoPrimaryInfoRenderer"[^}]*?"title"[^}]*?"text"\s*:\s*"([^"]+)"/,
//         // og:title meta tag (reliable for video title)
//         /<meta\s+property="og:title"\s+content="([^"]+)"/,
//         /<meta\s+name="title"\s+content="([^"]+)"/,
//         // Fallback: page title (least reliable)
//         /<title>([^<]+)<\/title>/
//     ];

//     for (const pattern of titlePatterns) {
//         const match = html.match(pattern);
//         if (match && match[1]) {
//             const extractedTitle = match[1].replace(' - YouTube', '').trim();
//             // Validate: title should not look like a number (e.g., likes count "123K")
//             if (extractedTitle && !/^\d+[KMB]?$/i.test(extractedTitle) && extractedTitle.length > 3) {
//                 title = extractedTitle;
//                 console.log(`[Scraper] Title extracted using pattern: ${pattern.toString().substring(0, 50)}...`);
//                 break;
//             }
//         }
//     }

//     // Extract channel/host name - this is the actual uploader
//     let channelName = '';
//     const channelPatterns = [
//         // ownerChannelName is the most reliable field for the actual channel name
//         /"ownerChannelName"\s*:\s*"([^"]+)"/,
//         // author field in videoDetails
//         /"videoDetails"[^}]*?"author"\s*:\s*"([^"]+)"/,
//         // channelName in various contexts
//         /"channelName"\s*:\s*"([^"]+)"/,
//         // og:site_name or channel link text
//         /<link\s+itemprop="name"\s+content="([^"]+)"/,
//         // Channel name in metadata
//         /"channel"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/
//     ];

//     for (const pattern of channelPatterns) {
//         const match = html.match(pattern);
//         if (match && match[1]) {
//             channelName = match[1].trim();
//             console.log(`[Scraper] Channel name extracted: "${channelName}"`);
//             break;
//         }
//     }

//     // Extract description from the page - try multiple patterns
//     let description = '';
//     const descPatterns = [
//         /"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/,
//         /"description"\s*:\s*"((?:[^"\\]|\\.)*)"/,
//         /<meta\s+name="description"\s+content="([^"]+)"/,
//         /<meta\s+property="og:description"\s+content="([^"]+)"/
//     ];

//     for (const pattern of descPatterns) {
//         const match = html.match(pattern);
//         if (match && match[1]) {
//             description = match[1];
//             break;
//         }
//     }

//     // Unescape the description
//     description = description
//         .replace(/\\n/g, ' ')
//         .replace(/\\r/g, '')
//         .replace(/\\"/g, '"')
//         .replace(/\\\\/g, '\\')
//         .replace(/\\u0026/g, '&');

//     // Build combined metadata with clear labels for AI to identify host/channel
//     let combined = '';

//     if (channelName) {
//         combined += `Channel/Host: ${channelName}. `;
//     }

//     if (title) {
//         combined += `Video Title: ${title}. `;
//     }

//     if (description) {
//         combined += `Description: ${description}`;
//     }

//     combined = combined.trim();

//     // Fallback: If we only have title, use it
//     if (!combined && title) {
//         combined = title;
//     }

//     // Apply HTML decoding and contraction expansion
//     let processed = decodeHTMLEntities(combined);
//     processed = expandContractions(processed);

//     // For metadata fallback, DON'T apply aggressive stopword removal
//     // The AI needs the full context from title/description
//     // Just clean up excessive whitespace
//     processed = processed.replace(/\s+/g, ' ').trim();

//     // Use a lower threshold - even just a title can be enough
//     if (!processed || processed.length < 10) {
//         throw new Error('Could not extract meaningful content from video metadata');
//     }

//     console.log(`[Scraper] ✅ Extracted metadata for: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`);
//     console.log(`[Scraper] Channel/Host: "${channelName || 'Not found'}"`);
//     console.log(`[Scraper] Processed metadata length: ${processed.length} characters`);
//     return processed;
// }

export interface TranscriptSegment {
    text: string;
    startTime: number; // seconds
    duration: number;
}

export interface TranscriptResult {
    text: string;
    detectedLanguage: string;
    segments?: TranscriptSegment[]; // Optional: raw segments with timestamps
}

export async function extractYouTubeTranscript(
    url: string,
    preserveTimestamps: boolean = false
): Promise<TranscriptResult> {
    console.log(`[Scraper] Fetching transcript for URL: ${url} (preserveTimestamps: ${preserveTimestamps})`);

    const videoId = extractVideoId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL. Could not extract video ID.');
    }

    const TRANSCRIPT_API_KEY = process.env.TRANSCRIPT_API_KEY;
    if (!TRANSCRIPT_API_KEY) {
        throw new Error('TRANSCRIPT_API_KEY environment variable is not set');
    }

    // Try transcript API first - don't specify language to get the original/default captions
    try {
        console.log(`[Scraper] Calling transcriptAPI.com for video ID: ${videoId} (using original caption language)`);

        // Don't specify lang parameter - let it return the video's default/auto-generated captions
        // Include timestamps if requested for frame matching
        const includeTimestamp = preserveTimestamps ? 'true' : 'false';
        const apiUrl = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${videoId}&format=json&include_timestamp=${includeTimestamp}`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TRANSCRIPT_API_KEY}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TranscriptAPI error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Handle the response - transcriptAPI returns transcript array and language info
        const segments = data.transcript || [];
        // Get the detected language from API response, fallback to 'en' if not provided
        const detectedLanguage = data.language || data.lang || 'en';

        console.log(`[Scraper] Detected caption language: ${detectedLanguage}`);

        if (!segments || segments.length === 0) {
            throw new Error('No transcript segments returned from API');
        }

        const processedParts: string[] = [];
        const rawSegments: TranscriptSegment[] = [];

        segments.forEach((item: any) => {
            // TranscriptAPI returns { text: "...", start: 0.0, duration: 1.0 }
            let text = item.text || '';
            const originalText = text; // Keep original for timestamps
            text = decodeHTMLEntities(text);

            // Store raw segment if timestamps are requested
            if (preserveTimestamps) {
                rawSegments.push({
                    text: decodeHTMLEntities(originalText),
                    startTime: item.start || 0,
                    duration: item.duration || 0
                });
            }

            // Only apply English-specific processing for English captions
            if (detectedLanguage.startsWith('en')) {
                text = expandContractions(text);
                text = removeStopwords(text);
            }

            if (text) {
                processedParts.push(text);
            }
        });

        const result = processedParts.join(' ');
        console.log(`[Scraper] ✅ Transcript fetched successfully via API!`);
        console.log(`[Scraper] Processed transcript length: ${result.length}, Language: ${detectedLanguage}`);

        if (preserveTimestamps) {
            console.log(`[Scraper] Preserved ${rawSegments.length} timestamped segments`);
        }

        return {
            text: result,
            detectedLanguage: detectedLanguage,
            ...(preserveTimestamps && { segments: rawSegments })
        };

    }
    catch (transcriptError: any) {
        console.error('❌ Transcript extraction failed:', transcriptError);
        throw new Error(`Failed to extract transcript: ${transcriptError?.message || 'Unknown error'}`);
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
