import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app = express();
const PORT = 3001;

// Swagger API documentation configuration
// This creates interactive API docs at /api-docs endpoint
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mock LHDN API',
      version: '1.0.0',
      description: 'Mock API for Malaysian Inland Revenue Board (LHDN) income verification system',
      contact: {
        name: 'Mock Agency LHDN',
        email: 'szehaohar@1utar.my'
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
        // Schema for income verification request payload
        IncomeVerificationRequest: {
          type: 'object',
          required: ['ic'],
          properties: {
            ic: {
              type: 'string',
              description: 'Malaysian IC number (MyKad)',
              example: '920202-10-6789',
              pattern: '^\\d{6}-\\d{2}-\\d{4}$'
            }
          }
        },
        // Schema for successful income verification response
        IncomeVerificationResponse: {
          type: 'object',
          properties: {
            ic: {
              type: 'string',
              description: 'Malaysian IC number',
              example: '920202-10-6789'
            },
            monthly_income: {
              type: 'number',
              description: 'Monthly income in RM (Malaysian Ringgit)',
              example: 2350
            },
            citizen_name: {
              type: 'string',
              description: 'Citizen full name',
              example: 'Siti binti Rahman'
            },
            verification_timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when verification was performed',
              example: '2024-03-15T10:30:00.000Z'
            },
            issuer: {
              type: 'string',
              description: 'Authority that issued this verification',
              example: 'Mock LHDN'
            },
            signature: {
              type: 'string',
              description: 'Digital signature for data integrity verification',
              example: 'a1b2c3d4e5f6...'
            },
            public_key: {
              type: 'string',
              description: 'Public key for signature verification',
              example: '04a1b2c3d4e5f6...'
            }
          }
        },
        // Schema for error responses
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Human-readable error message',
              example: 'Citizen not found in LHDN database'
            },
            code: {
              type: 'string',
              description: 'Machine-readable error code for programmatic handling',
              example: 'CITIZEN_NOT_FOUND'
            }
          }
        },
        // Schema for health check response
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK'
            },
            service: {
              type: 'string',
              example: 'Mock LHDN API'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            public_key: {
              type: 'string',
              description: 'Server public key for cryptographic operations'
            }
          }
        },
        // Schema for test citizen data
        TestCitizen: {
          type: 'object',
          properties: {
            ic: {
              type: 'string',
              description: 'Raw IC number without formatting',
              example: '920202106789'
            },
            formatted_ic: {
              type: 'string',
              description: 'Formatted IC number with hyphens',
              example: '920202-10-6789'
            },
            income: {
              type: 'number',
              description: 'Monthly income in RM',
              example: 2350
            },
            name: {
              type: 'string',
              description: 'Citizen full name',
              example: 'Siti binti Rahman'
            }
          }
        },
        // Schema for signature verification request
        SignatureVerificationRequest: {
          type: 'object',
          required: ['data', 'signature'],
          properties: {
            data: {
              type: 'object',
              description: 'Original data that was digitally signed'
            },
            signature: {
              type: 'string',
              description: 'Digital signature to verify against the data'
            }
          }
        }
      }
    }
  },
  apis: ['./server.js'], // Path to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Express middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing for frontend access
app.use(express.json()); // Parse JSON request bodies

// Request logging middleware - logs all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Swagger UI setup - serves interactive API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }', // Hide Swagger UI top bar
  customSiteTitle: 'Mock LHDN API Documentation'
}));

// Endpoint to serve swagger specification as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Cryptographic key generation for digital signatures
// In production, these would be persistent and securely managed
const MOCK_PRIVATE_KEY = crypto.randomBytes(32).toString('hex'); // Private key for signing data
const MOCK_PUBLIC_KEY = crypto.createECDH('secp256k1').generateKeys('hex'); // Public key for verification

console.log('Mock LHDN Public Key:', MOCK_PUBLIC_KEY);

// Mock citizen database - simulates LHDN's citizen income records
// Key: IC number (without hyphens), Value: income and name data
const mockCitizensData = {
  // Existing profiles
  '030520012185': { income: 7000, name: 'HAR SZE HAO' },       // B40_LOW category
  '030322016289': { income: 2350, name: 'PANG ZHAN HUANG' },   // B40_HIGH category

  // B40 Income Range (Below RM4,850)
  '950101011234': { income: 1500, name: 'NURUL AISYAH BINTI AHMAD' },
  '880215025678': { income: 2800, name: 'LIM WEI JIAN' },
  '920308031122': { income: 3200, name: 'KUMAR A/L RAJAN' },
  '850420043344': { income: 4500, name: 'TAN MEI LING' },

  // M40-M1 Range (RM4,851 - RM7,100)
  '910512055566': { income: 5000, name: 'FARAH BINTI IBRAHIM' },
  '870625067788': { income: 5800, name: 'WONG KAR WAI' },
  '930710079900': { income: 6500, name: 'SITI NURHALIZA BINTI TARUDIN' },
  '840822081234': { income: 7000, name: 'RAJESH A/L KUMAR' },

  // M40-M2 Range (RM7,101 - RM10,970)
  '960905095567': { income: 7500, name: 'CHUA YEN LING' },
  '890118107889': { income: 8900, name: 'MUHAMMAD HAFIZ BIN ZAINUDIN' },
  '920203129012': { income: 9800, name: 'LEE CHONG WEI' },
  '861114143345': { income: 10500, name: 'ANITA A/P SUPPIAH' },

  // T20 Range (Above RM10,970)
  '940425155678': { income: 12000, name: 'DATO\' TAN BOON HUAT' },
  '810507167890': { income: 15000, name: 'DR. AMINAH BINTI KASSIM' },
  '970618179123': { income: 18500, name: 'VINCENT CHIN YONG SENG' },
  '831022181456': { income: 22000, name: 'DATIN LATIFAH BINTI ABDULLAH' },

  // Edge cases for testing
  '000101010001': { income: 4850, name: 'BOUNDARY TEST B40-M40' },      // Exact B40/M40 boundary
  '000202020002': { income: 7100, name: 'BOUNDARY TEST M40-M1-M2' },    // Exact M40-M1/M40-M2 boundary
  '000303030003': { income: 10970, name: 'BOUNDARY TEST M40-T20' }      // Exact M40/T20 boundary
};

/**
 * Digital signature function using HMAC-SHA256
 * In production, this would use proper ECDSA signatures
 * @param {Object} data - Data to be signed
 * @param {string} privateKey - Private key for signing
 * @returns {string} Hex-encoded signature
 */
function signData(data, privateKey) {
  const message = JSON.stringify(data);
  const signature = crypto.createHmac('sha256', privateKey).update(message).digest('hex');
  return signature;
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the API service is running and get server information including public key
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy and operational
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Mock LHDN API',
    timestamp: new Date().toISOString(),
    public_key: MOCK_PUBLIC_KEY
  });
});

/**
 * @swagger
 * /api/verify-income:
 *   post:
 *     summary: Verify citizen income
 *     description: Verify a Malaysian citizen's monthly income using their IC number. Returns income data with digital signature for integrity verification.
 *     tags: [Income Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IncomeVerificationRequest'
 *     responses:
 *       200:
 *         description: Income verification successful - citizen found and income verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IncomeVerificationResponse'
 *       400:
 *         description: Bad request - missing or invalid IC number format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "IC number is required"
 *               code: "MISSING_IC"
 *       404:
 *         description: Citizen not found in LHDN database
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Citizen not found in LHDN database"
 *               code: "CITIZEN_NOT_FOUND"
 *       500:
 *         description: Internal server error during processing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/verify-income', (req, res) => {
  try {
    const { ic } = req.body;

    // Input validation - ensure IC number is provided
    if (!ic) {
      return res.status(400).json({
        error: 'IC number is required',
        code: 'MISSING_IC'
      });
    }

    // Clean IC number by removing hyphens for database lookup
    // Converts "030520-01-2185" to "030520012185"
    const cleanIC = ic.replace(/-/g, '');

    // Look up citizen data in mock database
    const citizenData = mockCitizensData[cleanIC];

    // Return 404 if citizen not found in database
    if (!citizenData) {
      return res.status(404).json({
        error: 'Citizen not found in LHDN database',
        code: 'CITIZEN_NOT_FOUND'
      });
    }

    // Prepare response data for signing
    // This represents the official income verification from LHDN
    const responseData = {
      ic: ic,
      monthly_income: citizenData.income,
      citizen_name: citizenData.name,
      verification_timestamp: new Date().toISOString(),
      issuer: 'Mock LHDN'
    };

    // Generate digital signature for data integrity
    // This proves the data came from LHDN and hasn't been tampered with
    const signature = signData(responseData, MOCK_PRIVATE_KEY);

    // Combine response data with signature and public key
    const finalResponse = {
      ...responseData,
      signature: signature,
      public_key: MOCK_PUBLIC_KEY
    };

    console.log(`✅ Income verified for IC: ${ic}, Income: RM${citizenData.income}`);

    res.json(finalResponse);

  } catch (error) {
    console.error('Error in verify-income:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/test-ics:
 *   get:
 *     summary: Get test IC numbers
 *     description: Retrieve all available test IC numbers for development and testing purposes. Useful for demos and integration testing.
 *     tags: [Testing]
 *     responses:
 *       200:
 *         description: List of test IC numbers with citizen information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Available test IC numbers"
 *                 test_citizens:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TestCitizen'
 */
app.get('/api/test-ics', (req, res) => {
  // Transform mock data into formatted response
  // Provides both raw and formatted IC numbers for convenience
  const testICs = Object.keys(mockCitizensData).map(ic => ({
    ic: ic, // Raw IC without formatting
    formatted_ic: `${ic.slice(0, 6)}-${ic.slice(6, 8)}-${ic.slice(8)}`, // Formatted with hyphens
    income: mockCitizensData[ic].income,
    name: mockCitizensData[ic].name
  }));

  res.json({
    message: 'Available test IC numbers',
    test_citizens: testICs
  });
});

/**
 * @swagger
 * /api/verify-signature:
 *   post:
 *     summary: Verify digital signature
 *     description: Verify if a digital signature is valid for the given data. Used by clients to ensure data integrity and authenticity.
 *     tags: [Cryptography]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignatureVerificationRequest'
 *     responses:
 *       200:
 *         description: Signature verification completed (check is_valid field for result)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 is_valid:
 *                   type: boolean
 *                   description: Whether the signature is valid for the given data
 *                 message:
 *                   type: string
 *                   description: Human-readable verification result message
 *       400:
 *         description: Invalid request - missing or malformed data/signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/verify-signature', (req, res) => {
  try {
    const { data, signature } = req.body;

    // Generate expected signature using the same algorithm and private key
    const expectedSignature = signData(data, MOCK_PRIVATE_KEY);

    // Compare signatures - constant time comparison would be better for security
    const isValid = signature === expectedSignature;

    res.json({
      is_valid: isValid,
      message: isValid ? 'Signature is valid' : 'Signature is invalid'
    });

  } catch (error) {
    res.status(400).json({
      error: 'Invalid signature verification request',
      code: 'INVALID_REQUEST'
    });
  }
});

// JSON parsing error handling middleware
// Handles malformed JSON requests gracefully
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', {
      message: err.message,
      body: err.body,
      url: req.url,
      method: req.method
    });
    return res.status(400).json({
      error: 'Invalid JSON format in request body',
      code: 'JSON_PARSE_ERROR',
      details: err.message
    });
  }

  // Generic error handler for unexpected errors
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Something went wrong!',
    code: 'UNHANDLED_ERROR'
  });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Mock LHDN API Server running on http://localhost:${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`Public Key: ${MOCK_PUBLIC_KEY}`);
});

export default app;