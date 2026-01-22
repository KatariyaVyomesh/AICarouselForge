# Frame-First Design System

## Overview
The carousel system now **exclusively uses extracted video frames** as slide backgrounds for YouTube videos, with AI focusing on overlay design rather than image generation.

---

## Design Rules Applied

### ✅ **For YouTube Videos:**

1. **Full-Bleed Video Frames**
   - Extracted frames are used as backgrounds (no AI generation)
   - One slide = one video frame
   - Frames distributed evenly across slides

2. **Text Overlay Treatments**
   AI suggests overlay styles in the `suggested_image` field:
   - **Dark gradients**: "bottom-to-top dark gradient for text readability"
   - **Blur effects**: "slight background blur with sharp text"
   - **Color overlays**: "semi-transparent black overlay, 40% opacity"

3. **Visual Hierarchy**
   - **BOLD headlines** - main focus
   - **Short punchy text** - concise descriptions
   - **Minimal clutter** - clean layouts
   - Text always readable against frame

4. **Format Optimization**
   - Instagram/LinkedIn carousel (1:1 ratio)
   - Visually balanced composition
   - Consistent typography and spacing

---

## What Changed in the Code

### 1. **System Prompt Update** (`app/api/generate-variations/route.ts`)

**Before:**
```
IMAGE GENERATION RULES:
- Generate AI images with host/guest faces
- Use specific person names in prompts
```

**After:**
```
DESIGN RULES FOR VIDEO FRAMES:
- Extracted video frames will be used as FULL-BLEED backgrounds
- DO NOT suggest AI-generated imagery
- Describe TEXT OVERLAY and VISUAL TREATMENT instead:
  * Subtle dark gradients
  * Blur effects
  * Color overlays
- Strong visual hierarchy: BOLD headlines, minimal clutter
```

### 2. **Metadata Extraction Disabled**
```typescript
// ❌ REMOVED: Host/Guest metadata extraction
// Reason: Not needed for frame-first approach
```

### 3. **JSON Format Updated**
```json
{
  "suggested_image": "FOR YOUTUBE: describe overlay/gradient treatment. FOR OTHER INPUTS: describe image to generate"
}
```

---

## User Flow

### **Scenario: YouTube Video → 5-Slide Carousel**

1. **User pastes YouTube URL**
2. **Transcript extracted** with timestamps
3. **Video frames extracted** every 60 seconds (~5 frames)
4. **AI generates carousel content**:
   - Headings, descriptions, layouts
   - **NEW**: Overlay design suggestions (e.g., "dark gradient from bottom")
5. **Frames distributed** evenly across 5 slides:
   - Slide 1 → Frame at 0:00
   - Slide 2 → Frame at 1:12
   - Slide 3 → Frame at 2:24
   - etc.
6. **Slides displayed** with video frames as backgrounds

---

## Example AI Output

### Before (Image Generation):
```json
{
  "suggested_image": "A cinematic photo of Joe Rogan speaking into a microphone in a podcast studio"
}
```

### After (Overlay Design):
```json
{
  "suggested_image": "Bottom-to-top dark gradient (0% to 60% black), white bold headline at bottom, clean sans-serif font"
}
```

---

## Benefits

✅ **No AI Image Generation Costs** (~$0.20 saved per carousel)  
✅ **Authentic Visual Content** (real video frames)  
✅ **Faster Generation** (no DALL-E API calls)  
✅ **Better Context** (frames match the actual video content)  
✅ **Professional Design** (full-bleed backgrounds with overlays)

---

## Implementation Status

| Feature | Status |
|---------|--------|
| Frame extraction (every 60s) | ✅ Complete |
| Even distribution across slides | ✅ Complete |
| Direct background application | ✅ Complete |
| Overlay design prompts | ✅ Complete |
| Metadata extraction disabled | ✅ Complete |
| AI image generation bypass | ✅ Complete |

---

## Next Steps (Optional Enhancements)

1. **Frontend Overlay Controls**
   - Add UI sliders for overlay opacity
   - Preview different gradient directions
   - Toggle blur effects

2. **Auto-Contrast Detection**
   - Analyze frame brightness
   - Auto-suggest dark/light overlays
   - Ensure text readability

3. **Typography Presets**
   - Pre-defined text styles
   - Instagram/LinkedIn optimized fonts
   - Character limits per layout

---

## Testing

To test the new system:

1. Generate carousel with YouTube URL
2. Check console logs for:
   ```
   [FrameDistribution] Slide 1/5 → Frame 1/8 at 00:00
   ```
3. Verify slides have video frames as backgrounds
4. Check `suggested_image` field contains overlay descriptions (not image prompts)

---

## File Changes

- ✅ `app/api/generate-variations/route.ts` - Updated design rules
- ✅ `lib/scrapers.ts` - Commented out metadata extraction
- ✅ Frame distribution logic already in place
- ✅ No changes needed to frontend (frames already applied)
