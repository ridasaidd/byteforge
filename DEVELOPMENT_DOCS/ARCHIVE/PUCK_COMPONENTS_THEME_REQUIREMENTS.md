# Puck Components - Theme Requirements

This document outlines the Puck components we've created and the theme values they'll need.

## Components Created

### Layout Components
1. **Section** - Full-width sections with background colors and padding
2. **Container** - Content containers with max-width constraints
3. **Columns** - Responsive multi-column layouts with various distributions

### Content Components
4. **Heading** - Headings (H1-H6) with sizing and styling
5. **Text** - Paragraph text with various sizes and colors
6. **Button** - Interactive buttons with variants and sizes

## Theme Values Needed

Based on the components we've created, here are the theme values we should include in `theme.json`:

### Colors
- **Primary**: Main brand color (currently hardcoded as blue-600)
- **Secondary**: Secondary brand color (currently gray-600)
- **Muted**: Muted/subtle text color (gray-500)
- **Background variants**: white, gray, blue backgrounds for sections
- **Text colors**: Default (gray-900), muted, primary, secondary

### Spacing
- **Padding scales**: none, sm, md, lg, xl
- **Gap scales**: none, sm, md, lg
- **Container padding**: 4, 6, 8 (in px multiplied by 4)
- **Section vertical padding**: 8, 16, 24, 32 (in rem)

### Typography
- **Font sizes**: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl
- **Font weights**: medium (500), semibold (600), bold (700)
- **Line heights**: Default relaxed line-height for text

### Sizing
- **Container max-widths**: 
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - full: 100%

### Border Radius
- **Button radius**: sm (0.125rem), md (0.375rem), lg (0.5rem)

### Button Variants
- **Primary**: Solid primary color background
- **Secondary**: Solid secondary color background
- **Outline**: Transparent with colored border
- **Ghost**: Transparent with hover effect

### Button Sizes
- **sm**: px-3 py-1.5 text-sm
- **md**: px-4 py-2 text-base
- **lg**: px-6 py-3 text-lg

## Current Implementation

Currently, all theme values are **hardcoded using Tailwind classes** in each component. The next step is to:

1. Create a `theme.json` file with centralized theme values
2. Create a theme context/provider to make theme values available throughout the app
3. Update components to reference theme values instead of hardcoded Tailwind classes
4. Allow users to customize themes from the admin panel

## Component Categories

Components are organized into categories in the Puck editor:
- **Layout**: Section, Container, Columns
- **Content**: Heading, Text, Button

This makes it easy for users to find the right component when building pages.

## Next Steps

1. ✅ Create foundational Puck components (DONE)
2. ⏳ Test components in the editor
3. ⏳ Create `theme.json` with centralized values
4. ⏳ Create theme provider/context
5. ⏳ Update components to use theme values
6. ⏳ Build theme customization UI
7. ⏳ Add more advanced components (Image, Card, Hero, etc.)
