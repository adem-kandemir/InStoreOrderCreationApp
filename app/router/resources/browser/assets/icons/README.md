# Icons and Logos

Place your application icons and logos in this folder.

## Required Icons

### App Logo
- `logo.svg` or `logo.png` - Main application logo (used in header)
- Recommended size: 24x24px or 32x32px
- Should be the sun-like icon shown in the mockups

### Favicon
- `favicon.ico` - Browser tab icon
- Size: 16x16px, 32x32px, 48x48px (multi-size ICO file)
- Alternative: `favicon.png` (32x32px)

### User Avatar
- `user-avatar.jpg` or `user-avatar.png` - Default user avatar
- Size: 40x40px
- Currently using placeholder initials "JD"

## Current Usage
- Logo: Used in `app.component.html` header
- Favicon: Referenced in `src/index.html`
- User avatar: Used in header user section

## File Structure
```
src/assets/icons/
├── logo.svg          # App logo
├── favicon.ico       # Browser favicon
└── user-avatar.png   # Default user avatar
``` 