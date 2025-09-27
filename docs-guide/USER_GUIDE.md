# User Guide: Government Subsidy Platform

*Multi-Agent RAG System for Privacy-Preserving Subsidy Distribution*

This guide explains how to set up and use the Government Subsidy Platform, which combines Zero-Knowledge Proofs, AI-powered analysis, and blockchain technology for auditable token distribution.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Starting the Platform](#starting-the-platform)
5. [Using the Platform](#using-the-platform)
6. [API Endpoints](#api-endpoints)
7. [Troubleshooting](#troubleshooting)

---

## System Overview

The platform consists of *four main services*:

1. *Frontend (React + TypeScript)* - Port 5173
   - User interface for citizens and admins
   - Real-time ZK proof visualization
   - Wallet integration for token claims

2. *Mock LHDN API* - Port 3001
   - Simulates Malaysian tax authority income verification
   - Provides signed income data for ZK proofs

3. *ZK Circuit Service* - Port 3002
   - Generates and verifies Zero-Knowledge proofs
   - Groth16 protocol implementation
   - Swagger documentation at /api-docs

4. *Smolagents Service (FastAPI)* - Port 3003
   - Multi-agent AI analysis system
   - Dual-analysis: RAG (flexible) + Formula (transparent)
   - Policy reasoning and eligibility scoring

---

## Prerequisites

### Required Software

- *Node.js: **v20 LTS or v22 LTS* (⚠ *AVOID v23+* - has ESM loader bugs)
  - Check version: node -v
  - Install with nvm: nvm install 22 && nvm use 22
- *Python*: v3.10 or higher
- *npm*: v9 or higher
- *Circom*: v2.1.5+ (for ZK circuits)
- *snarkjs*: Install globally with npm install -g snarkjs

*⚠ Known Issues:*
- *Node.js v23.x*: ESM module loader bug causes ETIMEDOUT errors in ZK service
- *Solution*: Use Node v22 LTS or v20 LTS instead

### Required Accounts

1. *Supabase Account*
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Note down: Project URL and Service Role Key

2. *OpenAI API Key*
   - Sign up at [platform.openai.com](https://platform.openai.com)
   - Generate API key from dashboard

3. *Tavily API Key* (for web search)
   - Sign up at [tavily.com](https://tavily.com)
   - Generate API key

4. *MongoDB Atlas* (for RAG document storage)
   - Sign up at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
   - Create cluster and get connection URI

5. *Unstructured API Key* (for document processing)
   - Sign up at [unstructured.io](https://unstructured.io)
   - Generate API key

---

## Environment Setup

### Step 1: Clone the Repository

bash
git clone https://github.com/BLTC-520/gov-subsidy-platform.git
cd gov-subsidy-platform/gov-subsidy-platform


### Step 2: Frontend Environment (.env)

Create frontend/.env:

bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key


*How to get these values:*
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy "Project URL" and "anon/public" key

### Step 3: Smolagents Service Environment (.env)

Create backend/smolagents-service/.env:

bash
# AI Service Keys
OPENAI_API_KEY=sk-proj-your_openai_api_key
TAVILY_API_KEY=tvly-dev-your_tavily_key
UNSTRUCTURED_API_KEY=your_unstructured_key

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_service_role_key
SUPABASE_BUCKET=documents

# MongoDB Settings
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=RAG_database
MONGO_COLLECTION=doc_chunks

# Agent Configuration
AGENT_MODEL_NAME=gpt-4o-mini
AGENT_TEMPERATURE=0.2
AGENT_MAX_TOKENS=8000
AGENT_TIMEOUT=30


*Configuration Details:*

- *OPENAI_API_KEY*: Required for AI agent reasoning
- *TAVILY_API_KEY*: Enables external policy search
- *MONGO_URI*: Replace username:password with your MongoDB credentials
- *SUPABASE_ANON_KEY: Use **service_role* key for backend (not anon key)
- *AGENT_MODEL_NAME*: Can use gpt-4o-mini, gpt-4, or gpt-3.5-turbo

### Step 4: ZK Service Environment (Auto-Generated)

The ZK service .env is automatically created by start-all-services.sh using Supabase credentials from the root .env file.

### Step 5: Root Environment (Optional)

Create gov-subsidy-platform/.env for the startup script:

bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key


---

## Starting the Platform

### Option 1: Start All Services (Recommended)

bash
cd gov-subsidy-platform
./start-all-services.sh


*This script will:*
1. Check port availability (5173, 3001, 3002, 3003)
2. Install missing dependencies
3. Create virtual environment for Python service
4. Start all services in parallel
5. Run health checks
6. Display service URLs

*Output Example:*


✅ All services started successfully!

Service URLs:
  • Frontend:         http://localhost:5173
  • Mock LHDN API:    http://localhost:3001
  • ZK Service:       http://localhost:3002
  • ZK Swagger Docs:  http://localhost:3002/api-docs
  • Smolagents API:   http://localhost:3003

Press Ctrl+C to stop all services


### Option 2: Start Services Individually

*Frontend:*
bash
cd frontend
npm install
npm run dev


*Mock LHDN API:*
bash
cd backend/mock-lhdn-api
npm install
npm run dev


*ZK Circuit Service:*
bash
cd backend/zk-service
npm install
npm run dev


*Smolagents Service:*
bash
cd backend/smolagents-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 3003


### Stop All Services

Press Ctrl+C in the terminal running start-all-services.sh

Or manually:
bash
./stop-all-services.sh


---

## Using the Platform

### Demo Profiles Reference

*Quick Test IC Numbers* (Use these for demos):

| IC Number    | Formatted IC   | Name                         | Income   | Category |
| ------------ | -------------- | ---------------------------- | -------- | -------- |
| 950101011234 | 950101-01-1234 | NURUL AISYAH BINTI AHMAD     | RM1,500  | B40      |
| 880215025678 | 880215-02-5678 | LIM WEI JIAN                 | RM2,800  | B40      |
| 920308031122 | 920308-03-1122 | KUMAR A/L RAJAN              | RM3,200  | B40      |
| 850420043344 | 850420-04-3344 | TAN MEI LING                 | RM4,500  | B40      |
| 910512055566 | 910512-05-5566 | FARAH BINTI IBRAHIM          | RM5,000  | M40-M1   |
| 870625067788 | 870625-06-7788 | WONG KAR WAI                 | RM5,800  | M40-M1   |
| 930710079900 | 930710-07-9900 | SITI NURHALIZA BINTI TARUDIN | RM6,500  | M40-M1   |
| 960905095567 | 960905-09-5567 | CHUA YEN LING                | RM7,500  | M40-M2   |
| 890118107889 | 890118-10-7889 | MUHAMMAD HAFIZ BIN ZAINUDIN  | RM8,900  | M40-M2   |
| 920203129012 | 920203-12-9012 | LEE CHONG WEI                | RM9,800  | M40-M2   |
| 940425155678 | 940425-15-5678 | DATO' TAN BOON HUAT          | RM12,000 | T20      | 0x57923848CE0c3DBE800268637Cbcc34E356B2Eb6 |
| 810507167890 | 810507-16-7890 | DR. AMINAH BINTI KASSIM      | RM15,000 | T20      |
| 970618179123 | 970618-17-9123 | VINCENT CHIN YONG SENG       | RM18,500 | T20      |

*Edge Case Test Profiles* (Exact boundaries):

| IC Number    | Formatted IC   | Name                    | Income   | Test Case              |
| ------------ | -------------- | ----------------------- | -------- | ---------------------- |
| 000101010001 | 000101-01-0001 | BOUNDARY TEST B40-M40   | RM4,850  | B40/M40 boundary       |
| 000202020002 | 000202-02-0002 | BOUNDARY TEST M40-M1-M2 | RM7,100  | M40-M1/M40-M2 boundary |
| 000303030003 | 000303-03-0003 | BOUNDARY TEST M40-T20   | RM10,970 | M40/T20 boundary       |

*Income Categories:*
- *B40*: Below RM4,850 (Bottom 40%)
- *M40-M1*: RM4,851 - RM7,100 (Middle 40% - Tier 1)
- *M40-M2*: RM7,101 - RM10,970 (Middle 40% - Tier 2)
- *T20*: Above RM10,970 (Top 20%)

*View All Test Profiles:*
bash
curl http://localhost:3001/api/test-ics


---

### 1. User Registration & Login

1. Navigate to http://localhost:5173
2. Click "Sign Up" to create an account
3. Verify email (if required by Supabase)
4. Log in with credentials

### 2. Citizen Workflow

*Step 1: Complete Profile*
1. Navigate to "Citizen Profile" page
2. Fill in required information:
   - Full Name
   - Date of Birth
   - Gender
   - State
   - Household Size & Children
   - Wallet Address (for token claims)

*Step 2: IC Verification (Zero-Knowledge Proof)*
1. Enter your IC number (e.g., 123456789012)
2. Click "Verify Income"
3. System flow:
   - Mock LHDN API retrieves income data
   - ZK Circuit Service generates proof
   - Income bracket displayed (amount remains private)
4. View ZK verification badge (✅ Verified)

*Step 3: View Analysis*
1. Navigate to "Citizen Analysis" page
2. View dual-analysis results:
   - *RAG Analysis Tab*: AI-powered policy reasoning
   - *Formula Score Tab*: Mathematical eligibility calculation
   - *Comparison Tab*: Agreement/disagreement analysis

*Step 4: Token Claim (if eligible)*
1. Navigate to "Claim Subsidy" page
2. Connect wallet (MetaMask)
3. View allocation amount
4. Click "Claim Tokens"
5. Confirm blockchain transaction

### 3. Admin Workflow

*Step 1: Access Admin Dashboard*
1. Log in as admin user (profiles.is_admin = true in Supabase)
2. View citizen statistics and applications

*Step 2: Manage Citizens*
1. Navigate to "Citizen List" page
2. View all submitted applications
3. Click "Analyze" to run dual-analysis
4. Review RAG + Formula comparison results

*Step 3: Token Distribution*
1. Navigate to "Token Minting" page
2. Connect admin wallet
3. Upload allocation CSV (allocation.csv)
4. Mint tokens to eligible citizens

*Step 4: File Management*
1. Navigate to "File Upload" page
2. Upload policy documents for RAG analysis
3. View uploaded documents in "Document List"

### 4. Testing Dual-Analysis System

*Direct API Test:*

bash
curl -X POST http://localhost:3003/analyze-citizen \
  -H "Content-Type: application/json" \
  -d '{
    "citizen_id": "123456789012",
    "citizen_data": {
      "full_name": "Test User",
      "monthly_income": 5000,
      "household_size": 4,
      "state": "Selangor",
      "disability_status": false
    },
    "query": "Analyze eligibility for subsidy"
  }'


*RAG Debug Test:*

bash
cd backend/smolagents-service
source venv/bin/activate
python test_rag_debug.py


*Frontend RAG Test:*
1. Navigate to "Citizen List" page
2. Click "Run RAG Debug Test" button
3. Download generated results file

---

## API Endpoints

### Smolagents Service (Port 3003)

| Endpoint                           | Method | Description                      |
| ---------------------------------- | ------ | -------------------------------- |
| /health                            | GET    | Health check                     |
| /test-config                       | GET    | Verify environment configuration |
| /analyze-citizen                   | POST   | Dual-analysis (RAG + Formula)    |
| /api/formula-analysis/{citizen_id} | POST   | Formula-only analysis            |
| /api/agentic-analysis/{citizen_id} | POST   | RAG-only analysis                |
| /api/rag-debug-test                | POST   | Run RAG debug test               |

### ZK Circuit Service (Port 3002)

| Endpoint                    | Method | Description                 |
| --------------------------- | ------ | --------------------------- |
| /api/generate-proof         | POST   | Generate ZK proof           |
| /api/verify-proof           | POST   | Verify ZK proof             |
| /api/profile/update-with-zk | POST   | Update profile with ZK data |
| /api-docs                   | GET    | Swagger documentation       |

### Mock LHDN API (Port 3001)

| Endpoint       | Method | Description                 |
| -------------- | ------ | --------------------------- |
| /verify-income | POST   | Verify IC and return income |
| /health        | GET    | Health check                |

---

## Troubleshooting

### Common Issues

*1. Port Already in Use*

bash
# Check which process is using port 3003
lsof -i :3003

# Kill the process
kill -9 <PID>


*2. Missing Environment Variables*

Error: DualAnalysisCoordinator not available

*Solution:* Check backend/smolagents-service/.env file exists with all required keys:
bash
cat backend/smolagents-service/.env


*3. MongoDB Connection Failed*

Error: Failed to connect to MongoDB

*Solution:* 
- Verify MongoDB URI is correct
- Check network access in MongoDB Atlas (allow your IP)
- Test connection: mongosh "your_mongo_uri"

*4. Supabase Authentication Failed*

Error: Invalid API key

*Solution:*
- Verify Supabase URL and keys are correct
- Frontend uses anon key
- Backend uses service_role key
- Check keys in Supabase dashboard: Settings → API

*5. OpenAI API Rate Limit*

Error: Rate limit exceeded

*Solution:*
- Check OpenAI usage at platform.openai.com
- Upgrade plan or wait for rate limit reset
- Use gpt-3.5-turbo for lower cost

*6. Python Virtual Environment Issues*

Error: ModuleNotFoundError: No module named 'smolagents'

*Solution:*
bash
cd backend/smolagents-service
source venv/bin/activate
pip install -r requirements.txt


*7. Frontend Build Errors*

Error: TypeScript compilation errors

*Solution:*
bash
cd frontend
npm run lint
npm run build


*8. ZK Circuit Setup Failed*

Error: Circuit file not found

*Solution:*
bash
cd zkp
./setup.sh   # Run complete ZK-SNARK setup


*9. Node.js v23 ETIMEDOUT Error*

Error: ETIMEDOUT: connection timed out, read when starting ZK service

*Root Cause:* Node.js v23+ has an ESM loader bug that causes file read timeouts

*Solution:*
bash
# Check current Node version
node -v

# If v23+, downgrade to Node v22 LTS using nvm
nvm install 22
nvm use 22
nvm alias default 22

# Verify new version
node -v  # Should show v22.x

# Reinstall dependencies with correct Node version
cd backend/zk-service && npm install
cd ../mock-lhdn-api && npm install
cd ../../frontend && npm install

# Restart services
./start-all-services.sh


*Alternative (without nvm):*
- Download Node v22 LTS from [nodejs.org](https://nodejs.org)
- Uninstall Node v23
- Install Node v22
- Reinstall all node_modules

### Debug Commands

*Check Service Status:*
bash
curl http://localhost:3003/health
curl http://localhost:3002/health
curl http://localhost:3001/health


*Test Configuration:*
bash
curl http://localhost:3003/test-config


*View Active Sessions:*
bash
curl http://localhost:3003/sessions


*Test RAG Analysis:*
bash
cd backend/smolagents-service
source venv/bin/activate
python test_rag_debug.py


### Logs Location

- *Frontend*: Browser console (F12)
- *Mock LHDN API*: Terminal output
- *ZK Service*: Terminal output
- *Smolagents Service*: Terminal output (uvicorn logs)

### Getting Help

1. Check error messages in terminal output
2. Review service health checks: curl http://localhost:PORT/health
3. Verify environment variables are set correctly
4. Check CLAUDE.md files for service-specific instructions
5. Review spec/tasks.md for implementation details

---

## Architecture Summary


┌─────────────┐
│   Frontend  │  (React + TypeScript + Vite)
│  Port 5173  │  
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┬──────────────────┐
       │                  │                  │                  │
   ┌───▼───┐         ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ LHDN  │         │   ZK    │       │Smolagents│       │ Supabase│
   │  API  │         │ Circuit │       │ Service │       │   DB    │
   │ 3001  │         │  3002   │       │  3003   │       │         │
   └───────┘         └─────────┘       └─────────┘       └─────────┘
                                             │
                                    ┌────────┴────────┐
                                    │                 │
                              ┌─────▼─────┐    ┌─────▼─────┐
                              │  MongoDB  │    │  OpenAI   │
                              │    RAG    │    │    API    │
                              └───────────┘    └───────────┘


*Key Features:*
- *Privacy*: ZK proofs reveal income bracket, not exact amount
- *Auditability*: Dual-analysis shows interpretability vs flexibility trade-offs
- *Scalability*: Modular architecture with independent services
- *Security*: Row-Level Security (RLS) in Supabase, encrypted proofs

---

## Next Steps

1. *Test the Platform*: Follow the user workflows above
2. *Customize Policies*: Upload your own policy documents for RAG analysis
3. *Deploy to Production*: Use Supabase hosting + Vercel/Netlify for frontend
4. *Blockchain Integration*: Deploy token contracts to mainnet/testnet
5. *Advanced Analysis*: Explore dual-analysis results and governance insights

---

*Version*: 1.0.0  
*Last Updated*: 2025-01-23  
*License*: MIT