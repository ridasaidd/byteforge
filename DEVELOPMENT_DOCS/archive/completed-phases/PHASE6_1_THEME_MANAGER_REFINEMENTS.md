# Phase 6.1: Theme Manager Refinements & Settings Tab Improvements

Last updated: January 31, 2026  
Status: Implementation Ready (Branch: `feature/phase6-1-theme-manager-refinements`)

---

## Executive Summary

**Goal:** Polish the theme management system with critical safety features and enhance the Settings tab UX with visual tools.

**Prerequisites:** Phase 6 (Theme Customization) complete ✅

**Philosophy:** Simplicity first - less moving parts, cleaner UX, leverage existing shadcn/ui components.

**Timeline:** 2-3 days

---

## Design Decisions (Finalized)

| Feature | Decision | Rationale |
|---------|----------|-----------|
| Deletion Protection | Disable button + backend validation | Simplest UX, prevents accidental deletion |
| Switch Warning | Simple dialog + 5-sec timer | Forces user to read before proceeding |
| Rollback | Reset button confirmation + 5-sec timer | Same pattern as switch warning for consistency |
| Colors | Modal with ColorPickerControlColorful | Reuses existing component, cleaner UI |
| Typography | Live preview text below inputs | Shows impact immediately without modal |
| Spacing/Border Radius | Input + integrated visual bar (same row) | Contextual visualization, no modal needed |
| Units | px only (no selector) | Simplicity, matches current defaults |
| Preview Image | Button → MediaPickerModal → stores URL | Reuses existing picker, simple storage |
| Settings Layout | Visual sections (no accordion) | Less complexity, natural content flow |
| Color Palette | Remove - use individual color pickers only | Reduces UI complexity |
| CSS Export | Removed | Not needed for MVP |

---

## Critical Safety Features (Priority 1)

### 1. Deletion Protection for Active Themes ⚡ **CRITICAL**

**Problem:** Themes cannot be deleted if they're active (central or tenants) - enforced at both frontend and backend.

**Frontend Implementation:**
- Disable Delete button when `theme.is_active === true`
- Show tooltip: "Cannot delete active theme"
- No modal needed - button state prevents interaction

**Backend Implementation:**
- Add validation in `ThemeController::destroy()`
- Reject deletion of active themes (422 Unprocessable Entity)
- Simple check: `if ($theme->is_active) reject`

**Files to Change:**
- `app/Http/Controllers/Api/ThemeController.php` - Add deletion validation
- `resources/js/apps/central/components/pages/ThemesPage.tsx` - Disable Delete button logic

---

### 2. Theme Switch Warning Dialog ⚡ **CRITICAL**

**Problem:** Switching themes overwrites customizations without warning.

**Solution:** Simple confirmation dialog with 5-second countdown timer before confirm button enables.

**Frontend Implementation:**
- State: `switchWarning` tracks theme being switched to
- Dialog shows warning text about customization loss
- Confirm button disabled for 5 seconds, shows countdown
- Cancel/X button available immediately
- Modal uses shadcn `Dialog` component

**Files to Change:**
- `resources/js/apps/central/components/pages/ThemesPage.tsx` - Add dialog + timer logic

---

### 3. Theme Rollback to Blueprint (Reset Button Enhancement)

**Current:** Reset button exists on theme card.

**Enhancement:** Use it to rollback customizations to blueprint defaults with confirmation.

**Frontend Implementation:**
- State: `resetConfirm` tracks theme being reset
- Dialog shows what will be reset: settings, header, footer
- Confirm button disabled for 5 seconds (same timer pattern)
- After confirmation, API call triggers rollback

**Backend Implementation:**
- Update `ThemeService::rollbackToBlueprint()` or `resetTheme()`
- Clear customization CSS and puck_data from theme_parts
- Re-copy blueprint placeholders

**Files to Change:**
- `app/Services/ThemeService.php` - Implement rollback logic
- `resources/js/apps/central/components/pages/ThemesPage.tsx` - Add reset dialog + timer

---

## Settings Tab UX Improvements (Priority 2)

### Layout Structure

**Visual sections (no accordion):**
```
═══════════════════════════════════════════════════════════
SETTINGS TAB
═══════════════════════════════════════════════════════════

Colors ─────────────────────────────────────────────────────
  [Edit Primary]  [Edit Secondary]  [Edit Accent]

Typography ─────────────────────────────────────────────────
  [Font Family Sans] [Font Family Serif] [Font Family Mono]
  [Base Font Size]   [Large Font Size]   [XL Font Size]
  
  Live Preview:
  ┌─────────────────────────────────────────────────────────┐
  │ Heading 1: The quick brown fox jumps over the lazy dog  │
  │ Heading 2: The quick brown fox jumps over the lazy dog  │
  │ Body: Lorem ipsum dolor sit amet...                      │
  └─────────────────────────────────────────────────────────┘

Spacing ─────────────────────────────────────────────────────
  None (0)        ┃ 0px
  Small (4)       ┃████████████████ 16px
  Medium (8)      ┃████████████████████████████████ 32px
  Large (16)      ┃████████████████████████████████████████████████████████████ 64px

Border Radius ──────────────────────────────────────────────
  Base            ┃ [4]px        Visual Box
  Full            ┃ [9999]px     Visual Circle

Theme Preview ──────────────────────────────────────────────
  [Select from Media Library] [Clear] [Preview Image Thumbnail]
```

---

### 4. Colors - Modal with ColorPickerControlColorful

**Implementation:**
- Each color (Primary, Secondary, Accent) is a button
- Button shows current color as background
- Click → Modal opens with `ColorPickerControlColorful`
- Modal has Done/Cancel buttons
- After selection, modal closes and color updates

**Files to Change:**
- `resources/js/shared/components/organisms/ThemeBuilderPage.tsx` - Color picker logic + modal

### 5. Typography - Live Preview

**Implementation:**
- Typography inputs: Font Family (sans/serif/mono), Font Sizes (base/lg/xl)
- Below inputs: Live preview section showing text at different sizes
- Updates in real-time as user edits values
- Shows actual font rendering so users see impact immediately

**Files to Change:**
- `resources/js/shared/components/organisms/ThemeBuilderPage.tsx` - Typography section + live preview

### 6. Spacing & Border Radius - Integrated Visual Bars

**Implementation:**
- Spacing: Grid of 4 inputs (None, Small, Medium, Large)
  - Each row: Input field + visual bar showing px width
  - Bar fills proportionally to value
- Border Radius: Grid of 2 inputs (Base, Full)
  - Each row: Input field + visual preview box with rounded corners

**Files to Change:**
- `resources/js/shared/components/organisms/ThemeBuilderPage.tsx` - Spacing + Border Radius sections

### 7. Theme Preview Image

**Implementation:**
- "Select from Media Library" button opens `MediaPickerModal`
- User selects image → returns Media object
- Store only `media.url` in theme's `preview_image` field
- Show thumbnail below button if preview image exists
- Clear button removes preview

**Files to Change:**
- `resources/js/shared/components/organisms/ThemeBuilderPage.tsx` - Info tab, media picker logic

---

## Implementation Steps (Step-by-Step)

### Phase 6.1a: Deletion Protection (30 min)

**Backend:**
1. Open `app/Http/Controllers/Api/ThemeController.php`
2. Find `destroy(Theme $theme)` method
3. Add validation at start:
   ```php
   if ($theme->is_active) {
       return response()->json(['message' => 'Cannot delete active theme'], 422);
   }
   ```

**Frontend:**
1. Open `resources/js/apps/central/components/pages/ThemesPage.tsx`
2. Find Delete button render
3. Add props: `disabled={theme.is_active}` and `title="Cannot delete active theme"`
4. Test: Try deleting active theme → button disabled

**Test:**
- [ ] Delete button disabled for active theme
- [ ] Can delete inactive themes
- [ ] Backend returns 422 when trying to delete active theme

---

### Phase 6.1b: Switch Warning Dialog with 5-sec Timer (1 hour)

**Frontend:**
1. Open `resources/js/apps/central/components/pages/ThemesPage.tsx`
2. Import Dialog components from shadcn:
   ```tsx
   import {
     Dialog,
     DialogContent,
     DialogHeader,
     DialogTitle,
     DialogDescription,
     DialogFooter,
   } from '@/shared/components/ui/dialog';
   ```
3. Add state for switch warning:
   ```tsx
   const [switchWarning, setSwitchWarning] = useState<number | null>(null);
   const [switchTimer, setSwitchTimer] = useState(5);
   ```
4. Create timer effect (start 5-sec countdown when dialog opens):
   ```tsx
   useEffect(() => {
     if (switchWarning === null) return;
     setSwitchTimer(5);
     const interval = setInterval(() => {
       setSwitchTimer(t => t > 0 ? t - 1 : 0);
     }, 1000);
     return () => clearInterval(interval);
   }, [switchWarning]);
   ```
5. Update activate handler to show dialog:
   ```tsx
   const handleActivate = (id: number) => {
     setSwitchWarning(id);
   };
   ```
6. Add confirm handler:
   ```tsx
   const confirmActivate = async (id: number) => {
     try {
       await themes.activate({ theme_id: id });
       toast({ title: 'Success', description: 'Theme activated' });
       await loadThemes();
       setSwitchWarning(null);
     } catch (error: any) {
       toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' });
     }
   };
   ```
7. Add Dialog JSX before return:
   ```tsx
   {switchWarning !== null && (
     <Dialog open={switchWarning !== null} onOpenChange={() => setSwitchWarning(null)}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>Switch Theme?</DialogTitle>
           <DialogDescription>
             Switching themes will overwrite your current customizations including colors, spacing, typography, header, and footer content. This action cannot be undone.
           </DialogDescription>
         </DialogHeader>
         <DialogFooter>
           <button onClick={() => setSwitchWarning(null)}>Cancel</button>
           <Button 
             disabled={switchTimer > 0}
             onClick={() => confirmActivate(switchWarning)}
           >
             {switchTimer > 0 ? `Switch (${switchTimer}s)` : 'Switch Theme'}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   )}
   ```

**Test:**
- [ ] Click activate → dialog opens
- [ ] Timer shows 5, 4, 3, 2, 1
- [ ] Confirm button disabled until timer reaches 0
- [ ] Click Cancel → dialog closes
- [ ] Confirm button enabled after timer finishes
- [ ] Click Confirm → theme activates

---

### Phase 6.1c: Reset Theme Dialog with 5-sec Timer (1 hour)

Same pattern as switch warning but simpler. Reuse timer logic.

**Frontend:**
1. Open `resources/js/apps/central/components/pages/ThemesPage.tsx`
2. Add state:
   ```tsx
   const [resetWarning, setResetWarning] = useState<number | null>(null);
   const [resetTimer, setResetTimer] = useState(5);
   ```
3. Add timer effect for reset:
   ```tsx
   useEffect(() => {
     if (resetWarning === null) return;
     setResetTimer(5);
     const interval = setInterval(() => {
       setResetTimer(t => t > 0 ? t - 1 : 0);
     }, 1000);
     return () => clearInterval(interval);
   }, [resetWarning]);
   ```
4. Update reset handler:
   ```tsx
   const handleReset = (id: number) => {
     setResetWarning(id);
   };

   const confirmReset = async (id: number) => {
     try {
       await themes.reset(id);
       toast({ title: 'Success', description: 'Theme reset to blueprint' });
       await loadThemes();
       setResetWarning(null);
     } catch (error: any) {
       toast({ title: 'Error', description: 'Failed to reset theme', variant: 'destructive' });
     }
   };
   ```
5. Add reset Dialog JSX:
   ```tsx
   {resetWarning !== null && (
     <Dialog open={resetWarning !== null} onOpenChange={() => setResetWarning(null)}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>Reset Theme to Blueprint?</DialogTitle>
           <DialogDescription>
             This will remove all customizations (colors, spacing, typography, header, footer) and restore blueprint defaults. This action cannot be undone.
           </DialogDescription>
         </DialogHeader>
         <DialogFooter>
           <button onClick={() => setResetWarning(null)}>Cancel</button>
           <Button 
             variant="destructive"
             disabled={resetTimer > 0}
             onClick={() => confirmReset(resetWarning)}
           >
             {resetTimer > 0 ? `Reset (${resetTimer}s)` : 'Reset Theme'}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   )}
   ```

**Test:**
- [ ] Click reset → dialog opens
- [ ] Timer shows countdown
- [ ] Button disabled until timer finishes
- [ ] Can cancel with X or Cancel button
- [ ] Theme resets after confirmation

---

### Phase 6.1d: Settings Tab - Colors with Modal (1.5 hours)

**Frontend:**
1. Open `resources/js/shared/components/organisms/ThemeBuilderPage.tsx`
2. Find Settings tab content
3. Add state for color modal:
   ```tsx
   const [colorModal, setColorModal] = useState<'primary' | 'secondary' | 'accent' | null>(null);
   ```
4. Import ColorPickerControlColorful:
   ```tsx
   import { ColorPickerControlColorful } from '@/shared/puck/fields/ColorPickerControlColorful';
   ```
5. Replace color inputs with buttons + modal:
   ```tsx
   <div>
     <label className="block text-sm font-medium mb-2">Colors</label>
     <div className="flex gap-3">
       <button 
         className="w-12 h-12 rounded border"
         style={{ backgroundColor: themeData.colors?.primary?.['500'] || '#222' }}
         onClick={() => setColorModal('primary')}
       />
       <button 
         className="w-12 h-12 rounded border"
         style={{ backgroundColor: themeData.colors?.secondary?.['500'] || '#666' }}
         onClick={() => setColorModal('secondary')}
       />
       <button 
         className="w-12 h-12 rounded border"
         style={{ backgroundColor: themeData.colors?.accent?.['500'] || '#e0e0e0' }}
         onClick={() => setColorModal('accent')}
       />
     </div>
   </div>

   {/* Color Picker Modal */}
   {colorModal && (
     <Dialog open={colorModal !== null} onOpenChange={() => setColorModal(null)}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>Select {colorModal} Color</DialogTitle>
         </DialogHeader>
         <ColorPickerControlColorful
           field={{ label: colorModal }}
           value={themeData.colors?.[colorModal]?.['500'] || '#000'}
           onChange={(value) => {
             const newValue = typeof value === 'string' ? value : value.value;
             setThemeData({
               ...themeData,
               colors: {
                 ...themeData.colors,
                 [colorModal]: {
                   ...themeData.colors?.[colorModal],
                   '500': newValue,
                 },
               },
             });
           }}
         />
         <DialogFooter>
           <Button onClick={() => setColorModal(null)}>Done</Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   )}
   ```

**Test:**
- [ ] Color buttons show current colors
- [ ] Click button → modal opens with ColorPickerControlColorful
- [ ] Can select color and modal closes
- [ ] Theme data updates with new color

---

### Phase 6.1e: Settings Tab - Typography with Live Preview (1.5 hours)

**Frontend:**
1. Open Settings tab in ThemeBuilderPage
2. Add Typography section with font inputs
3. Add live preview below showing sample text:
   ```tsx
   <div>
     <label className="block text-sm font-medium mb-2">Font Family (Sans)</label>
     <input
       type="text"
       value={themeData.typography?.fontFamily?.sans || ''}
       onChange={(e) => setThemeData({ /* update */ })}
       placeholder="Inter, system-ui, sans-serif"
       className="w-full px-3 py-2 border rounded"
     />
   </div>

   {/* Live Preview */}
   <div className="mt-4 p-4 border rounded bg-gray-50 space-y-3">
     <p style={{ fontFamily: themeData.typography?.fontFamily?.sans }}>
       <span className="text-xs text-muted-foreground">Heading 1</span><br/>
       The quick brown fox jumps over the lazy dog
     </p>
     <p style={{ fontFamily: themeData.typography?.fontFamily?.sans }}>
       <span className="text-xs text-muted-foreground">Body</span><br/>
       Lorem ipsum dolor sit amet, consectetur adipiscing elit.
     </p>
   </div>
   ```

**Test:**
- [ ] Font inputs update live preview
- [ ] Size inputs update preview text size
- [ ] Changes reflected immediately

---

### Phase 6.1f: Settings Tab - Spacing & Border Radius with Visual Bars (1.5 hours)

**Frontend:**
1. Open Settings tab in ThemeBuilderPage
2. Find Spacing section
3. Replace grid with visual bars:
   ```tsx
   <div className="space-y-3">
     {Object.entries(themeData.spacing || {}).map(([key, value]) => (
       <div key={key} className="flex items-center gap-3">
         <label className="w-20 text-sm text-muted-foreground">
           {key === '0' ? 'None' : key === '4' ? 'Small' : key === '8' ? 'Medium' : 'Large'}
         </label>
         <input
           type="number"
           value={value}
           onChange={(e) => setThemeData({
             ...themeData,
             spacing: { ...themeData.spacing, [key]: e.target.value }
           })}
           className="w-16 px-2 py-1 border rounded"
         />
         <div 
           className="h-6 bg-blue-500 rounded flex-1"
           style={{ width: `${Math.min(value, 100)}px` }}
         />
         <span className="text-xs text-muted-foreground">{value}px</span>
       </div>
     ))}
   </div>
   ```
4. Do same for Border Radius (show preview boxes instead of bars)

**Test:**
- [ ] Bars update width when input changes
- [ ] Border radius boxes update border value visually
- [ ] Values persist in theme data

---

### Phase 6.1g: Info Tab - Preview Image from Media Library (1 hour)

**Frontend:**
1. Open ThemeBuilderPage Info tab
2. Import MediaPickerModal:
   ```tsx
   import { MediaPickerModal } from '@/shared/components/organisms/MediaPickerModal';
   ```
3. Add state:
   ```tsx
   const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
   ```
4. Add preview image section:
   ```tsx
   <div>
     <label className="block text-sm font-medium mb-2">Preview Image</label>
     <div className="flex gap-2">
       <Button variant="outline" onClick={() => setMediaPickerOpen(true)}>
         Select from Media Library
       </Button>
       {themeInfo.preview_image && (
         <Button variant="ghost" onClick={() => setThemeInfo({ ...themeInfo, preview_image: null })}>
           Clear
         </Button>
       )}
     </div>
     {themeInfo.preview_image && (
       <img 
         src={themeInfo.preview_image} 
         alt="Preview" 
         className="mt-2 max-w-xs rounded border"
       />
     )}
   </div>

   {/* Media Picker Modal */}
   <MediaPickerModal
     isOpen={mediaPickerOpen}
     onClose={() => setMediaPickerOpen(false)}
     onSelect={(media) => {
       setThemeInfo({ ...themeInfo, preview_image: media.url });
       setMediaPickerOpen(false);
     }}
     title="Select Preview Image"
     allowedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
   />
   ```

**Test:**
- [ ] Button opens media picker
- [ ] Can select image from library
- [ ] Thumbnail shows after selection
- [ ] Clear button removes preview
- [ ] URL stored in theme_info.preview_image

---

## Implementation Order

**Day 1 (Critical Safety):**
1. ✅ Phase 6.1a: Deletion Protection (30 min)
2. ✅ Phase 6.1b: Switch Warning Dialog (1 hour)
3. ✅ Phase 6.1c: Reset Dialog (1 hour)
4. Test all 3 features end-to-end (30 min)

**Day 2 (Settings Tab - Part 1):**
1. ✅ Phase 6.1d: Colors Modal (1.5 hours)
2. ✅ Phase 6.1e: Typography Live Preview (1.5 hours)
3. Test colors and typography (30 min)

**Day 2/3 (Settings Tab - Part 2):**
1. ✅ Phase 6.1f: Spacing & Border Radius Bars (1.5 hours)
2. ✅ Phase 6.1g: Preview Image from Media Library (1 hour)
3. Full Settings tab testing (1 hour)
4. Polish and refinements (30 min)

## Testing Checklist

**Deletion Protection:**
- [ ] Delete button disabled for active theme
- [ ] Can delete inactive themes
- [ ] Backend returns 422 if trying to delete active theme
- [ ] Tooltip shows on disabled button

**Switch Warning:**
- [ ] Dialog appears when activating new theme
- [ ] Timer shows 5, 4, 3, 2, 1 seconds
- [ ] Confirm button disabled during countdown
- [ ] Cancel closes dialog without activating
- [ ] After timer reaches 0, confirm button enabled
- [ ] Theme activates after clicking confirm

**Reset Theme:**
- [ ] Dialog appears when clicking reset
- [ ] Timer countdown works
- [ ] Dialog closes on cancel
- [ ] Theme resets after confirmation
- [ ] All customizations cleared (colors, spacing, header, footer)

**Colors:**
- [ ] Color buttons show current colors
- [ ] Click button opens modal with ColorPickerControlColorful
- [ ] Can pick new color
- [ ] Modal closes and color updates
- [ ] All 3 colors (primary, secondary, accent) work

**Typography:**
- [ ] Font inputs update live preview
- [ ] Size inputs update text size in preview
- [ ] Multiple preview text sizes visible
- [ ] Changes persist to theme data

**Spacing & Border Radius:**
- [ ] Input fields work and update values
- [ ] Visual bars scale proportionally
- [ ] Border radius boxes show rounded corners
- [ ] Values persist

**Preview Image:**
- [ ] Button opens MediaPickerModal
- [ ] Can select image from library
- [ ] Thumbnail appears after selection
- [ ] Clear button removes preview
- [ ] URL stored in database

---

## Database Changes Required

**None** - Using existing columns:
- `themes.is_active` - Already exists (for deletion protection)
- `themes.preview_image` - Already exists (for media picker)
- `theme_parts.settings_css` - Already exists (for reset rollback)
- `theme_parts.puck_data_raw` - Already exists (for reset rollback)

All features work with current schema ✅

---

## Components Used (No New Dependencies)

- **shadcn Dialog** - Switch/reset warning dialogs
- **shadcn Button** - All buttons
- **ColorPickerControlColorful** - Color picker modal (existing)
- **MediaPickerModal** - Preview image picker (existing)
- **Native HTML Input** - Spacing/border radius inputs
- **CSS inline styles** - Visual bars and previews

---

## Git Workflow

**Branch:** `feature/phase6-1-theme-manager-refinements`

**Commits (suggested):**
1. `feat: add deletion protection for active themes`
2. `feat: add theme switch warning dialog with 5sec timer`
3. `feat: add theme reset confirmation dialog`
4. `feat: redesign colors section with modal picker`
5. `feat: add typography live preview`
6. `feat: add spacing and border radius visual bars`
7. `feat: add preview image picker from media library`
8. `test: add tests for phase 6.1 features`
9. `docs: update PHASE6_1_THEME_MANAGER_REFINEMENTS.md`

**Final:** Create PR to `main` and test before merging

---

## Notes

**Phase 7 Overlap:**
- Font system will enhance Typography section further
- Multi-font support (sans, serif, mono)
- Google Fonts + FontBunny integration
- Font preview will expand on current live preview

**Keep Settings Tab Clean:**
- Visual sections (no accordion) - simpler
- Integrated visual bars - shows impact immediately
- Modal pickers for complex controls (colors)
- Live previews for realtime feedback

