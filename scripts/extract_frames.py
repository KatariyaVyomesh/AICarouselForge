#!/usr/bin/env python3
"""
Video Frame Extractor with Quote-to-Frame Direct Mapping
Supports two modes:
1. LEGACY: Extract frames every 60 seconds with YOLO person detection
2. QUOTE MODE: Extract frames at specific timestamps with speaker face detection

EC2 + PM2 + yt-dlp + ffmpeg + OpenCV safe
"""

import sys
import json
import os
import subprocess
import cv2
import uuid
import argparse
from pathlib import Path
from typing import List, Dict, Optional
from PIL import Image
import imagehash

# Import speaker face detector
try:
    from speaker_face_detector import SpeakerFaceDetector, format_timestamp
except ImportError:
    # Fallback if not in same directory
    sys.path.insert(0, str(Path(__file__).parent))
    from speaker_face_detector import SpeakerFaceDetector, format_timestamp

# ===============================
# CONFIG
# ===============================
FPS_VALUE = "1/60"
FFMPEG_PATH = "ffmpeg"
yt_dlp_path = "yt-dlp" 
MIN_W = 140
MIN_H = 180
DIFF_THRESHOLD = 27.5
MAX_PEOPLE = 50

# Custom encoder for numpy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        import numpy as np
        if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
            np.int16, np.int32, np.int64, np.uint8,
            np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, (np.float_, np.float16, np.float32, 
            np.float64)):
            return float(obj)
        elif isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)


# ===============================
# DOWNLOAD VIDEO
# ===============================
def download_video(video_url: str, output_path: str) -> str:
    try:
        print(f"[yt-dlp] Downloading: {video_url}", file=sys.stderr)

        output_template = str(Path(output_path).with_suffix(".%(ext)s"))

        cmd = [
            yt_dlp_path,
            "--no-playlist",
            "--cookies", "./cookies.txt",
            "--extractor-args", "youtube:player_client=web",
            "--js-runtimes", "node",
            "--remote-components", "ejs:github",
            # HD Quality: Prefer 1080p, fallback to best available
            "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
            "--merge-output-format", "mp4",
            "--retries", "5",
            "--fragment-retries", "5",
            "--sleep-interval", "2",
            "--max-sleep-interval", "5",
            "-o", output_template,
            video_url
        ]

        subprocess.run(
            cmd,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        base = Path(output_path).with_suffix("")
        for ext in [".mp4", ".webm", ".mkv"]:
            p = str(base) + ext
            if os.path.exists(p):
                print(f"[yt-dlp] ✓ Saved {p}", file=sys.stderr)
                return p

        raise Exception("Downloaded video not found")

    except subprocess.CalledProcessError as e:
        raise Exception(e.stderr.strip())


# ===============================
# EXTRACT FRAMES (LEGACY MODE)
# ===============================
def extract_raw_frames(video_path: str, frames_dir: str) -> None:
    print("[ffmpeg] Extracting frames...", file=sys.stderr)

    subprocess.run([
        FFMPEG_PATH,
        "-loglevel", "error",
        "-i", video_path,
        "-vf", f"fps={FPS_VALUE},scale=700:-1",
        f"{frames_dir}/raw_%04d.jpg"
    ], check=True)

    print("[ffmpeg] ✓ Frames extracted", file=sys.stderr)


# ===============================
# EXTRACT FRAMES AT SPECIFIC TIMESTAMPS (QUOTE MODE)
# ===============================
def extract_frames_at_timestamps(
    video_path: str,
    timestamps: List[int],  # List of seconds [45, 120, 185, ...]
    output_dir: str,
    video_id: str
) -> List[Dict]:
    """
    Extract frames at EXACT timestamps where quotes were spoken.
    Uses speaker face detection and validation.
    
    Args:
        video_path: Path to downloaded video file
        timestamps: List of timestamps in seconds
        output_dir: Directory to save frames
        video_id: Unique video identifier
    
    Returns:
        List of frame results with status (VALID or SKIP_FRAME)
    """
    print(f"[QuoteMode] Extracting {len(timestamps)} frames at specific timestamps", file=sys.stderr)
    
    # Initialize speaker face detector
    detector = SpeakerFaceDetector()
    
    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Could not open video: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    
    print(f"[QuoteMode] Video: {fps:.2f} FPS, {total_frames} frames, {duration:.2f}s duration", file=sys.stderr)
    
    results = []
    
    try:
        for idx, original_ts in enumerate(timestamps):
            print(f"[QuoteMode] Processing timestamp {original_ts}s ({idx+1}/{len(timestamps)})", file=sys.stderr)
            
            # Professional Smart Seek: Search near timestamp if exact frame is bad
            # 0.0 (Exact), +0.5, +1.0, +1.5, +2.0 (Look forward), -0.5, -1.0 (Look back)
            search_offsets = [0.0, 0.5, 1.0, 1.5, 2.0, -0.5, -1.0]
            
            found_valid_frame = False
            best_fail_reason = "UNKNOWN"
            best_fail_details = {}
            
            for offset in search_offsets:
                ts = original_ts + offset
                
                # Boundary check
                if ts < 0 or ts > duration:
                    continue
                    
                frame_num = int(ts * fps)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
                ret, frame = cap.read()
                
                if not ret or frame is None:
                    continue
                    
                # Detect
                face_result = detector.detect_speaker_face(frame)
                
                if face_result['detected']:
                    # Success!
                    filename = f"{video_id}_quote_{int(ts):04d}.jpg"
                    out_path = os.path.join(output_dir, filename)
                    
                    cropped = face_result['cropped_face']
                    cv2.imwrite(out_path, cropped, [cv2.IMWRITE_JPEG_QUALITY, 95])
                    
                    results.append({
                        "timestampFormatted": format_timestamp(ts),
                        "timestamp": ts,  # Actual frame time
                        "originalTimestamp": original_ts, # Requested time (for matching)
                        "status": "VALID",
                        "filename": filename,
                        "path": out_path,
                        "url": f"/frames/{filename}",
                        "confidence": face_result.get('confidence', 0.0),
                        "faceBox": face_result.get('face_box'),
                        "blurScore": face_result.get('blur_score')
                    })
                    
                    print(f"[QuoteMode] ✓ Valid frame found at {ts}s (Offset: {offset}s)", file=sys.stderr)
                    found_valid_frame = True
                    break
                else:
                    # Keep track of why we failed (prioritizing the exact timestamp's reason)
                    if offset == 0.0:
                        best_fail_reason = face_result.get('reason', 'UNKNOWN')
                        best_fail_details = {
                            "blur_score": face_result.get('blur_score'),
                            "face_ratio": face_result.get('face_ratio')
                        }
            
            # If loop finishes without success
            if not found_valid_frame:
                results.append({
                    "timestampFormatted": format_timestamp(original_ts),
                    "timestamp": original_ts,
                    "originalTimestamp": original_ts,
                    "status": "SKIP_FRAME",
                    "reason": best_fail_reason,
                    "details": best_fail_details
                })
                print(f"[QuoteMode] ⚠ SKIP_FRAME at {original_ts}s after smart seek: {best_fail_reason}", file=sys.stderr)
        
    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()
    
    valid_count = sum(1 for r in results if r.get('status') == 'VALID')
    skip_count = sum(1 for r in results if r.get('status') == 'SKIP_FRAME')
    print(f"[QuoteMode] Results: {valid_count} valid, {skip_count} skipped", file=sys.stderr)
    
    return results


# ===============================
# MEDIAN FRAME EXTRACTION (PROFESSIONAL)
# ===============================
def extract_frames_from_ranges(video_path: str, ranges: List[Dict], output_dir: str, video_id: str) -> List[Dict]:
    """
    Extracts a SINGLE FRAME at the MEDIAN timestamp (midpoint) of each range.
    This provides a predictable, professional result tied to the content's timeline.
    
    ranges: [{"start": 10, "end": 20, "index": 0}, ...]
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Could not open video: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    
    detector = SpeakerFaceDetector()
    results = []
    
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"  📹 MEDIAN FRAME EXTRACTION", file=sys.stderr)
    print(f"  Video: {fps:.1f} FPS | {duration:.1f}s duration | {len(ranges)} slides", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)
    
    try:
        for item in ranges:
            start_time = float(item['start'])
            end_time = float(item['end'])
            slide_idx = item.get('index', 0)
            
            # Calculate MEDIAN (midpoint) timestamp
            median_ts = (start_time + end_time) / 2.0
            
            print(f"\n  [Slide #{slide_idx + 1}]", file=sys.stderr)
            print(f"    Range: {start_time:.1f}s → {end_time:.1f}s", file=sys.stderr)
            print(f"    Median: {median_ts:.1f}s", file=sys.stderr)
            
            # Boundary check
            if median_ts > duration:
                print(f"    ⚠️  SKIP: Timestamp exceeds video duration", file=sys.stderr)
                results.append({
                    "slideIndex": slide_idx,
                    "status": "SKIP_FRAME",
                    "reason": "TIMESTAMP_OUT_OF_BOUNDS",
                    "startTime": start_time,
                    "endTime": end_time,
                    "medianTime": median_ts
                })
                continue
            
            # Extract frame at median timestamp
            frame_num = int(median_ts * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            
            if not ret or frame is None:
                print(f"    ⚠️  SKIP: Could not read frame", file=sys.stderr)
                results.append({
                    "slideIndex": slide_idx,
                    "status": "SKIP_FRAME",
                    "reason": "FRAME_READ_FAILED",
                    "startTime": start_time,
                    "endTime": end_time,
                    "medianTime": median_ts
                })
                continue
            
            # Detect and crop speaker face
            face_result = detector.detect_speaker_face(frame)
            
            if face_result['detected']:
                # Save the cropped frame
                filename = f"{video_id}_slide_{slide_idx}_{int(median_ts):04d}.jpg"
                out_path = os.path.join(output_dir, filename)
                
                cropped = face_result['cropped_face']
                cv2.imwrite(out_path, cropped, [cv2.IMWRITE_JPEG_QUALITY, 100])  # HD Quality
                
                mode = face_result.get('mode', 'UNKNOWN')
                blur = face_result.get('blur_score', 0)
                
                print(f"    ✅ EXTRACTED: {filename}", file=sys.stderr)
                print(f"       Mode: {mode} | Blur: {blur:.0f}", file=sys.stderr)
                
                results.append({
                    "slideIndex": slide_idx,
                    "timestampFormatted": format_timestamp(median_ts),
                    "timestamp": median_ts,
                    "startTime": start_time,
                    "endTime": end_time,
                    "status": "VALID",
                    "filename": filename,
                    "path": out_path,
                    "url": f"/frames/{filename}",
                    "confidence": face_result.get('confidence', 0.0),
                    "blurScore": blur,
                    "mode": mode
                })
            else:
                reason = face_result.get('reason', 'UNKNOWN')
                print(f"    ⚠️  SKIP: {reason}", file=sys.stderr)
                
                results.append({
                    "slideIndex": slide_idx,
                    "status": "SKIP_FRAME",
                    "reason": reason,
                    "startTime": start_time,
                    "endTime": end_time,
                    "medianTime": median_ts,
                    "details": {
                        "blur_score": face_result.get('blur_score'),
                        "face_ratio": face_result.get('face_ratio')
                    }
                })

    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()
    
    # Summary
    valid_count = sum(1 for r in results if r.get('status') == 'VALID')
    skip_count = len(results) - valid_count
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"  📊 SUMMARY: {valid_count} extracted, {skip_count} skipped", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)
            
    return results


# ===============================
# CROP HELPER (LEGACY)
# ===============================
def crop_center_square(img, x1, y1, x2, y2):
    h, w, _ = img.shape
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2
    side = int(max(x2 - x1, y2 - y1) * 1.25)
    half = side // 2

    nx1 = max(0, cx - half)
    ny1 = max(0, cy - half)
    nx2 = min(w, cx + half)
    ny2 = min(h, cy + half)

    return img[ny1:ny2, nx1:nx2]


# ===============================
# YOLO PROCESSING (LEGACY)
# ===============================
def process_frames_with_yolo(frames_dir: str, video_id: str) -> List[Dict]:
    print("[YOLO] Loading model...", file=sys.stderr)
    
    from ultralytics import YOLO
    import io, contextlib
    with contextlib.redirect_stdout(io.StringIO()):
        model = YOLO("yolov8n.pt").to("cpu")

    known_hashes = []
    saved = 0
    results = []

    raw_files = sorted(f for f in os.listdir(frames_dir) if f.startswith("raw_"))

    for f in raw_files:
        frame_path = os.path.join(frames_dir, f)
        frame = cv2.imread(frame_path)
        if frame is None:
            continue

        detections = model(frame, conf=0.4, imgsz=640, verbose=False)[0]

        for box in detections.boxes:
            if int(box.cls[0]) != 0:
                continue

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            if (x2 - x1) < MIN_W or (y2 - y1) < MIN_H:
                continue

            crop = crop_center_square(frame, x1, y1, x2, y2)
            if crop.shape[0] > 512 and crop.shape[1] > 512:
                crop = cv2.resize(crop, (512, 512), interpolation=cv2.INTER_LANCZOS4)

            pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
            hsh = imagehash.phash(pil)

            if any(hsh - k < DIFF_THRESHOLD for k in known_hashes):
                break

            known_hashes.append(hsh)

            out_name = f"{video_id}_person_{saved:04d}.jpg"
            out_path = os.path.join(frames_dir, out_name)
            cv2.imwrite(out_path, crop, [cv2.IMWRITE_JPEG_QUALITY, 95])

            frame_num = int(f.replace("raw_", "").replace(".jpg", ""))
            ts = (frame_num - 1) * 60
            m, s = divmod(ts, 60)
            h, m = divmod(m, 60)
            timestamp = f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"

            results.append({
                "timestamp": timestamp,
                "timestampSeconds": ts,
                "filename": out_name,
                "path": out_path,
                "personIndex": saved
            })

            saved += 1
            break

        os.remove(frame_path)

        if saved >= MAX_PEOPLE:
            break

    return results


# ===============================
# MAIN - QUOTE MODE
# ===============================
def main_quote_mode():
    """
    Quote-to-Frame extraction mode.
    Usage: script --quote-mode <url> <video_id> --timestamps <json_array>
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Extract frames at specific timestamps")
    parser.add_argument("--quote-mode", action="store_true", help="Enable quote mode")
    parser.add_argument("url", help="YouTube video URL")
    parser.add_argument("video_id", help="Video ID for naming")
    parser.add_argument("--timestamps", required=True, help="JSON array of timestamps in seconds")
    
    args = parser.parse_args()
    
    # Parse timestamps
    timestamps = json.loads(args.timestamps)
    if not isinstance(timestamps, list):
        print(json.dumps({"success": False, "error": "timestamps must be a JSON array"}))
        sys.exit(1)
    
    base_dir = Path(__file__).parent.parent / "public" / "frames"
    base_dir.mkdir(parents=True, exist_ok=True)
    base_dir = str(base_dir)
    
    temp_video = os.path.join(base_dir, f"temp_{uuid.uuid4().hex}.mp4")
    
    try:
        print(f"[QuoteMode] Starting for {args.video_id}", file=sys.stderr)
        print(f"[QuoteMode] Timestamps: {timestamps}", file=sys.stderr)
        
        video_path = download_video(args.url, temp_video)
        frames = extract_frames_at_timestamps(video_path, timestamps, base_dir, args.video_id)
        
        if os.path.exists(video_path):
            os.remove(video_path)
        
        valid_frames = [f for f in frames if f.get('status') == 'VALID']
        skip_frames = [f for f in frames if f.get('status') == 'SKIP_FRAME']
        
        print(json.dumps({
            "success": True,
            "mode": "quote",
            "videoId": args.video_id,
            "totalRequested": len(timestamps),
            "validCount": len(valid_frames),
            "skipCount": len(skip_frames),
            "frames": frames
        }, cls=NumpyEncoder))
    
    except Exception as e:
        if os.path.exists(temp_video):
            os.remove(temp_video)
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


# ===============================
# MAIN - LEGACY MODE
# ===============================
def main_legacy():
    """Legacy extraction mode (every 60 seconds with YOLO)"""
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: script <url> <video_id>"}, cls=NumpyEncoder))
        sys.exit(1)

    video_url = sys.argv[1]
    video_id = sys.argv[2]

    base_dir = Path(__file__).parent.parent / "public" / "frames"
    base_dir.mkdir(parents=True, exist_ok=True)
    base_dir = str(base_dir)

    temp_video = os.path.join(base_dir, f"temp_{uuid.uuid4().hex}.mp4")

    try:
        print(f"[LegacyMode] Starting for {video_id}", file=sys.stderr)

        video_path = download_video(video_url, temp_video)
        extract_raw_frames(video_path, base_dir)
        frames = process_frames_with_yolo(base_dir, video_id)

        for f in frames:
            f["url"] = f"/frames/{f['filename']}"

        if os.path.exists(video_path):
            os.remove(video_path)

        print(json.dumps({
            "success": True,
            "mode": "legacy",
            "videoId": video_id,
            "frameCount": len(frames),
            "frames": frames
        }, cls=NumpyEncoder))

    except Exception as e:
        if os.path.exists(temp_video):
            os.remove(temp_video)
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


# ===============================
# ENTRY POINT
# ===============================
def main_range_mode():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video_path", required=True)  # Can be URL or local path
    parser.add_argument("--ranges", required=True)  # JSON string
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--video_id", default="unknown")
    
    args = parser.parse_args()
    
    temp_video = None
    
    try:
        ranges = json.loads(args.ranges)
        
        # Ensure output directory exists
        os.makedirs(args.output_dir, exist_ok=True)
        
        # Determine if video_path is a URL or local file
        video_path = args.video_path
        is_url = video_path.startswith("http://") or video_path.startswith("https://")
        
        if is_url:
            # Download video first
            temp_video = os.path.join(args.output_dir, f"temp_{uuid.uuid4().hex}.mp4")
            print(f"[RangeMode] Downloading video from URL...", file=sys.stderr)
            video_path = download_video(args.video_path, temp_video)
            print(f"[RangeMode] ✓ Video downloaded to: {video_path}", file=sys.stderr)
        
        # Run extraction
        results = extract_frames_from_ranges(video_path, ranges, args.output_dir, args.video_id)
        
        # Cleanup temp video
        if temp_video and os.path.exists(video_path):
            os.remove(video_path)
            print(f"[RangeMode] Cleaned up temp video", file=sys.stderr)
        
        print(json.dumps({
            "success": True,
            "mode": "range",
            "videoId": args.video_id,
            "frames": results
        }, cls=NumpyEncoder))
        
    except Exception as e:
        # Cleanup on error
        if temp_video:
            for ext in [".mp4", ".webm", ".mkv"]:
                p = temp_video.replace(".mp4", ext)
                if os.path.exists(p):
                    os.remove(p)
        print(json.dumps({"success": False, "error": str(e)}, cls=NumpyEncoder))
        sys.exit(1)

if __name__ == "__main__":
    if "--ranges" in sys.argv:
        main_range_mode()
    elif "--quote-mode" in sys.argv:
        main_quote_mode()
    else:
        main_legacy()
