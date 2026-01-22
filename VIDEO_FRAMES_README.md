# Video Frame Extraction Setup

This feature automatically extracts frames from YouTube videos and matches them to carousel slides based on content relevance.

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `yt-dlp` - YouTube video downloader
- `opencv-python` - Frame extraction
- `Pillow` - Image processing

### 2. Install ffmpeg

#### Windows:
1. Download from: https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to System PATH

#### macOS:
```bash
brew install ffmpeg
```

#### Linux:
```bash
sudo apt update
sudo apt install ffmpeg -y
```

### 3. Verify Installation

```bash
python --version  # Should show Python 3.8+
yt-dlp --version  # Should show version number
ffmpeg -version   # Should show ffmpeg version
```

## How It Works

1. **User submits YouTube URL** in the carousel generator
2. **Video download**: yt-dlp downloads the video (lowest quality)
3. **Frame extraction**: OpenCV extracts frames every 60 seconds
4. **Transcript analysis**: Fetches video transcript with timestamps
5. **AI matching**: GPT-4o-mini analyzes slide content and matches to relevant timestamps
6. **Frame attachment**: Matched frames are attached to slides
7. **User selection**: In the editor, users can choose to use the extracted frame or generate AI images

## Features

- ✅ Automatic frame extraction every 60 seconds
- ✅ AI-powered content matching (confidence scores)
- ✅ Integrated with carousel editor
- ✅ Fallback to AI image generation
- ✅ AWS S3 support (optional)
- ✅ Automatic cleanup of temporary files

## Usage

### In the Carousel Generator:
1. Select "YouTube" input type
2. Paste a YouTube URL
3. Click "Generate Carousel"
4. Frames are extracted automatically during generation

### In the Carousel Editor:
1. Navigate to **Design > Slide Images**
2. If a video frame was matched, you'll see:
   - Frame preview with timestamp
   - Confidence score
   - AI reasoning for the match
3. Click **"Use This Frame"** to apply it as the slide background
4. Or click **"Generate"** to create an AI image instead

## Troubleshooting

### Error: "Python not found"
- Install Python 3.8+ from python.org
- Ensure `python` command works in terminal

### Error: "yt-dlp not found"
```bash
pip install --upgrade yt-dlp
```

### Error: "No frames extracted"
- Check video URL is valid
- Ensure video is public (not private/deleted)
- Check disk space in `/public/frames`

### Error: "Frame extraction timeout"
- Video may be too long (>30 minutes can be slow)
- Check internet connection
- Try shorter video first

## Configuration

### Environment Variables

Optional: Configure S3 storage for production
```env
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### Frame Storage
- **Local**: `public/frames/` directory
- **Production**: AWS S3 (if configured)
- **Cleanup**: Frames deleted automatically after processing

## Performance

| Video Length | Processing Time | Frames Extracted |
|--------------|----------------|------------------|
| 2-3 minutes  | ~30 seconds    | 2-3 frames       |
| 10 minutes   | ~60 seconds    | ~10 frames       |
| 30 minutes   | ~2-3 minutes   | ~30 frames       |

*Processing time includes download + extraction + AI matching*

## AWS Deployment

See [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md) for detailed deployment instructions.

## Technical Stack

- **Backend**: Node.js/TypeScript
- **Frame Extraction**: Python + opencv-python
- **Video Downloader**: yt-dlp
- **AI Matching**: OpenAI GPT-4o-mini
- **Storage**: Local filesystem or AWS S3
