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
npm run build      # Production build
npm run lint       # ESLint checking
npm run preview    # Preview production build
```

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
- **Layouts**: `AdminLayout.tsx` and `CitizenLayout.tsx` for consistent UI
- **State Management**: Custom hooks in `hooks/` directory
- **Supabase Integration**: Auth, database, and storage via `lib/supabase.ts`

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
- User roles stored in Supabase `auth.users.user_metadata.role`
- Supported roles: `admin` and `citizen`

### Supabase Integration
- Database client: `src/lib/supabase.ts`
- Row Level Security (RLS) enabled on all tables
- Admin users have elevated permissions for file uploads

### Custom Hooks Pattern
- `useProfile()` - Manages citizen profile data
- `useFileUpload()` - Handles document upload for admins
- `useDeadlineStatus()` - Manages application deadlines
- `useICVerification()` - Handles IC verification with ZK proofs

### ZK Proof Generation Flow
1. User enters IC number in frontend
2. Mock LHDN API returns signed income data
3. ZK Circuit Service generates Groth16 proof
4. Frontend verifies proof and displays income bracket (not amount)

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

### Adding New Components
- Follow the existing pattern in `components/` with TypeScript interfaces
- Use custom hooks for state management (see `hooks/` directory)
- Implement proper loading and error states

### Database Changes
- All tables use Supabase Row Level Security (RLS)
- Admin users have elevated permissions via `user_metadata.role`
- Test permissions with different user roles

### ZK Circuit Development
- Edit circuits in `zkp/circuits/`
- Run `./zkp/setup.sh` to recompile and test
- Use `./zkp/clean.sh` to reset generated files

### Debugging Tips
- Frontend errors: Check browser console and Vite dev server output
- Backend errors: Check service logs in terminal where `start-all-services.sh` is running  
- ZK errors: Verify Circom and snarkjs installations, check `zkp/outputs/` directory