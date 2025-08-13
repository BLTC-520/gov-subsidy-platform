# CLAUDE_DEV.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Linting & Type Checking
```bash
# Run ESLint
npm run lint

# TypeScript compilation check
npx tsc --noEmit

# Check all TypeScript projects
npx tsc -b
```

## Architecture Overview

### Frontend Stack
- **React 19** with TypeScript and Vite
- **TailwindCSS** for styling (using @tailwindcss/vite plugin)
- **React Router** for routing with role-based access control
- **Supabase** client for authentication, database, and storage

### Key Directory Structure
```
frontend/src/
├── components/
│   ├── admin/           # Admin-only components
│   ├── auth/            # Authentication components (RouteGuard)
│   └── common/          # Shared layouts and components
├── hooks/               # Custom React hooks
├── pages/               # Route components
├── lib/                 # Utility functions (supabase.ts, storage.ts)
└── assets/              # Static assets
```

### Database Schema (Supabase)
- **profiles**: User profiles with `is_admin` boolean for role-based access
- **app_settings**: Application-wide settings (deadlines, etc.)
- **documents**: File storage metadata (linked to Supabase Storage)

### Role-Based Access Control
- **Admin Role**: File upload, settings management, citizen data review
- **Citizen Role**: Profile management, eligibility checking, wallet connection
- **RouteGuard**: Component that enforces role-based routing

## Key Hooks and Utilities

### useProfile Hook (`src/hooks/useProfile.ts`)
- Manages user profile data with `Profile` and `ProfileFormData` interfaces
- Handles Ethereum wallet address validation with regex
- Provides profile completion status checking
- Contains Malaysian state validation

### useAppSettings Hook (`src/hooks/useAppSettings.ts`)
- Manages application-wide settings via `app_settings` table
- Handles deadline management and countdown timers
- Provides `isDeadlinePassed()` and `getTimeRemaining()` utilities

### useFileUpload Hook (`src/hooks/useFileUpload.ts`)
- Handles file uploads to Supabase Storage "documents" bucket
- Validates file types (PDF, DOCX only)
- Manages upload progress and error states
- Admin-only functionality with RLS policy enforcement

### Authentication Flow
- Supabase Auth with email/password
- Role detection via `profiles.is_admin` field (boolean or string 'true')
- Route guards prevent unauthorized access
- Automatic redirection: admin → `/admin`, citizen → `/citizen`

## Component Architecture

### Layout Components
- **AdminLayout**: Wrapper for admin pages with consistent styling
- **CitizenLayout**: Wrapper for citizen pages with consistent styling
- **RouteGuard**: Authentication and role-based route protection

### Page Components
- **Login/Signup**: Authentication pages
- **Admin**: Admin dashboard with statistics
- **CitizenProfilePage**: Citizen profile management
- **ProfilePage**: Separate profile viewing page
- **CitizenClaimPage**: Wallet connection and claiming interface
- **FileUploadPage**: Admin file upload interface

### Admin Components
- **FileUpload**: Drag-and-drop file upload component
- **DocumentList**: Real-time document list with metadata
- **ApplicationSettings**: Deadline management interface

## State Management Pattern

### Custom Hooks Pattern
- No external state management library (Redux, Zustand)
- React hooks for local state management
- Supabase real-time subscriptions for data synchronization
- Custom hooks encapsulate business logic and API calls

### Data Validation
- **Ethereum Address**: `/^0x[a-fA-F0-9]{40}$/` regex validation
- **Form Validation**: Age limits (18-120), positive numbers, required fields
- **File Validation**: PDF/DOCX type checking, size limits
- **TypeScript**: Compile-time type safety throughout

## Environment Configuration

### Required Environment Variables
```bash
# Frontend (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Configuration Files
- **vite.config.ts**: Uses `@vitejs/plugin-react` and `@tailwindcss/vite`
- **tsconfig.json**: Project references to `tsconfig.app.json` and `tsconfig.node.json`
- **eslint.config.js**: TypeScript ESLint with React hooks rules

## Security Implementation

### Supabase Security
- **RLS Policies**: Row-level security for all tables
- **Storage Policies**: Admin-only upload to "documents" bucket
- **Auth Guards**: Both client-side and server-side role checking
- **Input Validation**: Client-side validation with server-side enforcement

### Malaysian Government Context
- **State Validation**: Complete list of Malaysian states and territories
- **Demographic Data**: Income, household size, disability status fields
- **Age Verification**: 18+ years requirement for applications
- **Wallet Integration**: Ethereum address format for blockchain claims

## Common Development Patterns

### Adding New Pages
1. Create component in `src/pages/`
2. Add route in `App.tsx` with appropriate `RouteGuard`
3. Update navigation in layout components
4. Follow existing TypeScript interfaces

### Database Operations
1. Use custom hooks for data operations
2. Follow RLS policy patterns for security
3. Handle loading states and errors consistently
4. Use TypeScript interfaces for data structures

### File Upload Features
1. Use `useFileUpload` hook for functionality
2. Configure Supabase Storage bucket permissions
3. Add file type validation as needed
4. Handle upload progress and error states

### Role-Based Features
1. Check user role with `useProfile().isAdmin()`
2. Use `RouteGuard` for page-level protection
3. Implement conditional rendering for UI elements
4. Test both admin and citizen user flows

## Debugging and Development

### Development Debugging
- **Console Logging**: Comprehensive error logging throughout hooks
- **TypeScript Errors**: Compile-time error detection
- **Supabase Debugging**: URL and key validation in `supabase.ts`
- **Network Monitoring**: Check Supabase API requests in DevTools

### Code Style
- **Functional Components**: All components use hooks pattern
- **TypeScript**: Strict type checking with interfaces
- **TailwindCSS**: Utility-first CSS classes
- **Error Handling**: Consistent error state management in hooks

## Current Implementation Status

### Completed Features
- Complete authentication system with role-based access
- Admin dashboard with file upload and document management
- Citizen profile management with Malaysian state validation
- Deadline management with countdown timers
- Professional UI with loading states and error handling

### Planned Features
- AI/RAG system for eligibility scoring (FastAPI backend)
- Smart contract integration (Solidity + HUFF)
- Email notification system
- Advanced analytics and monitoring