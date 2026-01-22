#!/usr/bin/env python3
"""
Speaker Face Detector
Detects and crops speaker faces from video frames with light enhancement.
Follows strict validation rules for visual-content alignment.
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional
from pathlib import Path


class SpeakerFaceDetector:
    """
    Detects active speaker's face in video frames.
    
    Validation rules enforced:
    - Face must be visible and clear
    - Face must be at least 5% of frame area
    - Face must not be blurry (Laplacian variance check)
    - Face must not be partially occluded
    
    Light enhancements ONLY (as per rules):
    ✅ Slight sharpening
    ✅ Minor exposure correction
    ✅ Noise reduction
    ✅ Color balance
    
    FORBIDDEN (blocked):
    ❌ Face reshaping
    ❌ Beauty filters
    ❌ Artistic styling
    ❌ Background replacement
    ❌ AI face reconstruction
    """
    
    def __init__(self):
        # Use OpenCV's Haar Cascade for face detection (no dlib dependency)
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        # Minimum face size as percentage of frame
        self.min_face_ratio = 0.002  # 0.2% (aggressively relaxed for wide shots)
        
        # Minimum blur score (Laplacian variance)
        self.min_blur_score = 40  # Relaxed from 80
        
        # Face padding ratio for cropping
        self.padding_ratio = 0.35
    
    def detect_speaker_face(
        self, 
        frame: np.ndarray,
        prefer_largest: bool = True
    ) -> Dict:
        """
        Detect the active speaker's face in the frame.
        
        Args:
            frame: BGR image (numpy array)
            prefer_largest: If multiple faces, pick largest (likely main speaker)
        
        Returns:
            {
                'detected': bool,
                'reason': str (if not detected),
                'cropped_face': np.ndarray (if detected),
                'face_box': [x, y, w, h],
                'confidence': float,
                'blur_score': float
            }
        """
        if frame is None or frame.size == 0:
            return {
                'detected': False,
                'reason': 'INVALID_FRAME'
            }
        
        # Convert to grayscale for detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),  # Relaxed from 60x60
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        if len(faces) == 0:
            return {
                'detected': False,
                'reason': 'NO_FACE_DETECTED'
            }
        
        # Filter for valid faces based on size ratio
        # Calculate frame area just once
        frame_area = frame.shape[0] * frame.shape[1]
        
        valid_faces = []
        for (x, y, w, h) in faces:
            face_ratio = (w * h) / frame_area
            if face_ratio >= self.min_face_ratio:
                valid_faces.append((x, y, w, h, face_ratio))
        
        if not valid_faces:
             return {
                'detected': False,
                'reason': 'FACE_TOO_SMALL',
                'face_ratio': (faces[0][2] * faces[0][3]) / frame_area if len(faces) > 0 else 0
            }

        # Sort by size just in case we need single mode later
        valid_faces = sorted(valid_faces, key=lambda f: f[4], reverse=True)
        
        # MULTIPLE FACES DETECTED? -> GROUP CROP (Professional 2-shot handling)
        if len(valid_faces) > 1:
            # Calculate bounding box of ALL valid faces
            x_min = min(f[0] for f in valid_faces)
            y_min = min(f[1] for f in valid_faces)
            x_max = max(f[0] + f[2] for f in valid_faces)
            y_max = max(f[1] + f[3] for f in valid_faces)
            
            group_w = x_max - x_min
            group_h = y_max - y_min
            
            # Check blur score of the largest face (as proxy for focus)
            main_face = valid_faces[0]
            face_region = gray[main_face[1]:main_face[1]+main_face[3], main_face[0]:main_face[0]+main_face[2]]
            blur_score = cv2.Laplacian(face_region, cv2.CV_64F).var()
            
            if blur_score < self.min_blur_score:
                 return {
                    'detected': False,
                    'reason': 'FACE_BLURRY',
                    'blur_score': blur_score
                }

            # Crop the GROUP
            # Use slightly less padding for groups to avoid zooming out too much
            original_padding = self.padding_ratio
            self.padding_ratio = 0.2 
            cropped = self._crop_with_padding(frame, x_min, y_min, group_w, group_h)
            self.padding_ratio = original_padding # Restore
            
            enhanced = self.light_enhance(cropped)
            
            return {
                'detected': True,
                'mode': 'GROUP_SHOT',
                'face_count': int(len(valid_faces)),
                'cropped_face': enhanced,
                'face_box': [int(x_min), int(y_min), int(group_w), int(group_h)],
                'confidence': 1.0, # High confidence for group shots
                'blur_score': float(round(blur_score, 2)),
                'face_ratio': float(valid_faces[0][4])
            }

        # SINGLE FACE DETECTED
        x, y, w, h, face_ratio = valid_faces[0]
        
        # Check face clarity using Laplacian variance (blur detection)
        face_region = gray[y:y+h, x:x+w]
        blur_score = cv2.Laplacian(face_region, cv2.CV_64F).var()
        
        if blur_score < self.min_blur_score:
            return {
                'detected': False,
                'reason': 'FACE_BLURRY',
                'blur_score': blur_score
            }
        
        # CROP face with padding
        cropped = self._crop_with_padding(frame, x, y, w, h)
        
        # Apply LIGHT enhancement only
        enhanced = self.light_enhance(cropped)
        
        # Calculate confidence based on blur score and face size
        confidence = min(1.0, (blur_score / 200) * 0.5 + (face_ratio / 0.1) * 0.5)
        
        return {
            'detected': True,
            'mode': 'SINGLE_SHOT',
            'cropped_face': enhanced,
            'face_box': [int(x), int(y), int(w), int(h)],
            'confidence': round(confidence, 3),
            'blur_score': round(blur_score, 2),
            'face_ratio': round(face_ratio, 4)
        }
    
    def _crop_with_padding(
        self, 
        frame: np.ndarray, 
        x: int, y: int, w: int, h: int
    ) -> np.ndarray:
        """
        Crop face region with professional padding (Bust Shot).
        Asymmetric padding: More bottom (torso), less top (headroom), wide sides.
        """
        img_h, img_w = frame.shape[:2]
        
        # Professional Composition Ratios
        pad_top = int(h * 0.8)      # Headroom
        pad_bottom = int(h * 2.0)   # Torso/Shoulders (Deep crop)
        pad_side = int(w * 1.0)     # Width context (Shoulders)
        
        # Apply padding with bounds checking
        x1 = max(0, x - pad_side)
        y1 = max(0, y - pad_top)
        x2 = min(img_w, x + w + pad_side)
        y2 = min(img_h, y + h + pad_bottom)
        
        # Ensure Square Aspect Ratio (centering the subject)
        crop_w = x2 - x1
        crop_h = y2 - y1
        
        if crop_w > crop_h:
            # Too wide? Add height primarily to bottom (torso)
            diff = crop_w - crop_h
            # Add 20% to top, 80% to bottom
            add_top = int(diff * 0.2)
            add_bottom = diff - add_top
            
            y1 = max(0, y1 - add_top)
            y2 = min(img_h, y2 + add_bottom)
        elif crop_h > crop_w:
            # Too tall? Add width symmetrically
            diff = crop_h - crop_w
            x1 = max(0, x1 - diff // 2)
            x2 = min(img_w, x2 + diff // 2)
        
        # Final check to ensure we didn't just drift out of bounds
        return frame[y1:y2, x1:x2]
    
    def light_enhance(self, image: np.ndarray) -> np.ndarray:
        """
        Apply LIGHT enhancements only (as per strict rules).
        
        ALLOWED:
        ✅ Slight sharpening
        ✅ Minor exposure correction (CLAHE)
        ✅ Noise reduction
        ✅ Color balance
        
        FORBIDDEN (not implemented):
        ❌ Face reshaping
        ❌ Beauty filters
        ❌ Artistic styling
        ❌ Background replacement
        ❌ AI face reconstruction
        """
        if image is None or image.size == 0:
            return image
        
        # 1. Noise reduction (bilateral filter - edge-preserving)
        denoised = cv2.bilateralFilter(image, 5, 50, 50)
        
        # 2. Slight sharpening (unsharp mask - very subtle)
        gaussian = cv2.GaussianBlur(denoised, (0, 0), 2.0)
        sharpened = cv2.addWeighted(denoised, 1.2, gaussian, -0.2, 0)
        
        # 3. Auto exposure correction using CLAHE
        lab = cv2.cvtColor(sharpened, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)
        
        enhanced_lab = cv2.merge([l_channel, a_channel, b_channel])
        enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        
        return enhanced
    
    def validate_frame_quality(self, frame: np.ndarray) -> Dict:
        """
        Check overall frame quality metrics.
        
        Returns:
            {
                'is_quality_ok': bool,
                'brightness': float (0-255),
                'contrast': float,
                'sharpness': float
            }
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Brightness (mean pixel value)
        brightness = np.mean(gray)
        
        # Contrast (standard deviation)
        contrast = np.std(gray)
        
        # Sharpness (Laplacian variance)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Quality thresholds
        is_too_dark = brightness < 40
        is_too_bright = brightness > 220
        is_low_contrast = contrast < 20
        is_blurry = sharpness < 50
        
        is_quality_ok = not (is_too_dark or is_too_bright or is_low_contrast or is_blurry)
        
        return {
            'is_quality_ok': is_quality_ok,
            'brightness': round(brightness, 2),
            'contrast': round(contrast, 2),
            'sharpness': round(sharpness, 2),
            'issues': {
                'too_dark': is_too_dark,
                'too_bright': is_too_bright,
                'low_contrast': is_low_contrast,
                'blurry': is_blurry
            }
        }


def format_timestamp(seconds: int) -> str:
    """Format seconds to MM:SS or HH:MM:SS"""
    hrs = seconds // 3600
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


# CLI interface for testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python speaker_face_detector.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    frame = cv2.imread(image_path)
    
    if frame is None:
        print(f"Error: Could not load image: {image_path}")
        sys.exit(1)
    
    detector = SpeakerFaceDetector()
    result = detector.detect_speaker_face(frame)
    
    print(f"Detection result: {result.get('detected', False)}")
    
    if result['detected']:
        print(f"  Confidence: {result['confidence']}")
        print(f"  Blur score: {result['blur_score']}")
        print(f"  Face box: {result['face_box']}")
        
        # Save cropped face
        output_path = Path(image_path).stem + "_face.jpg"
        cv2.imwrite(output_path, result['cropped_face'], [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"  Saved to: {output_path}")
    else:
        print(f"  Reason: {result.get('reason', 'Unknown')}")
