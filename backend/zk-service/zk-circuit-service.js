import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// Swagger API documentation configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ZK Circuit Service API',
      version: '1.0.0',
      description: 'Zero-Knowledge Circuit Compilation and Execution Service for Income Verification',
      contact: {
        name: 'ZK Circuit Service',
        email: 'dev@gov-subsidy-platform.com'
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        CircuitInputs: {
          type: 'object',
          required: ['monthly_income', 'signature', 'verification_timestamp', 'public_key', 'ic_hash', 'timestamp_range'],
          properties: {
            monthly_income: {
              type: 'string',
              description: 'Monthly income amount in RM as string',
              example: '1800'
            },
            signature: {
              type: 'string', 
              description: 'HMAC signature from LHDN API as BigInt string',
              example: '1234567890123456'
            },
            verification_timestamp: {
              type: 'string',
              description: 'Unix timestamp when LHDN verified the data',
              example: '1640995200'
            },
            public_key: {
              type: 'string',
              description: 'LHDN public key as BigInt string',  
              example: '9876543210987654'
            },
            ic_hash: {
              type: 'string',
              description: 'Hash of IC number for privacy',
              example: '1122334455'
            },
            timestamp_range: {
              type: 'string', 
              description: 'Maximum allowed timestamp age in milliseconds',
              example: '86400000'
            }
          }
        },
        CircuitOutputs: {
          type: 'object',
          properties: {
            class_flags: {
              type: 'array',
              items: {
                type: 'integer',
                minimum: 0,
                maximum: 1
              },
              description: 'One-hot encoded income classification [B1,B2,B3,B4,M1,M2,M3,M4,T1,T2]',
              example: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            },
            is_signature_valid: {
              type: 'integer',
              minimum: 0,
              maximum: 1,
              description: 'Whether LHDN signature is authentic (1=valid, 0=invalid)',
              example: 1
            },
            is_data_authentic: {
              type: 'integer',
              minimum: 0,
              maximum: 1, 
              description: 'Whether all verification checks pass (1=authentic, 0=invalid)',
              example: 1
            },
            income_classification: {
              type: 'string',
              description: 'Human-readable income bracket classification',
              example: 'B1'
            },
            raw_witness: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Raw witness values from circuit execution'
            }
          }
        },
        ExecutionRequest: {
          type: 'object',
          required: ['circuitInputs'],
          properties: {
            circuitInputs: {
              $ref: '#/components/schemas/CircuitInputs'
            }
          }
        },
        ExecutionResponse: {
          type: 'object', 
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether circuit execution succeeded'
            },
            outputs: {
              $ref: '#/components/schemas/CircuitOutputs'
            },
            compilation_log: {
              type: 'string',
              description: 'Log output from circuit compilation'
            },
            witness_log: {
              type: 'string', 
              description: 'Log output from witness calculation'
            },
            message: {
              type: 'string',
              description: 'Human-readable status message'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Human-readable error message'
            },
            details: {
              type: 'string',
              description: 'Technical error details'
            }
          }
        },
        ToolsStatus: {
          type: 'object',
          properties: {
            circom_available: {
              type: 'boolean',
              description: 'Whether circom compiler is available'
            },
            snarkjs_available: {
              type: 'boolean',
              description: 'Whether snarkjs toolkit is available'  
            },
            all_tools_ready: {
              type: 'boolean',
              description: 'Whether all required tools are available'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK'
            },
            service: {
              type: 'string',
              example: 'ZK Circuit Service'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    }
  },
  apis: ['./zk-circuit-service.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(cors());
app.use(express.json());

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ZK Circuit Service API Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Path to ZK project directory
const ZK_PROJECT_PATH = path.join(__dirname, '../../zkp');
const CIRCUITS_PATH = path.join(ZK_PROJECT_PATH, 'circuits');
const OUTPUTS_PATH = path.join(ZK_PROJECT_PATH, 'outputs');
const PROOFS_PATH = path.join(ZK_PROJECT_PATH, 'proofs');
const INPUTS_PATH = path.join(ZK_PROJECT_PATH, 'inputs');

/**
 * @swagger
 * /api/execute-circuit:
 *   post:
 *     summary: Execute ZK circuit with income verification
 *     description: |
 *       Compiles and executes the MalaysianIncomeClassifier Circom circuit with provided inputs.
 *       Performs signature verification and income classification in zero-knowledge.
 *     tags: [Circuit Execution]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExecutionRequest'
 *           example:
 *             circuitInputs:
 *               monthly_income: "1800"
 *               signature: "1234567890123456"
 *               verification_timestamp: "1640995200"
 *               public_key: "9876543210987654"
 *               ic_hash: "1122334455"
 *               timestamp_range: "86400000"
 *     responses:
 *       200:
 *         description: Circuit executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExecutionResponse'
 *             example:
 *               success: true
 *               outputs:
 *                 class_flags: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
 *                 is_signature_valid: 1
 *                 is_data_authentic: 1
 *                 income_classification: "B1"
 *               compilation_log: "Circuit compiled successfully"
 *               witness_log: "Witness calculated successfully"
 *               message: "ZK circuit executed successfully"
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Invalid circuit inputs"
 *               details: "monthly_income must be a valid number string"
 *       500:
 *         description: Circuit execution or compilation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Circuit compilation failed"
 *               details: "circom: command not found"
 */
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
 *     summary: Complete IC verification with ZK proof generation
 *     description: |
 *       Performs complete IC verification flow:
 *       1. Fetch income data from LHDN API
 *       2. Generate ZK proof of income classification
 *       3. Return verified income bracket with cryptographic proof
 *     tags: [IC Verification]
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
 *                   example: "B1"
 *                 verification_status:
 *                   type: string
 *                   example: "verified"
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
 *                 message:
 *                   type: string
 *                   example: "Income bracket verified with zero-knowledge proof"
 *       400:
 *         description: Invalid IC number
 *       500:
 *         description: Verification or proof generation failed
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

        // Step 7: Extract income classification
        const outputs = await extractOutputsFromWitness();

        // Success response
        res.json({
            success: true,
            citizen_name: lhdnData.citizen_name,
            income_bracket: outputs.income_classification,
            verification_status: 'verified',
            zk_proof: proofResult.proof,
            zk_verified: verificationResult.verified,
            message: `Income bracket ${outputs.income_classification} verified with zero-knowledge proof`,
            privacy_note: 'Actual income amount (RM' + lhdnData.monthly_income + ') remains private'
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
 *     description: Fetch citizen name from LHDN database using IC number. No ZK verification - just name lookup.
 *     tags: [IC Lookup]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Citizen not found"
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