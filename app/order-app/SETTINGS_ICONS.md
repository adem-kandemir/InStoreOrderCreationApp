# Alternative Settings Icons

Here are several alternative icons you can use for the settings button. Simply replace the SVG in the `app.component.html` file.

## Current Icon (Crosshair/Target Style)
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
  <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" stroke-width="2"/>
</svg>
```

## Option 1: Classic Gear/Cog Icon
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" stroke-width="2"/>
</svg>
```

## Option 2: Simple Gear (Filled)
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM8.5 12a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"/>
  <path d="M12.5 2.5a.5.5 0 0 0-1 0v1.25a.5.5 0 0 0 .39.49 8 8 0 0 1 1.92.8.5.5 0 0 0 .62-.16l.89-1.08a.5.5 0 0 1 .76-.01l.71.71a.5.5 0 0 1-.01.76l-1.08.89a.5.5 0 0 0-.16.62 8 8 0 0 1 .8 1.92.5.5 0 0 0 .49.39h1.25a.5.5 0 0 1 0 1h-1.25a.5.5 0 0 0-.49.39 8 8 0 0 1-.8 1.92.5.5 0 0 0 .16.62l1.08.89a.5.5 0 0 1 .01.76l-.71.71a.5.5 0 0 1-.76-.01l-.89-1.08a.5.5 0 0 0-.62-.16 8 8 0 0 1-1.92.8.5.5 0 0 0-.39.49v1.25a.5.5 0 0 1-1 0v-1.25a.5.5 0 0 0-.39-.49 8 8 0 0 1-1.92-.8.5.5 0 0 0-.62.16l-.89 1.08a.5.5 0 0 1-.76.01l-.71-.71a.5.5 0 0 1 .01-.76l1.08-.89a.5.5 0 0 0 .16-.62 8 8 0 0 1-.8-1.92.5.5 0 0 0-.49-.39H2.5a.5.5 0 0 1 0-1h1.25a.5.5 0 0 0 .49-.39 8 8 0 0 1 .8-1.92.5.5 0 0 0-.16-.62L3.8 5.98a.5.5 0 0 1-.01-.76l.71-.71a.5.5 0 0 1 .76.01l.89 1.08a.5.5 0 0 0 .62.16 8 8 0 0 1 1.92-.8.5.5 0 0 0 .39-.49V2.5Z"/>
</svg>
```

## Option 3: Three Dots (Vertical)
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="5" r="1" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="19" r="1" stroke="currentColor" stroke-width="2"/>
</svg>
```

## Option 4: Three Dots (Horizontal)
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
  <circle cx="5" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
  <circle cx="19" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
</svg>
```

## Option 5: Sliders/Controls Icon
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 21v-7" stroke="currentColor" stroke-width="2"/>
  <path d="M4 10V3" stroke="currentColor" stroke-width="2"/>
  <path d="M12 21v-9" stroke="currentColor" stroke-width="2"/>
  <path d="M12 8V3" stroke="currentColor" stroke-width="2"/>
  <path d="M20 21v-5" stroke="currentColor" stroke-width="2"/>
  <path d="M20 12V3" stroke="currentColor" stroke-width="2"/>
  <path d="M1 14h6" stroke="currentColor" stroke-width="2"/>
  <path d="M9 8h6" stroke="currentColor" stroke-width="2"/>
  <path d="M17 16h6" stroke="currentColor" stroke-width="2"/>
</svg>
```

## Option 6: Wrench/Tool Icon
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2"/>
</svg>
```

## Option 7: Menu/Hamburger Icon
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 12h18" stroke="currentColor" stroke-width="2"/>
  <path d="M3 6h18" stroke="currentColor" stroke-width="2"/>
  <path d="M3 18h18" stroke="currentColor" stroke-width="2"/>
</svg>
```

## Option 8: User Settings (Person + Gear)
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" stroke="currentColor" stroke-width="2"/>
  <circle cx="19" cy="8" r="1" stroke="currentColor" stroke-width="1"/>
  <path d="M19 5v6M16 8h6" stroke="currentColor" stroke-width="1"/>
</svg>
```

## Option 9: Toggle/Switch Icon
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="5" width="22" height="14" rx="7" ry="7" stroke="currentColor" stroke-width="2"/>
  <circle cx="16" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
</svg>
```

## Option 10: Preferences/List Icon
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 6h18" stroke="currentColor" stroke-width="2"/>
  <path d="M7 12h10" stroke="currentColor" stroke-width="2"/>
  <path d="M10 18h4" stroke="currentColor" stroke-width="2"/>
</svg>
```

## How to Use
1. Choose your preferred icon from the options above
2. Copy the SVG code
3. Replace the current SVG in `app.component.html` in the settings button section
4. The icon will automatically inherit the current color and hover effects

## Recommendations
- **Option 1 (Classic Gear)**: Most universally recognized as "settings"
- **Option 5 (Sliders)**: Modern and intuitive for configuration/preferences
- **Option 3/4 (Three Dots)**: Minimalist and clean, commonly used in modern apps
- **Option 8 (User Settings)**: Good for user-specific settings 