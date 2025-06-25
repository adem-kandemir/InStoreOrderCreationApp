# Product Images

Place your product images in this folder with the following naming convention:

## Naming Convention
- Use the product ID as the filename
- Supported formats: `.jpg`, `.png`
- Examples:
  - `123.jpg` (for product ID: 123)
  - `124.png` (for product ID: 124)
  - `125.jpg` (for product ID: 125)

## Current Products in Mock Data
Based on the mock data in `product.service.ts`, you can add:

- `123.jpg` or `123.png` - RBO NRG Cup2Go
- `124.jpg` or `124.png` - RBO NRG Cup2Go Premium  
- `125.jpg` or `125.png` - RBO NRG Cup2Go Deluxe

## Image Requirements
- Recommended size: 200x200px or larger
- Aspect ratio: 1:1 (square) preferred
- Formats: JPG, PNG
- Max file size: 500KB recommended for web performance

## Usage
The application will automatically look for images using the pattern:
`assets/images/products/{productId}.jpg` or `assets/images/products/{productId}.png`

If no image is found, a placeholder will be displayed. 