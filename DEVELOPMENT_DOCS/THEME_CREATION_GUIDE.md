# Theme Creation Guide

## Navigation in Theme Templates

When building theme templates (which are shared across all tenants), you cannot rely on specific navigation IDs because navigation menus are tenant-specific data.

To solve this, the Navigation component supports **Placeholder Items**.

### Using Placeholder Items

1. In the Puck Editor, select the **Navigation Menu** component.
2. Leave the "Select Navigation" field empty.
3. Use the **Placeholder Menu Items (Theme Templates)** field to define a mock structure.
4. Add items with Labels and URLs (e.g., "Home", "/", "About", "/about").
5. You can nest items to create dropdowns.

### How it Works

*   **In Theme Builder:** The component renders your placeholder items, allowing you to style the menu (colors, spacing, mobile behavior) without real data.
*   **On Live Sites:**
    *   If the tenant installs the theme and selects a real navigation menu, the real data takes precedence.
    *   If no navigation is selected, the placeholder items are shown as a fallback (useful for "plug-and-play" themes).

### Best Practices

*   **Generic Links:** Use generic labels like "Home", "About", "Services", "Contact".
*   **Hash Links:** For URLs, you can use `#` or standard paths like `/about`.
*   **Structure:** Replicate the typical structure you expect the user to have (e.g., if your theme supports a mega-menu, add nested items to demonstrate it).
*   **Styling:** Focus on configuring the visual props (Colors, Padding, Mobile Style) so they look good with the placeholder structure.
