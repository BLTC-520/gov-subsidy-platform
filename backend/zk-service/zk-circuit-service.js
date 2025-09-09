// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Verify environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Environment variables not loaded properly.');
    console.error('Current SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
    console.error('Current SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
    console.error('Make sure .env file exists in:', process.cwd());
    process.exit(1);
}

console.log('Environment variables loaded successfully');

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { supabase } from './lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// Swagger API documentation - Frontend Endpoints Only
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ZK Service API - Frontend Endpoints',
      version: '1.0.0',
      description: 'API endpoints used by the frontend for ZK verification',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./zk-circuit-service.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(cors());
app.use(express.json());

// Swagger UI for frontend developers
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ZK Service API - Frontend Endpoints'
}));

// Path to ZK project directory
const ZK_PROJECT_PATH = path.join(__dirname, '../../zkp');
const CIRCUITS_PATH = path.join(ZK_PROJECT_PATH, 'circuits');
const OUTPUTS_PATH = path.join(ZK_PROJECT_PATH, 'outputs');
const PROOFS_PATH = path.join(ZK_PROJECT_PATH, 'proofs');
const INPUTS_PATH = path.join(ZK_PROJECT_PATH, 'inputs');

// Execute ZK circuit with income verification (NOT USED BY FRONTEND - no swagger)
app.post('/api/execute-circuit', async (req, res) => {
    try {
        const { circuitInputs } = req.body;
        
        console.log('Received circuit execution request:', {
            monthly_income: circuitInputs.monthly_income,
            signature_preview: circuitInputs.signature?.substring(0, 20) + '...',
            public_key_preview: circuitInputs.public_key?.substring(0, 20) + '...'
        });

        // check if the path is exist, if not, 'mkdir' -> make dir
        await fs.mkdir(OUTPUTS_PATH, { recursive: true });
        await fs.mkdir(PROOFS_PATH, { recursive: true });
        await fs.mkdir(INPUTS_PATH, { recursive: true });

        // Write input.json file to inputs directory
        const inputPath = path.join(INPUTS_PATH, 'input.json');
        await fs.writeFile(inputPath, JSON.stringify(circuitInputs, null, 2));

        // Step 1: Compile circuit if needed
        const compilationResult = await compileCircuit();
        if (!compilationResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Circuit compilation failed',
                details: compilationResult.error
            });
        }

        // Step 2: Calculate witness
        const witnessResult = await calculateWitness();
        if (!witnessResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Witness calculation failed',
                details: witnessResult.error
            });
        }

        // Step 3: Generate ZK Proof (THE CORE ZK FUNCTIONALITY)
        const proofResult = await generateZKProof();
        if (!proofResult.success) {
            return res.status(500).json({
                success: false,
                error: 'ZK proof generation failed',
                details: proofResult.error
            });
        }

        // Step 4: Verify Proof
        const verificationResult = await verifyZKProof();
        if (!verificationResult.success) {
            return res.status(500).json({
                success: false,
                error: 'ZK proof verification failed',
                details: verificationResult.error
            });
        }

        // Step 5: Extract outputs from witness
        const outputs = await extractOutputsFromWitness();
        
        res.json({
            success: true,
            outputs: outputs,
            proof: proofResult.proof,
            verification_result: verificationResult.verified,
            compilation_log: compilationResult.log,
            witness_log: witnessResult.log,
            proof_log: proofResult.log,
            verification_log: verificationResult.log,
            message: 'Complete ZK-SNARK pipeline executed successfully'
        });

    } catch (error) {
        console.error('Circuit execution error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/ic-verification:
 *   post:
 *     summary: Generate ZK proof for IC verification (verification only, no database storage)
 *     description: Used by frontend - Generates ZK proof for IC verification and returns income bracket data without saving to database
 *     tags: [Frontend Endpoints]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ic]
 *             properties:
 *               ic:
 *                 type: string
 *                 description: Malaysian IC number
 *                 example: "030520-01-2185"
 *     responses:
 *       200:
 *         description: IC verification completed with ZK proof
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 citizen_name:
 *                   type: string
 *                   example: "HAR SZE HAO"
 *                 income_bracket:
 *                   type: string
 *                   example: "M2"
 *                 verification_status:
 *                   type: string
 *                   example: "verified"
 *                 zk_verified:
 *                   type: boolean
 *                   example: true
 *                 zk_flags:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   example: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0]
 *                   description: "One-hot encoded income classification flags"
 *                 is_signature_valid:
 *                   type: boolean
 *                   example: true
 *                   description: "Whether LHDN signature verification passed"
 *                 is_data_authentic:
 *                   type: boolean
 *                   example: true
 *                   description: "Whether all data authenticity checks passed"
 *                 zk_proof:
 *                   type: object
 *                   properties:
 *                     pi_a:
 *                       type: array
 *                       items:
 *                         type: string
 *                     pi_b:
 *                       type: array
 *                       items:
 *                         type: array
 *                     pi_c:
 *                       type: array
 *                       items:
 *                         type: string
 *                     public_signals:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: "Elements 0-9: Income flags, Element 10: is_signature_valid, Element 11: is_data_authentic"
 *                 message:
 *                   type: string
 *                   example: "Income bracket M2 verified with zero-knowledge proof"
 *                 privacy_note:
 *                   type: string
 *                   example: "Actual income amount (RM7000) remains private"
 *                 note:
 *                   type: string
 *                   example: "ZK proof generated successfully. Data NOT saved to database yet."
 *       400:
 *         description: Invalid IC number or verification failed
 *       500:
 *         description: ZK proof generation failed
 */
app.post('/api/ic-verification', async (req, res) => {
    try {
        const { ic } = req.body;
        
        if (!ic) {
            return res.status(400).json({
                success: false,
                error: 'IC number is required'
            });
        }

        console.log('Starting IC verification for:', ic);

        // Step 1: Fetch income data from LHDN API
        console.log('Fetching income data from LHDN...');
        const lhdnResponse = await fetch('http://localhost:3001/api/verify-income', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ic })
        });

        if (!lhdnResponse.ok) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch income data from LHDN',
                details: await lhdnResponse.text()
            });
        }

        const lhdnData = await lhdnResponse.json();
        
        // Step 2: Convert to circuit inputs
        console.log('Converting data to circuit format...');
        
        // Calculate actual timestamp age for anti-replay protection
        const now = Date.now(); // current system time in ms
        const verificationTime = new Date(lhdnData.verification_timestamp).getTime(); // ms
        const ageInSeconds = Math.floor((now - verificationTime) / 1000); // age in seconds
        
        console.log(`LHDN verification timestamp: ${lhdnData.verification_timestamp}`);
        console.log(`Current time: ${new Date(now).toISOString()}`);
        console.log(`Data age: ${ageInSeconds} seconds (${Math.floor(ageInSeconds/60)} minutes)`);
        
        const circuitInputs = {
            monthly_income: lhdnData.monthly_income.toString(),
            signature: BigInt('0x' + lhdnData.signature.slice(0, 16)).toString(),
            verification_timestamp: ageInSeconds.toString(), // ← actual age in seconds
            public_key: BigInt('0x' + lhdnData.public_key.slice(0, 16)).toString(),
            ic_hash: Array.from(ic.replace(/-/g, '')).reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(),
            timestamp_range: (24 * 60 * 60).toString() // ← 24h = 86400 seconds
        };
        
        // Validate timestamp before proceeding
        if (ageInSeconds > (24 * 60 * 60)) {
            return res.status(400).json({
                success: false,
                error: 'Verification data is too old',
                details: `Data is ${Math.floor(ageInSeconds/3600)} hours old. Maximum allowed: 24 hours.`
            });
        }
        
        console.log('Timestamp validation passed - data is fresh');

        // Ensure all directories exist
        await fs.mkdir(OUTPUTS_PATH, { recursive: true });
        await fs.mkdir(PROOFS_PATH, { recursive: true });
        await fs.mkdir(INPUTS_PATH, { recursive: true });

        // Write input file
        const inputPath = path.join(INPUTS_PATH, 'input.json');
        await fs.writeFile(inputPath, JSON.stringify(circuitInputs, null, 2));

        // Step 3: Compile circuit if needed
        const compilationResult = await compileCircuit();
        if (!compilationResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Circuit compilation failed',
                details: compilationResult.error
            });
        }

        // Step 4: Generate witness
        const witnessResult = await calculateWitness();
        if (!witnessResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Witness generation failed',
                details: witnessResult.error
            });
        }

        // Step 5: Generate ZK proof
        const proofResult = await generateZKProof();
        if (!proofResult.success) {
            return res.status(500).json({
                success: false,
                error: 'ZK proof generation failed',
                details: proofResult.error
            });
        }

        // Step 6: Verify proof
        const verificationResult = await verifyZKProof();
        if (!verificationResult.success || !verificationResult.verified) {
            return res.status(500).json({
                success: false,
                error: 'ZK proof verification failed',
                details: verificationResult.error
            });
        }

        // Step 7: Extract income classification (but don't store to database)
        const outputs = await extractOutputsFromWitness();

        // Return verification results WITHOUT database storage
        res.json({
            success: true,
            citizen_name: lhdnData.citizen_name,
            income_bracket: outputs.income_classification,
            verification_status: 'verified',
            zk_proof: proofResult.proof,
            zk_verified: verificationResult.verified,
            zk_flags: outputs.class_flags,
            is_signature_valid: outputs.is_signature_valid === 1,
            is_data_authentic: outputs.is_data_authentic === 1,
            message: `Income bracket ${outputs.income_classification} verified with zero-knowledge proof`,
            privacy_note: 'Actual income amount (RM' + lhdnData.monthly_income + ') remains private',
            note: 'ZK proof generated successfully. Data NOT saved to database yet.'
        });

    } catch (error) {
        console.error('IC verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during IC verification',
            details: error.message
        });
    }
});

/**
 * Compile the Circom circuit
 */
async function compileCircuit() {
    return new Promise((resolve) => {
        console.log('Compiling circuit...');
        
        const circuitFile = path.join(CIRCUITS_PATH, 'MalaysianIncomeClassifier.circom');
        const outputDir = OUTPUTS_PATH;
        
        // exact way to compile a circuit
        // --r1cs (Rank 1 Constraint System) 
        // https://rareskills.io/post/rank-1-constraint-system
        // --wasm: web assembly format 
        // --sym: file that store symbol information
        // -o: which [path] to output

        // circom MalaysianIncomeClassifier.circom --r1cs --wasm --sym -o outputs/ -l node_modules
        const circom = spawn('circom', [
            circuitFile,
            '--r1cs',
            '--wasm', 
            '--sym',
            '-o', outputDir,
            '-l', 'node_modules'
        ], {
            cwd: ZK_PROJECT_PATH
        });

        let stdout = '';
        let stderr = '';

        // handling output
        circom.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(`stdout: ${data}`);
        });

        circom.stderr.on('data', (data) => {
            stderr += data.toString();
            console.log(`stderr: ${data}`);
        });

        circom.on('error', (err) => {
          reject({success: false, error: err.message});
        });

        circom.on('close', async (code) => {
            console.log(`Circuit compilation finished with code: ${code}`);
            console.log('Stdout:', stdout);
            if (stderr) console.log('Stderr:', stderr);
            
            if (code === 0) {
                console.log('Circuit compiled successfully - files available in MalaysianIncomeClassifier_js/ subdirectory');
                console.log('Starting trusted setup (generating proving keys)...');
                
                // Generate proving key (trusted setup)
                await performTrustedSetup();
            }
            
            resolve({
                success: code === 0,
                log: stdout,
                error: stderr || null
            });
        });
    });
}

/**
 * Perform trusted setup - generate proving and verification keys
 */
async function performTrustedSetup() {
    console.log('Performing trusted setup...');
    
    const r1csPath = path.join(OUTPUTS_PATH, 'MalaysianIncomeClassifier.r1cs');
    const ptauPath = path.join(OUTPUTS_PATH, 'pot12.ptau');
    const zkeyPath = path.join(OUTPUTS_PATH, 'circuit.zkey');
    const vkeyPath = path.join(OUTPUTS_PATH, 'verification_key.json');
    
    // Check if proving key already exists
    try {
        await fs.access(zkeyPath);
        console.log('Proving key already exists, skipping setup');
        return;
    } catch {
        // File doesn't exist, proceed with setup
    }
    
    // Download Powers of Tau if not exists
    try {
        await fs.access(ptauPath);
        console.log('Powers of Tau file exists');
    } catch {
        console.log('Downloading Powers of Tau file...');
        // For now, use a smaller ceremony (2^12 = 4096 constraints)
        const response = await fetch('https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau');
        if (!response.ok) {
            throw new Error('Failed to download Powers of Tau');
        }
        const buffer = await response.arrayBuffer();
        await fs.writeFile(ptauPath, Buffer.from(buffer));
        console.log('Powers of Tau downloaded successfully');
    }
    
    // Generate proving key
    return new Promise((resolve) => {
        console.log('Generating proving key...');
        
        const snarkjs = spawn('snarkjs', [
            'groth16',
            'setup',
            r1csPath,
            ptauPath,
            zkeyPath
        ], {
            cwd: ZK_PROJECT_PATH
        });

        let stdout = '';
        let stderr = '';

        snarkjs.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(`Setup stdout: ${data}`);
        });

        snarkjs.stderr.on('data', (data) => {
            stderr += data.toString();
            console.log(`Setup stderr: ${data}`);
        });

        snarkjs.on('close', async (code) => {
            console.log(`Trusted setup finished with code: ${code}`);
            
            if (code === 0) {
                // Export verification key
                const vkeyProcess = spawn('snarkjs', [
                    'zkey',
                    'export',
                    'verificationkey',
                    zkeyPath,
                    vkeyPath
                ], {
                    cwd: ZK_PROJECT_PATH
                });
                
                vkeyProcess.on('close', (vkeyCode) => {
                    if (vkeyCode === 0) {
                        console.log('✅ Trusted setup completed successfully');
                    } else {
                        console.log('❌ Verification key export failed');
                    }
                    resolve();
                });
            } else {
                console.log('❌ Trusted setup failed');
                resolve();
            }
        });
    });
}

/**
 * Calculate witness using snarkjs
 */
async function calculateWitness() {
    return new Promise((resolve) => {
        console.log('Calculating witness...');
        
        /* (After compileCircuit() function...)
          /Users/brianhar/Documents/gov-subsidy-platform/zkp/outputs/
          ├── MalaysianIncomeClassifier.r1cs
          ├── MalaysianIncomeClassifier.sym
          └── MalaysianIncomeClassifier_js/
              ├── MalaysianIncomeClassifier.wasm
              ├── generate_witness.js
              └── witness_calculator.js
        */
        const generateWitnessPath = path.join(OUTPUTS_PATH, 'MalaysianIncomeClassifier_js', 'generate_witness.js');
        const wasmPath = path.join(OUTPUTS_PATH, 'MalaysianIncomeClassifier_js', 'MalaysianIncomeClassifier.wasm');
        const inputPath = path.join(INPUTS_PATH, 'input.json');
        const witnessPath = path.join(OUTPUTS_PATH, 'witness.wtns');
        
        // node outputs/generate_witness.js outputs/MalaysianIncomeClassifier.wasm outputs/input.json outputs/witness.wtns
        const node = spawn('node', [
            generateWitnessPath,
            wasmPath,
            inputPath,
            witnessPath
        ], {
            cwd: ZK_PROJECT_PATH
        });

        let stdout = '';
        let stderr = '';

        node.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        node.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        node.on('error', (err) => {
            resolve({success: false, error: err.message});
        });

        node.on('close', (code) => {
            console.log(`Witness calculation finished with code: ${code}`);
            console.log('Stdout:', stdout);
            if (stderr) console.log('Stderr:', stderr);
            
            resolve({
                success: code === 0,
                log: stdout,
                error: stderr || null
            });
        });
    });
}

/**
 * Generate ZK Proof using Groth16 (THE CORE ZK FUNCTIONALITY)
 */
async function generateZKProof() {
    return new Promise((resolve) => {
        console.log('Generating ZK proof...');
        
        const circuitZkeyPath = path.join(OUTPUTS_PATH, 'circuit.zkey');
        const witnessPath = path.join(OUTPUTS_PATH, 'witness.wtns');
        const proofPath = path.join(PROOFS_PATH, 'proof.json');
        const publicPath = path.join(PROOFS_PATH, 'public.json');
        
        // snarkjs groth16 prove circuit.zkey witness.wtns proof.json public.json
        const snarkjs = spawn('snarkjs', [
            'groth16',
            'prove',
            circuitZkeyPath,
            witnessPath,
            proofPath,
            publicPath
        ], {
            cwd: ZK_PROJECT_PATH
        });

        let stdout = '';
        let stderr = '';

        snarkjs.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        snarkjs.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        snarkjs.on('close', async (code) => {
            console.log(`ZK proof generation finished with code: ${code}`);
            console.log('Stdout:', stdout);
            if (stderr) console.log('Stderr:', stderr);
            
            if (code === 0) {
                try {
                    // Read the generated proof
                    const proofData = JSON.parse(await fs.readFile(proofPath, 'utf8'));
                    const publicSignals = JSON.parse(await fs.readFile(publicPath, 'utf8'));
                    
                    resolve({
                        success: true,
                        log: stdout,
                        proof: {
                            pi_a: proofData.pi_a,
                            pi_b: proofData.pi_b,
                            pi_c: proofData.pi_c,
                            public_signals: publicSignals
                        }
                    });
                } catch (readError) {
                    resolve({
                        success: false,
                        error: 'Failed to read generated proof: ' + readError.message,
                        log: stdout
                    });
                }
            } else {
                resolve({
                    success: false,
                    error: stderr || 'Unknown error during proof generation',
                    log: stdout
                });
            }
        });
    });
}

/**
 * Verify ZK Proof using Groth16
 */
async function verifyZKProof() {
    return new Promise((resolve) => {
        console.log('Verifying ZK proof...');
        
        const verificationKeyPath = path.join(OUTPUTS_PATH, 'verification_key.json');
        const publicPath = path.join(PROOFS_PATH, 'public.json');
        const proofPath = path.join(PROOFS_PATH, 'proof.json');
        
        // snarkjs groth16 verify verification_key.json public.json proof.json
        const snarkjs = spawn('snarkjs', [
            'groth16',
            'verify',
            verificationKeyPath,
            publicPath,
            proofPath
        ], {
            cwd: ZK_PROJECT_PATH
        });

        let stdout = '';
        let stderr = '';

        snarkjs.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        snarkjs.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        snarkjs.on('close', (code) => {
            console.log(`ZK proof verification finished with code: ${code}`);
            console.log('Stdout:', stdout);
            if (stderr) console.log('Stderr:', stderr);
            
            const verified = code === 0 && stdout.includes('OK');
            
            resolve({
                success: true, // Function executed successfully
                verified: verified, // Whether the proof is valid
                log: stdout,
                error: stderr || null
            });
        });
    });
}

/**
 * Extract circuit outputs from witness file
 */
async function extractOutputsFromWitness() {
    try {
        const witnessPath = path.join(OUTPUTS_PATH, 'witness.wtns');
        
        // Use snarkjs to export witness as JSON
        const exportResult = await new Promise((resolve) => {
            const snarkjs = spawn('snarkjs', [
                'wtns',
                'export',
                'json',
                witnessPath,
                path.join(OUTPUTS_PATH, 'witness.json')
            ], {
                cwd: OUTPUTS_PATH
            });

            let stdout = '';
            let stderr = '';

            snarkjs.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            snarkjs.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            snarkjs.on('close', (code) => {
                resolve({
                    success: code === 0,
                    log: stdout,
                    error: stderr
                });
            });
        });

        if (!exportResult.success) {
            throw new Error('Failed to export witness: ' + exportResult.error);
        }

        // Read witness JSON file
        const witnessJsonPath = path.join(OUTPUTS_PATH, 'witness.json');
        const witnessData = JSON.parse(await fs.readFile(witnessJsonPath, 'utf8'));
        
        // Parse witness outputs based on our circuit structure
        // witness[0] is always 1 (constant)
        // Our outputs start after inputs
        const outputs = {
            class_flags: witnessData.slice(1, 11).map(x => parseInt(x)), // class_flags[10]
            is_signature_valid: parseInt(witnessData[11]), // is_signature_valid 
            is_data_authentic: parseInt(witnessData[12])   // is_data_authentic
        };

        // Determine income classification
        const classNames = ['B1', 'B2', 'B3', 'B4', 'M1', 'M2', 'M3', 'M4', 'T1', 'T2'];
        const activeClassIndex = outputs.class_flags.findIndex(flag => flag === 1);
        const incomeClass = activeClassIndex !== -1 ? classNames[activeClassIndex] : 'None (Invalid signature)';

        return {
            ...outputs,
            income_classification: incomeClass,
            raw_witness: witnessData
        };

    } catch (error) {
        console.error('Error extracting outputs:', error);
        throw error;
    }
}

/**
 * @swagger
 * /api/lookup-citizen:
 *   post:
 *     summary: Simple citizen name lookup by IC number
 *     description: Used by frontend - Fetch citizen name from LHDN database. No ZK verification, just name lookup for UI display
 *     tags: [Frontend Endpoints]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ic]
 *             properties:
 *               ic:
 *                 type: string
 *                 description: Malaysian IC number
 *                 example: "030520-01-2185"
 *     responses:
 *       200:
 *         description: Citizen found and name retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 citizen_name:
 *                   type: string
 *                   example: "HAR SZE HAO"
 *                 ic:
 *                   type: string
 *                   example: "030520-01-2185"
 *       404:
 *         description: Citizen not found in LHDN database
 *       500:
 *         description: LHDN API error
 */
app.post('/api/lookup-citizen', async (req, res) => {
    try {
        const { ic } = req.body;
        
        if (!ic) {
            return res.status(400).json({
                success: false,
                error: 'IC number is required'
            });
        }

        console.log('Looking up citizen name for IC:', ic);

        // Simple call to LHDN API to get citizen data
        const lhdnResponse = await fetch('http://localhost:3001/api/verify-income', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ic })
        });

        if (!lhdnResponse.ok) {
            return res.status(404).json({
                success: false,
                error: 'Citizen not found'
            });
        }

        const lhdnData = await lhdnResponse.json();
        
        // Return just the basic citizen info
        res.json({
            success: true,
            citizen_name: lhdnData.citizen_name,
            ic: ic
        });

    } catch (error) {
        console.error('Citizen lookup error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during lookup'
        });
    }
});

/**
 * @swagger
 * /api/profile/update-with-zk:
 *   post:
 *     summary: Update complete user profile including ZK verification data
 *     description: |
 *       Comprehensive profile update that includes both regular profile fields
 *       and ZK verification results. This ensures atomic database operations
 *       where all user data is saved together.
 *     tags: [Frontend Endpoints]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, profileData, zkData]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID for profile update
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               profileData:
 *                 type: object
 *                 description: Regular profile fields
 *                 properties:
 *                   wallet_address:
 *                     type: string
 *                     example: "0x742D35Cc6634C0532925a3b8D4a2E6A4A2E6A4"
 *                   full_name:
 *                     type: string
 *                     example: "HAR SZE HAO"
 *                   date_of_birth:
 *                     type: string
 *                     example: "1990-05-20"
 *                   gender:
 *                     type: string
 *                     example: "Male"
 *                   state:
 *                     type: string
 *                     example: "Selangor"
 *                   household_size:
 *                     type: integer
 *                     example: 4
 *                   number_of_children:
 *                     type: integer
 *                     example: 2
 *                   disability_status:
 *                     type: boolean
 *                     example: false
 *               zkData:
 *                 type: object
 *                 description: ZK verification results
 *                 properties:
 *                   zkFlags:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0]
 *                   incomeBracket:
 *                     type: string
 *                     example: "M2"
 *                   isSignatureValid:
 *                     type: boolean
 *                     example: true
 *                   isDataAuthentic:
 *                     type: boolean
 *                     example: true
 *     responses:
 *       200:
 *         description: Profile updated successfully with ZK verification data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully with ZK verification"
 *       400:
 *         description: Invalid input parameters or validation failed
 *       500:
 *         description: Database update failed
 */
app.post('/api/profile/update-with-zk', async (req, res) => {
    try {
        const { userId, profileData, zkData } = req.body;

        console.log('Updating complete profile with ZK data for user:', userId);

        // Validate required parameters
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        if (!profileData || typeof profileData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'profileData is required and must be an object'
            });
        }

        // Validate ZK data if provided
        if (zkData) {
            const { zkFlags, incomeBracket, isSignatureValid, isDataAuthentic } = zkData;
            
            if (!Array.isArray(zkFlags) || zkFlags.length !== 10) {
                return res.status(400).json({
                    success: false,
                    error: 'zkFlags must be an array of 10 elements'
                });
            }

            if (typeof isSignatureValid !== 'boolean' || typeof isDataAuthentic !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'isSignatureValid and isDataAuthentic must be boolean values'
                });
            }

            if (!isSignatureValid || !isDataAuthentic) {
                return res.status(400).json({
                    success: false,
                    error: 'ZK verification failed - signature or data is invalid'
                });
            }
        }

        // Prepare update object with profile data
        const updateData = {
            ...profileData
        };

        // Add ZK data if provided
        if (zkData) {
            updateData.income_bracket = zkData.incomeBracket;
            updateData.zk_class_flags = zkData.zkFlags;
            updateData.is_signature_valid = zkData.isSignatureValid;
            updateData.is_data_authentic = zkData.isDataAuthentic;
            console.log(`Including ZK verification: income bracket ${zkData.incomeBracket}`);
        }

        // Update Supabase profiles table with all data in single transaction
        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select();

        if (error) {
            console.error('Supabase update error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update user profile',
                details: error.message
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const message = zkData ? 
            'Profile updated successfully with ZK verification' : 
            'Profile updated successfully';

        console.log('✅ Profile update completed for user:', userId);

        res.json({
            success: true,
            message: message,
            updatedProfile: data[0]
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during profile update',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the ZK Circuit Service is running and responsive
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy and operational
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "OK"
 *               service: "ZK Circuit Service"
 *               timestamp: "2024-03-15T10:30:00.000Z"
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'ZK Circuit Service',
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 * /api/check-tools:
 *   get:
 *     summary: Check ZK tools availability
 *     description: |
 *       Verify that required ZK tools (circom and snarkjs) are installed and accessible.
 *       This endpoint is useful for troubleshooting setup issues.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Tool availability status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ToolsStatus'
 *             example:
 *               circom_available: true
 *               snarkjs_available: true
 *               all_tools_ready: true
 */
app.get('/api/check-tools', async (req, res) => {
    const checkTool = (command) => {
        return new Promise((resolve) => {
            const proc = spawn(command, ['--version'], { stdio: 'ignore' });
            proc.on('close', (code) => {
                resolve(code === 0);
            });
            proc.on('error', () => {
                resolve(false);
            });
        });
    };

    const circomAvailable = await checkTool('circom');
    const snarkjsAvailable = await checkTool('snarkjs');

    res.json({
        circom_available: circomAvailable,
        snarkjs_available: snarkjsAvailable,
        all_tools_ready: circomAvailable && snarkjsAvailable
    });
});

app.listen(PORT, () => {
    console.log(`ZK Circuit Service running on http://localhost:${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`ZK Project Path: ${ZK_PROJECT_PATH}`);
    console.log(`Outputs Path: ${OUTPUTS_PATH}`);
});