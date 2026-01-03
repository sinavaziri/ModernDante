# ModernDante Codebase Review

This document provides a comprehensive review of the ModernDante codebase with actionable improvement suggestions organized by category.

---

## Executive Summary

ModernDante is a well-architected Next.js application presenting Dante's Divine Comedy with modern translations, audio narration, and Dore illustrations. The codebase demonstrates good practices in component organization and TypeScript usage. Below are opportunities for improvement across code quality, performance, accessibility, and architecture.

---

## 1. Code Quality & TypeScript Improvements

### 1.1 Type Safety Issues

**Location:** `src/components/CantoDisplayWithAudio.tsx:152-153`
```typescript
const prevCanto = getPreviousCanto(cantica as Cantica, canto.number);
const nextCanto = getNextCanto(cantica as Cantica, canto.number);
```
**Issue:** Using `as Cantica` type assertion bypasses type checking.
**Recommendation:** Validate the cantica prop at the component boundary or use a type guard:
```typescript
function isCantica(value: string): value is Cantica {
  return ['inferno', 'purgatorio', 'paradiso'].includes(value);
}
```

**Location:** `src/app/[cantica]/[canto]/page.tsx:34`
```typescript
const cantica = canticaParam as Cantica;
```
**Issue:** Same type assertion issue; invalid values could cause runtime errors.
**Recommendation:** Add validation before the type assertion and return `notFound()` for invalid canticas.

### 1.2 Duplicate Type Definitions

**Issue:** `WordTiming` and `AudioSegment` interfaces are defined in both:
- `src/types/audio.ts`
- `src/components/TextWithWordHighlighting.tsx`

**Recommendation:** Remove duplicate definitions in `TextWithWordHighlighting.tsx` and import from `@/types/audio`.

### 1.3 Magic Numbers

**Location:** `src/components/CantoDisplayWithAudio.tsx:243-246`
```typescript
const normalizeText = (t: string) => t.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 100);
// ...
if (segmentText.includes(stanzaText.substring(0, 50)) || stanzaText.includes(segmentText.substring(0, 50))) {
```
**Recommendation:** Extract magic numbers to named constants:
```typescript
const TEXT_NORMALIZATION_LENGTH = 100;
const MATCH_COMPARISON_LENGTH = 50;
```

### 1.4 Hardcoded Color Values

**Location:** `src/components/TextWithWordHighlighting.tsx:196-198`
```typescript
return {
  opacity: 1,
  color: `rgb(128, 0, 32)`,  // Hardcoded color
```
**Recommendation:** Use Tailwind CSS classes or CSS variables from the theme for consistency:
```typescript
color: 'hsl(var(--primary))',
```

---

## 2. Performance Optimizations

### 2.1 Large JSON File Loading

**Location:** `src/components/CantoDisplayWithAudio.tsx:156-168`
```typescript
const response = await fetch('/audio-word-timings.json');
const data: AudioTimingsRoot = await response.json();
```
**Issue:** The entire audio-word-timings.json file is fetched on every canto page load, even though only one canto's data is needed.

**Recommendation:**
- Split the JSON file into per-canto files: `/audio/[cantica]/canto_[N]/word-timings.json`
- Or implement a dedicated API endpoint that returns only the requested canto's timing data

### 2.2 Missing React.memo on Child Components

**Location:** `src/components/CantoDisplayWithAudio.tsx:23-94, 96-141`
`ImageLightbox` and `InlineImage` components are defined inline and recreated on each render.

**Recommendation:**
- Move these to separate files
- Wrap with `React.memo()` for memoization
- Or move outside the parent component file to prevent recreation

### 2.3 Unnecessary Re-renders in Gallery

**Location:** `src/app/gallery/page.tsx:54-56`
```typescript
const handleImageLoad = (imageNumber: number) => {
  setImageLoaded((prev) => ({ ...prev, [imageNumber]: true }));
};
```
**Issue:** This callback is not memoized with `useCallback`, causing child component re-renders.

**Recommendation:**
```typescript
const handleImageLoad = useCallback((imageNumber: number) => {
  setImageLoaded((prev) => ({ ...prev, [imageNumber]: true }));
}, []);
```

### 2.4 Image Loading Strategy

**Issue:** Gallery page loads all 135 images at once without virtualization.

**Recommendation:**
- Implement intersection observer-based lazy loading
- Consider using a virtualized grid library like `react-window` for large galleries
- Add `loading="lazy"` attribute to non-priority images

### 2.5 Audio Element Preloading

**Location:** `src/components/AudioPlayerWordLevel.tsx:143-152`
```typescript
<audio
  ref={audioRef}
  src={audioSrc}
  // ...
/>
```
**Recommendation:** Add `preload="metadata"` to avoid downloading the entire audio file upfront:
```typescript
<audio preload="metadata" ... />
```

---

## 3. Accessibility Improvements

### 3.1 Missing ARIA Labels

**Location:** `src/components/CantoDisplayWithAudio.tsx:357-388`
```typescript
<div className="poetry text-lg md:text-xl leading-relaxed text-foreground/90">
```
**Recommendation:** Add appropriate ARIA roles and labels:
```typescript
<article role="article" aria-label={`${canto.title} text content`}>
```

### 3.2 Focus Management in Lightbox

**Location:** `src/components/CantoDisplayWithAudio.tsx:45-93`
**Issue:** When the lightbox opens, focus is not trapped or managed.

**Recommendation:**
- Use a focus trap library or implement manual focus trapping
- Return focus to the trigger element when the lightbox closes
- Add `aria-modal="true"` and `role="dialog"` to the lightbox container

```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="lightbox-title"
  className="fixed inset-0 z-50..."
>
```

### 3.3 Skip to Content Link

**Issue:** No skip navigation link for keyboard users.

**Recommendation:** Add a skip link at the top of `layout.tsx`:
```typescript
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:p-2 focus:bg-background focus:border">
  Skip to content
</a>
```

### 3.4 Audio Player Keyboard Support

**Location:** `src/components/AudioPlayerWordLevel.tsx`
**Issue:** No keyboard shortcuts for audio control.

**Recommendation:** Add keyboard event handlers:
- Space: Play/Pause
- Arrow Left/Right: Skip backward/forward
- M: Mute toggle

### 3.5 Color Contrast

**Location:** `src/components/TextWithWordHighlighting.tsx:182-188`
```typescript
return { opacity: 0.6 };
```
**Issue:** 60% opacity may not meet WCAG contrast requirements.

**Recommendation:** Test contrast ratios and ensure minimum 4.5:1 for normal text.

---

## 4. Security Considerations

### 4.1 Missing Content Security Policy

**Location:** `next.config.ts`
**Issue:** No CSP headers configured.

**Recommendation:** Add security headers:
```typescript
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};
```

### 4.2 API Keys in Environment

**Location:** `.env.example`
**Issue:** While using `.env.example` is good practice, ensure `.env` is in `.gitignore`.

**Recommendation:** Verify `.gitignore` includes:
```
.env
.env.local
.env.*.local
```

---

## 5. Architecture & Code Organization

### 5.1 Component File Size

**Location:** `src/components/CantoDisplayWithAudio.tsx` (411 lines)
**Issue:** Large component with multiple sub-components defined inline.

**Recommendation:** Split into smaller focused components:
```
src/components/
  canto/
    CantoDisplay.tsx          # Main orchestrator
    CantoHeader.tsx           # Title and navigation
    CantoContent.tsx          # Text rendering
    ImageLightbox.tsx         # Lightbox modal
    InlineImage.tsx           # Inline image display
```

### 5.2 Shared Component Extraction

**Issue:** Lightbox component is duplicated in:
- `src/components/CantoDisplayWithAudio.tsx`
- `src/app/gallery/page.tsx`

**Recommendation:** Create a shared `Lightbox` component in `src/components/ui/Lightbox.tsx`.

### 5.3 Custom Hooks Extraction

**Location:** `src/components/CantoDisplayWithAudio.tsx:156-168`
**Recommendation:** Extract data fetching logic to custom hooks:
```typescript
// src/hooks/useAudioTimingData.ts
export function useAudioTimingData(cantica: string, cantoNumber: number) {
  const [timingData, setTimingData] = useState<AudioTimingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // ... fetch logic
  return { timingData, loading, error };
}
```

### 5.4 Constants Organization

**Issue:** Some UI constants are scattered:
- `AUDIO.SKIP_DURATION` in constants.ts
- Hardcoded values like `15` in aria-labels

**Recommendation:** Use constants consistently throughout the codebase.

---

## 6. UX Improvements

### 6.1 Loading States

**Location:** `src/components/CantoDisplayWithAudio.tsx:390-394`
```typescript
{!canto.modern && (
  <div className="text-center py-20 text-muted-foreground italic">
    Modern translation coming soon...
  </div>
)}
```
**Recommendation:** Add proper loading states for:
- Initial timing data fetch
- Audio loading
- Image loading in lightbox

### 6.2 Error Handling

**Location:** `src/components/CantoDisplayWithAudio.tsx:163-165`
```typescript
} catch (error) {
  console.error('Failed to load word timing data:', error);
}
```
**Issue:** Errors are only logged, not shown to users.

**Recommendation:** Add user-visible error states:
```typescript
const [error, setError] = useState<string | null>(null);
// In the catch block:
setError('Unable to load audio synchronization. Playback may not be synchronized.');
```

### 6.3 Mobile Audio Player

**Location:** `src/components/AudioPlayerWordLevel.tsx:178`
```typescript
<div className="flex-1 min-w-0 hidden sm:block">
```
**Issue:** Current segment info is hidden on mobile.

**Recommendation:** Create a mobile-optimized layout for the audio player.

### 6.4 Progress Persistence

**Issue:** Reading progress is not saved across sessions.

**Recommendation:** Implement localStorage-based progress saving:
```typescript
// Save last read position
localStorage.setItem('lastRead', JSON.stringify({ cantica, canto: cantoNumber }));
```

---

## 7. SEO & Metadata Improvements

### 7.1 Structured Data

**Location:** `src/app/[cantica]/[canto]/page.tsx:59-75`
**Recommendation:** Add JSON-LD structured data for rich search results:
```typescript
export async function generateMetadata({ params }: PageProps) {
  // ... existing code
  return {
    title: `...`,
    description: `...`,
    openGraph: {
      title: `...`,
      description: `...`,
      type: 'article',
      images: images.length > 0 ? [`/images/${cantica}/${images[0].filename}`] : [],
    },
    other: {
      'application/ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: canto.title,
        author: { '@type': 'Person', name: 'Dante Alighieri' },
      }),
    },
  };
}
```

### 7.2 Sitemap Generation

**Issue:** No sitemap.xml for search engines.

**Recommendation:** Add `src/app/sitemap.ts`:
```typescript
export default function sitemap() {
  const cantos = [...]; // Generate all canto URLs
  return cantos.map(canto => ({
    url: `https://yourdomain.com/${canto.cantica}/${canto.number}`,
    lastModified: new Date(),
    priority: 0.8,
  }));
}
```

### 7.3 Robots.txt

**Issue:** No robots.txt file.

**Recommendation:** Add `public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap.xml
```

---

## 8. Testing Recommendations

### 8.1 Missing Test Infrastructure

**Issue:** No test files or testing configuration found.

**Recommendation:** Add testing infrastructure:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 8.2 Priority Test Areas

1. **Utility functions** (`src/lib/cantos.ts`)
   - `getNextCanto` / `getPreviousCanto` edge cases
   - Navigation at cantica boundaries

2. **Audio synchronization** (`TextWithWordHighlighting.tsx`)
   - Word-to-timing matching algorithm
   - Active line detection

3. **Component rendering**
   - Loading states
   - Error states
   - Empty data handling

---

## 9. Build & Deployment

### 9.1 ESLint Configuration

**Issue:** Default Next.js ESLint config, no custom rules.

**Recommendation:** Add stricter rules in `.eslintrc.json`:
```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 9.2 Bundle Analysis

**Recommendation:** Add bundle analyzer to identify optimization opportunities:
```bash
npm install -D @next/bundle-analyzer
```

### 9.3 CI/CD Pipeline

**Recommendation:** Add GitHub Actions workflow:
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

---

## 10. Quick Wins (Low Effort, High Impact)

1. **Add `preload="metadata"` to audio element** - Reduces initial load
2. **Memoize `handleImageLoad` in gallery** - Prevents re-renders
3. **Extract shared Lightbox component** - Reduces code duplication
4. **Add skip-to-content link** - Improves accessibility
5. **Add error states to fetch calls** - Better user experience
6. **Remove duplicate type definitions** - Cleaner codebase
7. **Add `loading="lazy"` to gallery images** - Faster initial load

---

## Summary

The ModernDante codebase is well-structured with good component organization and TypeScript usage. The main areas for improvement are:

1. **Performance**: Optimize large JSON loading and implement image lazy loading
2. **Accessibility**: Add focus management, keyboard navigation, and ARIA labels
3. **Code Quality**: Extract shared components and remove type assertion overuse
4. **Testing**: Establish testing infrastructure and coverage
5. **SEO**: Add structured data and sitemap

These improvements would enhance the application's performance, maintainability, and accessibility while providing a better experience for all users.
