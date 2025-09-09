# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is an AI-powered blockchain-based subsidy distribution platform using React, Supabase, and Zero-Knowledge proofs. Citizens can apply for subsidies with income verification through ZK-SNARKs, while admins manage applications and deadlines.

## Development Commands

### Quick Start All Services
```bash
./start-all-services.sh  # Starts frontend (5173), mock-lhdn-api (3001), zk-service (3002)
```

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm run dev        # Development server on localhost:5173
npm run build      # TypeScript compilation + production build
npm run lint       # ESLint checking with TypeScript rules
npm run preview    # Preview production build
```

**Note:** The build process includes TypeScript compilation (`tsc -b`) followed by Vite bundling. Always run lint before committing changes.

### Backend Services
```bash
# Mock LHDN API (port 3001)
cd backend/mock-lhdn-api
npm run dev        # Development with nodemon
npm start          # Production
npm test           # API testing

# ZK Circuit Service (port 3002)
cd backend/zk-service
npm run dev        # Development with --watch
npm start          # Production
```

### Zero-Knowledge Circuits
```bash
cd zkp
./setup.sh         # Complete ZK-SNARK setup pipeline
./clean.sh         # Clean generated files
npm run compile    # Compile Circom circuits only
npm run test       # Test signature verification
```

## Architecture Overview

### Frontend Structure
- **React 19** with TypeScript and Vite
- **Route Guards**: Role-based access (admin/citizen) via `components/auth/RouteGuard.tsx`
- **Layouts**: `AdminLayout.tsx` and `CitizenLayout.tsx` for consistent UI shells
- **State Management**: Custom hooks pattern for all business logic
- **Supabase Integration**: Auth, database, and storage via `lib/supabase.ts`
- **Styling**: Tailwind CSS v4 with custom utility classes
- **Type Safety**: Comprehensive TypeScript interfaces throughout

### Key Frontend Components
- `pages/Admin.tsx` - Admin dashboard with statistics
- `pages/CitizenProfilePage.tsx` - Citizen application form
- `pages/ZKDemoPage.tsx` - Zero-knowledge proof demonstration
- `components/zk/` - ZK-specific UI components
- `hooks/useICVerification.ts` - IC verification logic

### Backend Architecture
- **Mock LHDN API**: Simulates Malaysian tax authority API for income verification
- **ZK Circuit Service**: Handles Circom circuit compilation and proof generation
- **Supabase**: PostgreSQL database with Row Level Security (RLS)

### ZK-SNARK Implementation
- **Circuit**: `zkp/circuits/MalaysianIncomeClassifier.circom` - Income bracket classification
- **Groth16 Protocol**: Complete trusted setup with Powers of Tau ceremony
- **Privacy Preservation**: Income amounts remain private, only brackets are public

## Environment Setup

### Required Environment Variables
```bash
# Frontend (.env in frontend/)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Prerequisites
- **Node.js** 20+ (for all services)
- **Circom** 2.1.5+ (for ZK circuits)
- **snarkjs** (global install: `npm install -g snarkjs`)

## Key Development Patterns

### Authentication Flow
- All routes use `RouteGuard` component for role-based access
- User roles determined by `profiles.is_admin` field in Supabase
- Automatic redirects: admins → `/admin`, citizens → `/citizen`, unauthenticated → `/login`
- Loading states during role verification

### Custom Hooks Architecture
All business logic uses custom hooks with consistent structure: `{ data, loading, error, actions, computed_values }`

- **`useProfile()`** - Full CRUD operations for citizen profiles with validation
- **`useFileUpload()`** - Admin-only file upload with duplicate detection and sanitization  
- **`useDeadlineStatus()`** - Real-time deadline monitoring with auto-refresh
- **`useICVerification()`** - ZK-SNARK proof generation and verification
- **`useAppSettings()`** - Global app configuration management

### Layout System
- **Role-based layouts**: `AdminLayout` (blue theme) and `CitizenLayout` (green theme)
- Dropdown navigation with active page detection using `useLocation()`
- Click-outside closing behavior with `useRef` and `useEffect`
- Consistent logout flow and error handling

### Supabase Integration
- Database client: `src/lib/supabase.ts` with environment variable validation
- Row Level Security (RLS) enabled on all tables
- Admin permissions via `profiles.is_admin` boolean field
- Real-time subscriptions for status updates

### ZK Components Architecture
**Status-Driven UI Components:**
- **`IncomeVerificationField`** - Main ZK verification trigger with state management
- **`ZKVerificationBadge`** - Status indicators: `'unverified' | 'loading' | 'verified' | 'error'`
- **`ZKProcessFlow`** - Educational step-by-step explanation
- **`ZKProofExplainer`** - Interactive cryptographic proof breakdown

**ZK Proof Generation Flow:**
1. User enters IC number → `IncomeVerificationField` component
2. Mock LHDN API returns signed income data
3. ZK Circuit Service generates Groth16 proof  
4. Frontend displays income bracket (privacy-preserving, amount hidden)

## API Endpoints

### Mock LHDN API (port 3001)
- `POST /verify-income` - Income verification by IC number
- `GET /health` - Service health check

### ZK Circuit Service (port 3002)
- `POST /api/generate-proof` - Generate ZK proof from income data
- `POST /api/verify-proof` - Verify submitted proof
- `GET /api-docs` - Swagger documentation

## File Structure Notes

### Important Configuration Files
- `frontend/vite.config.ts` - Vite dev server configuration
- `frontend/eslint.config.js` - ESLint rules for TypeScript/React
- `zkp/circuits/MalaysianIncomeClassifier.circom` - Main ZK circuit
- `start-all-services.sh` - Multi-service startup script

## Testing the Application

To test the complete system with all services:

```bash
./start-all-services.sh
```

This will start:
- Frontend UI on http://localhost:5173
- Mock LHDN API on http://localhost:3001  
- ZK Circuit Service on http://localhost:3002
- ZK Swagger docs at http://localhost:3002/api-docs

Press Ctrl+C to stop all services.

## Common Development Tasks

### Frontend Component Development
- **Follow consistent patterns**: All components use TypeScript interfaces and proper prop typing
- **Custom hooks first**: Extract all business logic into custom hooks before building UI
- **Loading states**: Implement `loading` states for all async operations with spinners/skeletons
- **Error boundaries**: Handle errors gracefully with user-friendly messages
- **Layout inheritance**: Use `AdminLayout` or `CitizenLayout` for all authenticated pages

### Form Development Patterns
- **Validation in hooks**: Put form validation logic in custom hooks, not components
- **Real-time validation**: Validate on change for better UX (see `useProfile` validation)
- **Ethereum address validation**: Use existing `validateEthereumAddress` utility
- **File uploads**: Follow `useFileUpload` pattern for admin-only file operations

### TypeScript Development
- **Strict typing**: Use interface definitions for all props, state, and API responses
- **No `any` types**: Prefer proper typing over `any` for type safety
- **ESLint compliance**: Run `npm run lint` to check TypeScript/React rules before committing

### Debugging Tips
- **Frontend errors**: Check browser console and Vite dev server output
- **TypeScript errors**: Run `npm run build` to catch compilation issues early
- **Environment variables**: Check console logs in `lib/supabase.ts` for missing env vars
- **Route guard issues**: Check `profiles.is_admin` field in Supabase for role problems
- **Hook debugging**: Add console.logs to custom hooks to trace state changes
- **Supabase issues**: Check browser Network tab for failed API requests