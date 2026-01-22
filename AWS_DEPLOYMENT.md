# AWS Deployment Instructions

This application supports AWS deployment with the following considerations:

## System Requirements

### For Local Development:
- Python 3.8+
- yt-dlp
- ffmpeg
- Node.js 18+

### For AWS Deployment:

#### Option 1: AWS EC2 (Recommended)
1. **Instance Type**: t3.medium or larger (video processing requires CPU)
2. **Install Dependencies**:
   ```bash
   # Install Python and pip
   sudo apt update
   sudo apt install python3 python3-pip ffmpeg -y
   
   # Install yt-dlp
   sudo pip3 install yt-dlp opencv-python Pillow
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install nodejs -y
   
   # Clone and setup your app
   git clone <your-repo>
   cd AI_Carousel-6
   pnpm install
   pip3 install -r requirements.txt
   ```

3. **Environment Variables**:
   Set in `.env` or `.env.production`:
   ```
   OPENAI_API_KEY=your_key_here
   TRANSCRIPT_API_KEY=your_key_here
   # Optional: For S3 storage
   AWS_S3_BUCKET=your-bucket-name
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   ```

4. **Storage**: Frames stored in `/public/frames`
   - Ensure disk space (recommend 10GB+)
   - Set up automatic cleanup cron job

#### Option 2: AWS Lambda (Advanced)
⚠️ **Not Recommended** - Lambda has limitations:
- Max execution time: 15 minutes
- Max /tmp storage: 10GB
- Requires Lambda Layer for ffmpeg
- Cold starts can be slow

If using Lambda:
1. Create Lambda Layer with ffmpeg and yt-dlp
2. Set timeout to 15 minutes
3. Set memory to at least 2048MB
4. Use S3 for frame storage (required)
5. Set environment variable: `AWS_LAMBDA_FUNCTION_NAME=true`

## S3 Storage (Optional)

To use S3 instead of local storage:

1. **Install boto3**:
   ```bash
   pip3 install boto3
   ```

2. **Configure S3 Bucket**:
   - Create an S3 bucket
   - Set public read  ACL or use CloudFront
   - Add bucket name to `.env`:
     ```
     AWS_S3_BUCKET=your-bucket-name
     ```

3. **Automatic Detection**:
   - The Python script will auto-detect S3 configuration
   - Falls back to local storage if S3 not configured

## Running the Application

### Development:
```bash
pnpm dev
```

### Production (EC2):
```bash
# Build the app
pnpm build

# Start with PM2 (recommended)
pm2 start npm --name "ai-carousel" -- start
pm2 startup
pm2 save
```

## Troubleshooting

### "Python not found"
- Ensure `python3` is installed and in PATH
- On Windows: Install from python.org and add to PATH
- On Linux/Mac: `which python3` should show the path

### "yt-dlp not found"
```bash
pip3 install --upgrade yt-dlp
# Or globally:
sudo pip3 install --upgrade yt-dlp
```

### "Frame extraction failed"
- Check ffmpeg installation: `ffmpeg -version`
- Check Python modules: `python3 -c "import cv2; print(cv2.__version__)"`
- Check disk space: `df -h`

### "Permission denied" errors
```bash
# Fix permissions for frames directory
chmod 755 public/frames
```

## Monitoring

Monitor the application logs for frame extraction:
```bash
# Development
pnpm dev

# Production with PM2
pm2 logs ai-carousel
```

Look for these log prefixes:
- `[yt-dlp]` - Video download progress
- `[OpenCV]` - Frame extraction progress
- `[FrameExtraction]` - Overall progress
- `[FrameMatching]` - AI matching results
