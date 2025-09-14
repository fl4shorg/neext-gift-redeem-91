# Akuma no Mi - One Piece Devil Fruit Redemption App

## Project Overview
This is a One Piece themed application that allows users to redeem "Akuma no Mi" (Devil Fruit) codes to receive account credentials. The app features a pirate-themed UI with orange glowing effects and is built with React, TypeScript, and Vite.

## Current State
- ✅ Successfully set up in Replit environment
- ✅ Dependencies installed and running
- ✅ Vite configuration fixed for Replit (port 5000, host 0.0.0.0)
- ✅ CSS import order fixed
- ✅ Workflow configured and running
- ✅ Deployment configuration set up

## Project Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** as build tool and dev server
- **Tailwind CSS** for styling with custom Akuma no Mi theme
- **shadcn/ui** components for UI elements
- **React Router DOM** for routing (using HashRouter)
- **TanStack React Query** for state management
- **React Hook Form** with Zod validation
- **Lucide React** for icons

### Key Features
1. **Image Code Extraction** - Uses Tesseract.js for OCR to extract codes from images
2. **Code Redemption** - Connects to Google Apps Script backend for code validation
3. **Encryption** - Uses crypto-js for secure data handling
4. **Responsive Design** - Mobile-friendly with One Piece theme
5. **Toast Notifications** - User feedback system

### Project Structure
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── GiftCardRedemption.tsx  # Main app component
│   ├── ImageCodeExtractor.tsx  # OCR functionality
│   ├── RedemptionResult.tsx   # Result display
│   └── ...
├── hooks/               # Custom hooks
├── lib/                 # Utilities and crypto functions
├── pages/               # Route components
├── App.tsx              # App entry point
├── main.tsx             # React mount
└── index.css            # Global styles and theme
```

## Configuration
- **Port**: 5000 (required for Replit webview)
- **Host**: 0.0.0.0 (required for Replit proxy)
- **Build**: npm run build
- **Dev**: npm run dev
- **Preview**: npm run preview

## Recent Changes
- Fixed Vite configuration for Replit environment
- Corrected CSS import order (@import before @tailwind)
- Set up proper workflow and deployment configuration
- Installed all dependencies successfully

## Development Notes
- The app uses HashRouter for compatibility
- External API calls to Google Apps Script for code redemption
- Crypto functions for secure data handling
- Custom Akuma no Mi theme with orange glowing effects
- OCR capability for extracting codes from images

## Deployment
Configured for autoscale deployment with:
- Build command: npm run build
- Start command: npm run preview