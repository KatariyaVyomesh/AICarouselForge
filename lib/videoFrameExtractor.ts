import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export interface FrameData {
    timestamp: string; // "00:01:00" or "01:00"
    timestampSeconds: number; // 60
    filename: string; // "video_id_person_0000.jpg"
    path: string; // Absolute path on disk
    url: string; // Public URL (local or S3)
    personIndex?: number; // Index of the detected person (unique per video)
}

export interface FrameExtractionResult {
    success: boolean;
    videoId: string;
    frameCount: number;
    frames: FrameData[];
    error?: string;
}

/**
 * Get the correct Python command for the current platform
 * Linux/Mac: python3
 * Windows: python
 */
function getPythonCommand(): string {
    return process.platform === 'win32' ? 'python' : 'python3';
}

export async function extractVideoFrames(
    videoUrl: string,
    videoId: string
): Promise<FrameExtractionResult> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'extract_frames.py');
        const pythonCmd = getPythonCommand();

        console.log(`[FrameExtractor] Starting extraction for video ID: ${videoId}`);
        console.log(`[FrameExtractor] Script path: ${scriptPath}`);
        console.log(`[FrameExtractor] Python command: ${pythonCmd}`);

        // Check if Python script exists
        fs.access(scriptPath)
            .catch(() => {
                throw new Error(`Python script not found at: ${scriptPath}`);
            });

        const pythonProcess = spawn(pythonCmd, [scriptPath, videoUrl, videoId]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            const message = data.toString();
            stderrData += message;
            // Log Python stderr to console for debugging
            console.log(`[Python] ${message.trim()}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[FrameExtractor] Python process exited with code ${code}`);
                console.error(`[FrameExtractor] stderr: ${stderrData}`);

                // Try to parse error from stdout
                try {
                    const result = JSON.parse(stdoutData);
                    if (!result.success) {
                        reject(new Error(result.error || 'Frame extraction failed'));
                        return;
                    }
                } catch (e) {
                    reject(new Error(`Frame extraction failed with code ${code}: ${stderrData}`));
                    return;
                }
            }

            try {
                const result: FrameExtractionResult = JSON.parse(stdoutData);

                if (!result.success) {
                    reject(new Error(result.error || 'Unknown error during frame extraction'));
                    return;
                }

                console.log(`[FrameExtractor] ✓ Successfully extracted ${result.frameCount} frames`);
                resolve(result);

            } catch (error) {
                console.error('[FrameExtractor] Failed to parse Python output:', stdoutData);
                reject(new Error('Failed to parse frame extraction results'));
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('[FrameExtractor] Failed to start Python process:', error);
            reject(new Error(`Failed to start Python process: ${error.message}. Is Python installed?`));
        });
    });
}

/**
 * Check if required dependencies are installed
 */
export async function checkDependencies(): Promise<{ installed: boolean; missing: string[] }> {
    const missing: string[] = [];
    const pythonCmd = getPythonCommand();

    // Check Python
    try {
        await new Promise((resolve, reject) => {
            const proc = spawn(pythonCmd, ['--version']);
            proc.on('close', (code) => {
                if (code === 0) resolve(true);
                else reject();
            });
            proc.on('error', reject);
        });
    } catch {
        missing.push('Python');
    }

    // Check yt-dlp
    try {
        await new Promise((resolve, reject) => {
            const proc = spawn('yt-dlp', ['--version']);
            proc.on('close', (code) => {
                if (code === 0) resolve(true);
                else reject();
            });
            proc.on('error', reject);
        });
    } catch {
        missing.push('yt-dlp');
    }

    // Check ffmpeg
    try {
        await new Promise((resolve, reject) => {
            const proc = spawn('ffmpeg', ['-version']);
            proc.on('close', (code) => {
                if (code === 0) resolve(true);
                else reject();
            });
            proc.on('error', reject);
        });
    } catch {
        missing.push('ffmpeg');
    }

    // Check Python packages (ultralytics, imagehash, opencv-python)
    const pythonPackages = ['ultralytics', 'imagehash', 'cv2', 'PIL'];
    for (const pkg of pythonPackages) {
        try {
            await new Promise((resolve, reject) => {
                const proc = spawn(pythonCmd, ['-c', `import ${pkg}`]);
                proc.on('close', (code) => {
                    if (code === 0) resolve(true);
                    else reject();
                });
                proc.on('error', reject);
            });
        } catch {
            const displayName = pkg === 'cv2' ? 'opencv-python' : pkg === 'PIL' ? 'Pillow' : pkg;
            missing.push(`Python package: ${displayName}`);
        }
    }

    return {
        installed: missing.length === 0,
        missing
    };
}

// ===============================
// QUOTE MODE EXTRACTION
// ===============================

export interface QuoteModeFrame {
    timestamp: number;
    originalTimestamp: number; // For matching requests when smart seek drifts
    timestampFormatted: string;
    status: 'VALID' | 'SKIP_FRAME';
    filename?: string;
    path?: string;
    url?: string;
    reason?: string;
    confidence?: number;
    faceBox?: number[];
    blurScore?: number;
    details?: {
        blur_score?: number;
        face_ratio?: number;
    };
}

export interface QuoteModeResult {
    success: boolean;
    mode: 'quote';
    videoId: string;
    totalRequested: number;
    validCount: number;
    skipCount: number;
    frames: QuoteModeFrame[];
    error?: string;
}

/**
 * Extract frames at SPECIFIC timestamps where quotes were spoken.
 * Uses speaker face detection and validation.
 * 
 * This is the new quote-to-frame direct mapping mode.
 * Each timestamp corresponds to a quote from the transcript.
 * 
 * @param videoUrl - YouTube video URL
 * @param videoId - Unique video identifier
 * @param timestamps - Array of timestamps in seconds [45, 120, 185, ...]
 * @returns Promise with extraction results including valid/skipped frames
 */
export async function extractFramesAtTimestamps(
    videoUrl: string,
    videoId: string,
    timestamps: number[]
): Promise<QuoteModeResult> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'extract_frames.py');
        const pythonCmd = getPythonCommand();

        console.log(`[QuoteModeExtractor] Starting quote-mode extraction for video ID: ${videoId}`);
        console.log(`[QuoteModeExtractor] Timestamps: ${JSON.stringify(timestamps)}`);
        console.log(`[QuoteModeExtractor] Script path: ${scriptPath}`);

        // Build command arguments for quote mode
        const args = [
            scriptPath,
            '--quote-mode',
            videoUrl,
            videoId,
            '--timestamps',
            JSON.stringify(timestamps)
        ];

        const pythonProcess = spawn(pythonCmd, args);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            const message = data.toString();
            stderrData += message;
            // Log Python stderr to console for debugging
            console.log(`[QuoteMode] ${message.trim()}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[QuoteModeExtractor] Python process exited with code ${code}`);
                console.error(`[QuoteModeExtractor] stderr: ${stderrData}`);

                // Try to parse error from stdout
                try {
                    const result = JSON.parse(stdoutData);
                    if (!result.success) {
                        reject(new Error(result.error || 'Quote-mode extraction failed'));
                        return;
                    }
                } catch (e) {
                    reject(new Error(`Quote-mode extraction failed with code ${code}: ${stderrData}`));
                    return;
                }
            }

            try {
                const result: QuoteModeResult = JSON.parse(stdoutData);

                if (!result.success) {
                    reject(new Error(result.error || 'Unknown error during quote-mode extraction'));
                    return;
                }

                console.log(`[QuoteModeExtractor] ✓ Extracted ${result.validCount}/${result.totalRequested} valid frames`);
                if (result.skipCount > 0) {
                    console.log(`[QuoteModeExtractor] ⚠ Skipped ${result.skipCount} frames (no valid speaker face)`);
                }

                resolve(result);

            } catch (error) {
                console.error('[QuoteModeExtractor] Failed to parse Python output:', stdoutData);
                reject(new Error('Failed to parse quote-mode extraction results'));
            }
        });
        pythonProcess.on('error', (error) => {
            console.error('[QuoteModeExtractor] Failed to start Python process:', error);
            reject(new Error(`Failed to start Python process: ${error.message}. Is Python installed?`));
        });
    });
}

// ===============================
// RANGE MODE (NARRATIVE)
// ===============================

export interface RangeFrame {
    slideIndex: number;
    timestamp: number;
    timestampFormatted: string;
    status: 'VALID' | 'SKIP_FRAME';
    filename?: string;
    path?: string;
    url?: string;
    reason?: string;
    confidence?: number;
    blurScore?: number;
}

export interface RangeModeResult {
    success: boolean;
    mode: 'range';
    videoId: string;
    frames: RangeFrame[];
    error?: string;
}

export interface SearchRange {
    start: number;
    end: number;
    index: number;
}

export async function extractFramesFromRanges(
    videoUrl: string,
    videoId: string,
    ranges: SearchRange[]
): Promise<RangeModeResult> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'extract_frames.py');
        const pythonCmd = getPythonCommand();

        console.log(`[RangeModeExtractor] Starting range-mode extraction for ID: ${videoId}`);
        const args = [
            scriptPath,
            '--ranges', JSON.stringify(ranges),
            '--video_path', videoUrl,
            '--output_dir', path.join(process.cwd(), 'public', 'frames'),
            '--video_id', videoId
        ];

        const pythonProcess = spawn(pythonCmd, args);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
        pythonProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            stderrData += msg;
            console.log(`[RangeMode] ${msg.trim()}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[RangeModeExtractor] Process exited with code ${code}`);
                try {
                    const res = JSON.parse(stdoutData);
                    if (!res.success) reject(new Error(res.error));
                    return;
                } catch (e) {
                    reject(new Error(`Range extraction failed: ${stderrData}`));
                    return;
                }
            }
            try {
                const result: RangeModeResult = JSON.parse(stdoutData);
                resolve(result);
            } catch (err) {
                reject(new Error('JSON Parse Failed'));
            }
        });
    });
}

/**
 * Format timestamp in seconds to readable string (MM:SS or HH:MM:SS)
 */
export function formatTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
