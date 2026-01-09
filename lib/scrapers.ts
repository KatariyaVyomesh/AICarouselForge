import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
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

export async function extractYouTubeTranscript(url: string): Promise<string> {
    try {
        console.log(`[Scraper] Fetching transcript for URL: ${url}`);

        // Use the library directly with the URL as in user's example
        // The user's example: const videoUrl = '...'; const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
        const transcript = await YoutubeTranscript.fetchTranscript(url);

        const processedParts: string[] = [];

        transcript.forEach((item: any) => {
            let text = decodeHTMLEntities(item.text);
            text = expandContractions(text);
            text = removeStopwords(text);

            if (text) {
                processedParts.push(text);
            }
        });

        const result = processedParts.join(' ');
        console.log(`[Scraper] Processed transcript length: ${result.length}`);
        return result;

    } catch (error: any) {
        console.error('❌ Error fetching transcript:', error.message || error);

        // Fallback or re-throw? 
        // User said "remove all transcript api Code and implement this code strictly"
        // But for robust app behavior, a fallback is nice. However, "strictly" implies relying on this.
        // I will keep the web-scraping fallback (cheerio) I had before IF it makes sense, 
        // but looking at their code, they just catch and log error. 
        // I will throw specifically so the route handler knows it failed.
        throw new Error(`Failed to fetch transcript: ${error.message || error}`);
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
