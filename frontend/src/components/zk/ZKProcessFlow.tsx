import React from 'react';
import { ArrowRight, Shield, Eye, CheckCircle, Lock, Key } from 'lucide-react';

interface ZKProcessFlowProps {
  className?: string;
}

const ZKProcessFlow: React.FC<ZKProcessFlowProps> = ({ className = '' }) => {
  const steps = [
    {
      id: 1,
      title: 'Your Secret Income',
      icon: Lock,
      description: 'You have your real salary amount',
      detail: 'e.g., RM 1,800/month',
      color: 'bg-red-100 border-red-200 text-red-700'
    },
    {
      id: 2,
      title: 'Mathematical Transformation',
      icon: Key,
      description: 'ZK circuit converts your income into cryptographic proof',
      detail: 'Complex math creates π_a, π_b, π_c values',
      color: 'bg-blue-100 border-blue-200 text-blue-700'
    },
    {
      id: 3,
      title: 'Zero-Knowledge Magic',
      icon: Shield,
      description: 'Proof shows income bracket without revealing amount',
      detail: 'Public output: "B40 income bracket"',
      color: 'bg-green-100 border-green-200 text-green-700'
    },
    {
      id: 4,
      title: 'Anyone Can Verify',
      icon: Eye,
      description: 'Government/others verify your bracket eligibility',
      detail: 'Cannot reverse-engineer actual salary',
      color: 'bg-purple-100 border-purple-200 text-purple-700'
    },
    {
      id: 5,
      title: 'Subsidy Awarded',
      icon: CheckCircle,
      description: 'You receive appropriate benefits',
      detail: 'Privacy maintained throughout',
      color: 'bg-orange-100 border-orange-200 text-orange-700'
    }
  ];

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          🔄 Zero-Knowledge Proof Process
        </h3>
        <p className="text-sm text-gray-600">
          How we verify your income bracket without seeing your actual salary:
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative">
              <div className={`p-4 rounded-lg border-2 ${step.color}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      <IconComponent size={16} className="text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-1 bg-white rounded-full">
                        Step {step.id}
                      </span>
                      <h4 className="font-semibold text-sm">{step.title}</h4>
                    </div>
                    <p className="text-sm mb-1">{step.description}</p>
                    <p className="text-xs opacity-75 font-mono bg-white px-2 py-1 rounded">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </div>

              {!isLast && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="text-gray-400" size={20} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
        <div className="flex items-start gap-3">
          <Shield className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">🎯 The Key Benefits:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Complete Privacy:</strong> Your exact salary stays secret</li>
              <li>• <strong>Mathematically Secure:</strong> Impossible to fake or reverse-engineer</li>
              <li>• <strong>Instant Verification:</strong> No need for document submissions</li>
              <li>• <strong>Tamper-Proof:</strong> Any manipulation would break the proof</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZKProcessFlow;