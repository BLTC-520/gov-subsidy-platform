import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { CONTRACT_ADDRESSES, SUBSIDY_CLAIM_ABI } from '../../lib/contracts';

interface AllocationData {
  address: string;
  amount: number;
}

export function AllocationManager() {
  const { isConnected } = useAccount();
  const [csvData, setCsvData] = useState<AllocationData[]>([]);
  const [csvText, setCsvText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Mock CSV data generator
  const generateMockCSV = () => {
    const mockData = `address,amount
0xCC06811c343Aa8F4CeB42c5d9053400C2Df27dC6,1000
0x3fa90eCe725B2bDed859dCf5364c39d8AAC8BdAC,1000
0x50d18bA7d4b7f2A0A2fce3be97D1C19b5e19dCE3,1000
0xE819584CA25B9C82e9FE30D0c0a75BeA06B70357,1000
0x0FD0a773719A84d99cA3a09F8CdA6aE51a2BE84f,1000
0xfAB3c85aeadEEF963aB2835d25268dB3F8228B1D,1000
0xC36020E61724E86979e4c31709b027c889C05244,1000
0x74A6e88e81F4730D60D3b6Ee7C01ea7Ea758cF30,1000
0x05b503d55024175d18F0D800cE5aaD9C48582591,1000
0xf804F7706F6fE94d883120810a831cB56E2786C1,1000`;
    setCsvText(mockData);
    parseCSV(mockData);
  };

  // Parse CSV text into structured data
  const parseCSV = (text: string) => {
    setIsProcessing(true);
    try {
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      if (!headers.includes('address') || !headers.includes('amount')) {
        throw new Error('CSV must have "address" and "amount" columns');
      }

      const addressIndex = headers.indexOf('address');
      const amountIndex = headers.indexOf('amount');

      const data: AllocationData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 2) {
          const address = values[addressIndex];
          const amount = parseFloat(values[amountIndex]);
          
          // Validate address format
          if (!address.startsWith('0x') || address.length !== 42) {
            throw new Error(`Invalid address format at line ${i + 1}: ${address}`);
          }
          
          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error(`Invalid amount at line ${i + 1}: ${values[amountIndex]}`);
          }
          
          data.push({ address, amount });
        }
      }
      
      setCsvData(data);
    } catch (err) {
      alert(`CSV parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvText(text);
        parseCSV(text);
      };
      reader.readAsText(file);
    }
  };

  // Convert to contract arrays
  const convertToContractArrays = () => {
    const addresses = csvData.map(item => item.address as `0x${string}`);
    const amounts = csvData.map(item => parseUnits(item.amount.toString(), 18));
    
    return { addresses, amounts };
  };

  // Set allocations on contract
  const setAllocations = async () => {
    if (csvData.length === 0) {
      alert('No allocation data to process');
      return;
    }

    const { addresses, amounts } = convertToContractArrays();
    
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.SUBSIDY_CLAIM as `0x${string}`,
        abi: SUBSIDY_CLAIM_ABI,
        functionName: 'setAllocations',
        args: [addresses, amounts],
      });
    } catch (err) {
      console.error('Setting allocations failed:', err);
    }
  };

  // Download template CSV
  const downloadTemplate = () => {
    const template = `address,amount
0x0000000000000000000000000000000000000000,1000
0x1111111111111111111111111111111111111111,1500
0x2222222222222222222222222222222222222222,2000`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'allocation-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <p className="text-gray-600">Connect your admin wallet to manage allocations.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Allocation Management
      </h2>

      {/* CSV Input Section */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={generateMockCSV}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            Generate Mock Data
          </button>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Download Template
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Or Paste CSV Data
          </label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="address,amount&#10;0x...,1000&#10;0x...,1500"
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <button
            onClick={() => parseCSV(csvText)}
            disabled={!csvText || isProcessing}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {isProcessing ? 'Processing...' : 'Parse CSV'}
          </button>
        </div>
      </div>

      {/* Parsed Data Preview */}
      {csvData.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-800 mb-2">
            Parsed Allocations ({csvData.length} entries)
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 grid grid-cols-2 gap-4 text-sm font-medium text-gray-600 p-3 border-b border-gray-200">
              <div>Address</div>
              <div>Amount (MMYRC)</div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {csvData.map((item, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 text-sm py-2 px-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <div className="font-mono text-xs truncate" title={item.address}>
                    {item.address}
                  </div>
                  <div className="text-right">{item.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Total Allocation:</strong> {csvData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()} MMYRC
            </p>
          </div>
        </div>
      )}

      {/* Contract Arrays Preview */}
      {csvData.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-800 mb-2">Contract Arrays Preview</h3>
          <div className="space-y-2 text-xs">
            <div>
              <p className="font-medium text-gray-600">Addresses Array:</p>
              <code className="block bg-gray-100 p-2 rounded text-xs break-all">
                [{convertToContractArrays().addresses.map(addr => `"${addr}"`).join(',')}]
              </code>
            </div>
            <div>
              <p className="font-medium text-gray-600">Amounts Array:</p>
              <code className="block bg-gray-100 p-2 rounded text-xs break-all">
                [{convertToContractArrays().amounts.map(amt => `"${amt.toString()}"`).join(',')}]
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Set Allocations Button */}
      {csvData.length > 0 && (
        <button
          onClick={setAllocations}
          disabled={isPending || isConfirming}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
        >
          {isPending ? 'Confirming...' : isConfirming ? 'Setting Allocations...' : 'Set Allocations on Contract'}
        </button>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-800 text-sm">
            Error: {error.message}
          </p>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-green-800 text-sm">
            ✅ Allocations set successfully!
          </p>
          {hash && (
            <div className="mt-2">
              <a
                href={`https://sepolia.etherscan.io/tx/${hash}#eventlog`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
              >
                View on Sepolia Etherscan
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="text-green-700 text-xs mt-1 font-mono break-all">
                Transaction: {hash}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}