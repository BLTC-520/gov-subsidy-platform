import React, { useState } from 'react';
import { Shield, CheckCircle, Info, ChevronDown, ChevronUp, Key, Calculator, Eye } from 'lucide-react';

interface ZKProofExplainerProps {
  proof?: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals?: string[];
  isVisible?: boolean;
}

const ZKProofExplainer: React.FC<ZKProofExplainerProps> = ({
  proof,
  isVisible = false
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!isVisible || !proof) return null;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="text-blue-600" size={20} />
        <h4 className="font-semibold text-gray-800">🔐 Zero-Knowledge Proof Breakdown</h4>
        <Info className="text-gray-400" size={16} />
      </div>
      
      {/* Protocol Info */}
      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="text-green-500" size={16} />
          <span className="font-medium text-gray-700">Cryptographic Protocol</span>
        </div>
        <div className="text-sm text-gray-600">
          <strong>{(proof.protocol || 'groth16').toUpperCase()}</strong> protocol on <strong>{(proof.curve || 'bn128').toUpperCase()}</strong> elliptic curve
          <div className="text-xs mt-1 text-gray-500">
            Industry-standard zero-knowledge proof system used by Ethereum and other blockchain networks
          </div>
        </div>
      </div>

      {/* Main Educational Content */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-800 mb-3">
          🧮 <strong>How These Numbers Prove Your Income Without Revealing It:</strong>
        </div>

        {/* Pi_A Component */}
        <div className="bg-white rounded-lg border border-purple-200">
          <button
            onClick={() => toggleSection('pi_a')}
            className="w-full p-3 text-left flex items-center justify-between hover:bg-purple-50"
          >
            <div className="flex items-center gap-2">
              <Key className="text-purple-600" size={16} />
              <span className="font-medium text-purple-700">π_a (Pi Alpha) - Your Secret Knowledge</span>
            </div>
            {expandedSection === 'pi_a' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSection === 'pi_a' && (
            <div className="px-4 pb-3 border-t border-purple-100">
              <div className="text-xs text-gray-600 mb-2">
                <strong>Current Value:</strong> <span className="font-mono bg-gray-100 p-1 rounded">[{proof.pi_a[0]}, {proof.pi_a[1]}, {proof.pi_a[2]}]</span>
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <p><strong>What it represents:</strong> Mathematical proof that you know your exact income amount.</p>
                <p><strong>Why it's safe:</strong> This number is scrambled using cryptographic randomness - even if someone sees it, they cannot reverse-engineer your actual salary.</p>
                <p><strong>Why it changes:</strong> Each time you generate a proof, random values are added to prevent anyone from linking multiple proofs to the same person.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pi_B Component */}
        <div className="bg-white rounded-lg border border-indigo-200">
          <button
            onClick={() => toggleSection('pi_b')}
            className="w-full p-3 text-left flex items-center justify-between hover:bg-indigo-50"
          >
            <div className="flex items-center gap-2">
              <Calculator className="text-indigo-600" size={16} />
              <span className="font-medium text-indigo-700">π_b (Pi Beta) - The Mathematical Bridge</span>
            </div>
            {expandedSection === 'pi_b' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSection === 'pi_b' && (
            <div className="px-4 pb-3 border-t border-indigo-100">
              <div className="text-xs text-gray-600 mb-2">
                <strong>Current Value:</strong> <span className="font-mono bg-gray-100 p-1 rounded">2x2 matrix with values like [{proof.pi_b[0][0]}, {proof.pi_b[0][1]}]...</span>
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <p><strong>What it represents:</strong> Advanced mathematical points on an elliptic curve that connect your secret income to the public income bracket.</p>
                <p><strong>The magic:</strong> These special numbers allow anyone to verify your income bracket matches, without revealing the actual amount.</p>
                <p><strong>Complex but secure:</strong> Uses bilinear pairings - advanced mathematics that even computers can't reverse to find your income.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pi_C Component */}
        <div className="bg-white rounded-lg border border-blue-200">
          <button
            onClick={() => toggleSection('pi_c')}
            className="w-full p-3 text-left flex items-center justify-between hover:bg-blue-50"
          >
            <div className="flex items-center gap-2">
              <Eye className="text-blue-600" size={16} />
              <span className="font-medium text-blue-700">π_c (Pi Gamma) - The Final Verification</span>
            </div>
            {expandedSection === 'pi_c' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSection === 'pi_c' && (
            <div className="px-4 pb-3 border-t border-blue-100">
              <div className="text-xs text-gray-600 mb-2">
                <strong>Current Value:</strong> <span className="font-mono bg-gray-100 p-1 rounded">[{proof.pi_c[0]}, {proof.pi_c[1]}, {proof.pi_c[2]}]</span>
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <p><strong>What it represents:</strong> The final piece that completes the mathematical proof, ensuring everything checks out.</p>
                <p><strong>Verification role:</strong> Anyone can use π_a, π_b, and π_c together to verify your income bracket is correct.</p>
                <p><strong>Trust mechanism:</strong> If any of these values were fake or tampered with, the mathematical verification would fail.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simple Summary */}
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-2">
          <CheckCircle className="text-green-600 mt-0.5" size={16} />
          <div className="text-sm">
            <strong className="text-green-800">Simple Summary:</strong>
            <p className="text-green-700 mt-1">
              Think of this like a sealed envelope containing your salary, but the envelope is magic ✨ - 
              it can prove to anyone that your salary is in the correct range (B40, M40, or T20) without 
              anyone ever opening the envelope to see the actual amount inside!
            </p>
          </div>
        </div>
      </div>

      {/* Technical Note */}
      <div className="mt-3 text-xs text-gray-500 bg-white p-2 rounded border-l-4 border-gray-300">
        <strong>🔬 For the technically curious:</strong> Each proof uses fresh cryptographic randomness, 
        making every π_a, π_b, π_c combination unique while proving the same underlying statement. 
        This prevents correlation attacks and ensures perfect privacy protection.
      </div>
    </div>
  );
};

export default ZKProofExplainer;