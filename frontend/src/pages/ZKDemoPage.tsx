import React, { useState } from 'react';
import { CitizenLayout } from '../components/common/CitizenLayout';

interface DemoStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  result?: string;
}

interface APIResponse {
  ic: string;
  monthly_income: number;
  citizen_name: string;
  verification_timestamp: string;
  signature: string;
  public_key: string;
  issuer: string;
}

export default function ZKDemoPage() {
  const [demoRunning, setDemoRunning] = useState(false);
  const [selectedIC, setSelectedIC] = useState('030520-01-2185');
  const [apiResponse, setApiResponse] = useState<APIResponse | null>(null);
  const [steps, setSteps] = useState<DemoStep[]>([
    {
      id: 1,
      title: 'Fetch Income Data from LHDN API',
      description: 'Retrieve verified income data with digital signature from Mock LHDN',
      status: 'pending'
    },
    {
      id: 2,
      title: 'Verify Digital Signature',
      description: 'Validate that income data is authentically signed by LHDN authority',
      status: 'pending'
    },
    {
      id: 3,
      title: 'Convert to ZK Circuit Format',
      description: 'Transform API response into inputs compatible with ZK circuit',
      status: 'pending'
    },
    {
      id: 4,
      title: 'Execute ZK Circuit',
      description: 'Run Circom circuit to compute income classification with signature verification',
      status: 'pending'
    },
    {
      id: 5,
      title: 'Verify Circuit Outputs',
      description: 'Validate circuit outputs confirm income bracket without revealing actual amount',
      status: 'pending'
    }
  ]);

  const updateStepStatus = (stepId: number, status: DemoStep['status'], result?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, result } : step
    ));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runDemo = async () => {
    setDemoRunning(true);
    setApiResponse(null);

    try {
      // Step 1: Fetch Income Data
      updateStepStatus(1, 'loading');
      await sleep(1000);
      
      const response = await fetch('http://localhost:3001/api/verify-income', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ic: selectedIC })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch income data');
      }

      const data: APIResponse = await response.json();
      setApiResponse(data);
      updateStepStatus(1, 'success', `Income: RM${data.monthly_income}, Class: ${getIncomeClass(data.monthly_income)}`);

      // Step 2: Verify Signature
      updateStepStatus(2, 'loading');
      await sleep(800);
      
      const signatureResponse = await fetch('http://localhost:3001/api/verify-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            ic: data.ic,
            monthly_income: data.monthly_income,
            citizen_name: data.citizen_name,
            verification_timestamp: data.verification_timestamp,
            issuer: data.issuer
          },
          signature: data.signature
        })
      });

      const signatureResult = await signatureResponse.json();
      updateStepStatus(2, signatureResult.is_valid ? 'success' : 'error', 
        signatureResult.is_valid ? 'Signature verified authentic' : 'Invalid signature');

      if (!signatureResult.is_valid) {
        throw new Error('Signature verification failed');
      }

      // Step 3: Convert to ZK Format
      updateStepStatus(3, 'loading');
      await sleep(600);

      const circuitInputs = convertToCircuitFormat(data);
      updateStepStatus(3, 'success', 'Data converted to field elements for ZK circuit');

      // Step 4: Execute ZK Circuit (actual)
      updateStepStatus(4, 'loading');
      
      const circuitResult = await executeActualCircuit(circuitInputs);
      updateStepStatus(4, 'success', 
        `Circuit executed: ${circuitResult.classification}, Signature valid: ${circuitResult.signatureValid}, Data authentic: ${circuitResult.dataAuthentic}`
      );

      // Step 5: Verify Circuit Outputs
      updateStepStatus(5, 'loading');
      await sleep(500);

      const classSum = circuitResult.classFlags.reduce((sum, flag) => sum + flag, 0);
      const verificationMessage = circuitResult.dataAuthentic 
        ? `Verification successful: Classification = ${circuitResult.classification} (flags sum: ${classSum})`
        : 'Verification failed: Invalid signature, all classifications zero';
        
      updateStepStatus(5, circuitResult.dataAuthentic ? 'success' : 'error', verificationMessage);

    } catch (error) {
      console.error('Demo failed:', error);
      const currentStep = steps.find(s => s.status === 'loading')?.id || 1;
      updateStepStatus(currentStep, 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setDemoRunning(false);
    }
  };

  const resetDemo = () => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', result: undefined })));
    setApiResponse(null);
  };

  const getIncomeClass = (income: number): string => {
    if (income <= 2560) return 'B1';
    if (income <= 3439) return 'B2';
    if (income <= 4309) return 'B3';
    if (income <= 5249) return 'B4';
    if (income <= 6339) return 'M1';
    if (income <= 7689) return 'M2';
    if (income <= 9449) return 'M3';
    if (income <= 11819) return 'M4';
    if (income <= 15869) return 'T1';
    return 'T2';
  };

  const convertToCircuitFormat = (data: APIResponse) => {
    // Convert hex strings to field elements for the circuit
    const signatureBigInt = BigInt('0x' + data.signature.slice(0, 16));
    const publicKeyBigInt = BigInt('0x' + data.public_key.slice(0, 16));
    
    // Create IC hash for privacy
    const icClean = data.ic.replace(/-/g, '');
    const icHash = Array.from(icClean).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Calculate timestamp age in seconds (how old the verification is)
    const verificationTime = Math.floor(new Date(data.verification_timestamp).getTime() / 1000);
    const currentTime = Math.floor(Date.now() / 1000);
    const timestampAge = Math.floor(currentTime - verificationTime);
    
    return {
      monthly_income: data.monthly_income.toString(),
      signature: signatureBigInt.toString(),
      verification_timestamp: Math.max(0, timestampAge).toString(), // Ensure non-negative integer
      public_key: publicKeyBigInt.toString(),
      ic_hash: icHash.toString(),
      timestamp_range: '86400' // 24 hours in seconds
    };
  };

  const executeActualCircuit = async (inputs: any) => {
    try {
      console.log('Executing actual ZK circuit...');
      
      console.log('Sending circuit inputs:', inputs);
      
      const response = await fetch('http://localhost:3002/api/execute-circuit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ circuitInputs: inputs })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          console.log('Parsed error data:', errorData);
          throw new Error(`Circuit execution failed: ${errorData.error || errorData.details || 'Unknown error'}`);
        } catch (parseError) {
          console.log('Failed to parse error response as JSON:', parseError);
          throw new Error(`Circuit execution failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }

      const result = await response.json();
      console.log('Circuit execution result:', result);
      
      return {
        classification: result.outputs.income_classification,
        signatureValid: result.outputs.is_signature_valid === 1,
        dataAuthentic: result.outputs.is_data_authentic === 1,
        classFlags: result.outputs.class_flags,
        compilationLog: result.compilation_log,
        witnessLog: result.witness_log,
        rawOutputs: result.outputs
      };
      
    } catch (error) {
      console.error('Circuit execution error:', error);
      throw error;
    }
  };

  const getStepIcon = (status: DemoStep['status']) => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        );
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
        );
    }
  };

  return (
    <CitizenLayout title="ZK Signature Verification Demo">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Demo Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Zero-Knowledge Income Verification Demo
            </h2>
            <p className="text-gray-600 mb-6">
              This demo shows how citizens can prove their income bracket to government agencies 
              without revealing their actual income amount, using verified data from LHDN.
            </p>
            
            {/* IC Selection */}
            <div className="max-w-md mx-auto mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Test IC Number:
              </label>
              <select
                value={selectedIC}
                onChange={(e) => setSelectedIC(e.target.value)}
                disabled={demoRunning}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="030520-01-2185">030520-01-2185 (HAR SZE HAO - B1)</option>
                <option value="030322-01-6289">030322-01-6289 (PANG ZHAN HUANG - B2)</option>
              </select>
            </div>

            {/* Demo Controls */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={runDemo}
                disabled={demoRunning}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {demoRunning ? 'Running Demo...' : 'Start Demo'}
              </button>
              <button
                onClick={resetDemo}
                disabled={demoRunning}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Demo Steps */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Process</h3>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">
                      Step {step.id}: {step.title}
                    </h4>
                    {step.status === 'loading' && (
                      <span className="text-sm text-blue-600">Processing...</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {step.description}
                  </p>
                  {step.result && (
                    <div className={`mt-2 p-2 rounded text-sm ${
                      step.status === 'success' 
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : step.status === 'error'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-gray-50 text-gray-800 border border-gray-200'
                    }`}>
                      {step.result}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Response Display */}
        {apiResponse && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">LHDN API Response</h3>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-700">
{JSON.stringify({
  citizen_name: apiResponse.citizen_name,
  monthly_income: apiResponse.monthly_income,
  income_class: getIncomeClass(apiResponse.monthly_income),
  verification_timestamp: apiResponse.verification_timestamp,
  signature: apiResponse.signature.slice(0, 32) + '...',
  public_key: apiResponse.public_key.slice(0, 32) + '...',
  issuer: apiResponse.issuer
}, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium text-gray-900">1. Digital Signature Verification</h4>
              <p>The LHDN API signs income data with HMAC-SHA256. The ZK circuit verifies this signature to ensure data authenticity.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">2. Zero-Knowledge Classification</h4>
              <p>The circuit classifies income into 10 brackets (B1-B4, M1-M4, T1-T2) without revealing the exact amount.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">3. Privacy Protection</h4>
              <p>Only the income bracket classification is revealed. The actual income amount remains private.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">4. Cryptographic Proof</h4>
              <p>The generated proof can be verified by anyone without access to the original income data.</p>
            </div>
          </div>
        </div>

        {/* System Architecture */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Architecture</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-center text-sm text-gray-600 space-y-2">
              <div>Citizen IC Input → Mock LHDN API → Signed Income Data</div>
              <div>↓</div>
              <div>ZK Circuit (Signature Verification + Income Classification)</div>
              <div>↓</div>
              <div>Zero-Knowledge Proof (Income Bracket + Signature Validity)</div>
              <div>↓</div>
              <div>Government Verification (No Access to Actual Income)</div>
            </div>
          </div>
        </div>
      </div>
    </CitizenLayout>
  );
}