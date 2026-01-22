#!/usr/bin/env python3
"""
Test script for video frame extraction
Usage: python test_extraction.py <youtube_url> <video_id>
Example: python test_extraction.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ" "dQw4w9WgXcQ"
"""

import sys
import subprocess
import os

def check_dependencies():
    """Check if all required dependencies are installed"""
    print("Checking dependencies...")
    errors = []
    
    # Check Python version
    if sys.version_info < (3, 8):
        errors.append("Python 3.8+ required")
    else:
        print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor}")
    
    # Check yt-dlp
    try:
        result = subprocess.run(['yt-dlp', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ yt-dlp {result.stdout.strip()}")
        else:
            errors.append("yt-dlp not working")
    except FileNotFoundError:
        errors.append("yt-dlp not installed")
    
    # Check opencv-python
    try:
        import cv2
        print(f"✓ opencv-python {cv2.__version__}")
    except ImportError:
        errors.append("opencv-python not installed (run: pip install opencv-python)")
    
    # Check Pillow
    try:
        import PIL
        print(f"✓ Pillow {PIL.__version__}")
    except ImportError:
        errors.append("Pillow not installed (run: pip install Pillow)")
    
    if errors:
        print("\n❌ Missing dependencies:")
        for error in errors:
            print(f"   - {error}")
        print("\nInstall missing dependencies with:")
        print("   pip install -r requirements.txt")
        return False
    
    print("\n✓ All dependencies installed!\n")
    return True

def test_extraction(video_url, video_id):
    """Test frame extraction"""
    print(f"Testing frame extraction for video: {video_id}")
    print(f"URL: {video_url}\n")
    
    # Run the extraction script
    script_path = os.path.join(os.path.dirname(__file__), 'extract_frames.py')
    
    if not os.path.exists(script_path):
        print(f"❌ Script not found: {script_path}")
        return False
    
    print("Running extraction script...")
    result = subprocess.run(
        ['python', script_path, video_url, video_id],
        capture_output=True,
        text=True
    )
    
    # Show logs
    if result.stderr:
        print("--- Logs ---")
        print(result.stderr)
        print("------------\n")
    
    # Show output
    if result.stdout:
        print("--- Result ---")
        print(result.stdout)
        print("--------------\n")
    
    if result.returncode == 0:
        print("✓ Extraction successful!")
        return True
    else:
        print("❌ Extraction failed!")
        return False

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    
    video_url = sys.argv[1]
    video_id = sys.argv[2]
    
    print("=" * 60)
    print("Video Frame Extraction Test")
    print("=" * 60 + "\n")
    
    # Check dependencies first
    if not check_dependencies():
        sys.exit(1)
    
    # Test extraction
    success = test_extraction(video_url, video_id)
    
    print("\n" + "=" * 60)
    if success:
        print("✓ TEST PASSED")
        print("=" * 60)
        sys.exit(0)
    else:
        print("❌ TEST FAILED")
        print("=" * 60)
        sys.exit(1)

if __name__ == '__main__':
    main()
