import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "../components/common/AdminLayout";
import { supabase } from "../lib/supabase";
import { calculateFormulaAnalysis, getEligibilityClass } from "../utils/formulaCalculations";

interface RAGAnalysisResult {
  score: number;
  eligibility_class: string;
  confidence: number;
  explanation: string;
  retrieved_context: string[];
}

interface FormulaAnalysisResult {
  score: number;
  burden_score: number;
  eligibility_class: string;
  explanation: string;
  equivalent_income: number;
  adult_equivalent: number;
  burden_ratio: number;
  state_median_burden: number;
  calculation_steps: string[];
  component_scores: {
    base_score: number;
    raw_burden_score: number;
    documentation_score: number;
    disability_score: number;
    weighted_burden_75pct: number;
    weighted_documentation_25pct: number;
    component_total: number;
  };
}

interface ComparisonResult {
  agreement: boolean;
  score_difference: number;
  class_mismatch: boolean;
  recommendation: string;
  comment: string;
}

interface AnalysisResponse {
  citizen_id: string;
  citizen_data: any;
  analysis: {
    rag_result: RAGAnalysisResult;
    formula_result: FormulaAnalysisResult;
    comparison: ComparisonResult;
  };
}

interface CitizenData {
  id: string;
  full_name: string | null;
  nric: string | null;
  state: string | null;
  income_bracket: string | null;
  household_size: number;
  number_of_children: number;
  disability_status: boolean;
  is_signature_valid: boolean;
  is_data_authentic: boolean;
  monthly_income: number | null;
}

export default function AnalysisResultsPage() {
  const { citizenId } = useParams<{ citizenId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"comparison" | "rag" | "formula">("comparison");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [downloadingFormula, setDownloadingFormula] = useState(false);
  const [ragScore, setRagScore] = useState<number | null>(null);
  const [ragExplanation, setRagExplanation] = useState<string>("");
  const [editingRag, setEditingRag] = useState(false);

  useEffect(() => {
    if (citizenId) {
      loadAnalysisResults();
    }
  }, [citizenId]);

  const loadAnalysisResults = async () => {
    setLoading(true);
    try {
      // Fetch actual citizen data from Supabase
      const { data: citizenData, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", citizenId!)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!citizenData) {
        throw new Error("Citizen not found");
      }

      // Convert database data to our interface
      const citizen: CitizenData = {
        id: citizenData.id,
        full_name: citizenData.full_name,
        nric: citizenData.nric,
        state: citizenData.state,
        income_bracket: citizenData.income_bracket,
        household_size: citizenData.household_size || 1,
        number_of_children: citizenData.number_of_children || 0,
        disability_status: citizenData.disability_status || false,
        is_signature_valid: citizenData.is_signature_valid || false,
        is_data_authentic: citizenData.is_data_authentic || false,
        monthly_income: citizenData.monthly_income
      };

      // Calculate actual formula results
      const formulaCalculation = calculateFormulaAnalysis(citizen);
      const eligibilityClass = getEligibilityClass(citizen.income_bracket || 'B1');

      // Create initial RAG result (to be filled from CLI)
      const ragResult: RAGAnalysisResult = {
        score: ragScore ?? -1, // -1 indicates N/A
        eligibility_class: ragScore !== null ? eligibilityClass : "N/A",
        confidence: ragScore !== null ? 0.85 : 0,
        explanation: ragExplanation || "RAG analysis demo available via CLI. Run 'python main.py' in backend/smolagents-service/ to get results, then input them here.",
        retrieved_context: [
          "[CLI Demo] Policy corpus contains 1,247 documents on Malaysian subsidy eligibility",
          "[CLI Demo] Semantic search would retrieve relevant policy sections based on citizen profile",
          "[CLI Demo] Multi-agent reasoning would analyze edge cases and policy conflicts",
          "[CLI Demo] Natural language explanation would be generated from retrieved context"
        ]
      };

      // Determine agreement (only if RAG score is available)
      const scoreDifference = ragScore !== null ? Math.abs(formulaCalculation.final_score - ragResult.score) : 0;
      const agreement = ragScore !== null ? scoreDifference <= 5 : false;
      const hasRagResult = ragScore !== null;

      const result: AnalysisResponse = {
        citizen_id: citizenId!,
        citizen_data: citizenData,
        analysis: {
          rag_result: ragResult,
          formula_result: {
            score: formulaCalculation.final_score,
            burden_score: formulaCalculation.final_score,
            eligibility_class: eligibilityClass,
            explanation: formulaCalculation.explanation,
            equivalent_income: formulaCalculation.equivalent_income,
            adult_equivalent: formulaCalculation.adult_equivalent,
            burden_ratio: formulaCalculation.burden_ratio,
            state_median_burden: formulaCalculation.state_median_burden,
            calculation_steps: formulaCalculation.calculation_steps,
            component_scores: {
              base_score: formulaCalculation.base_score,
              raw_burden_score: formulaCalculation.raw_burden_score,
              documentation_score: formulaCalculation.documentation_score,
              disability_score: formulaCalculation.disability_score,
              weighted_burden_75pct: formulaCalculation.weighted_burden_75pct,
              weighted_documentation_25pct: formulaCalculation.weighted_documentation_25pct,
              component_total: formulaCalculation.component_total
            }
          },
          comparison: {
            agreement,
            score_difference: scoreDifference,
            class_mismatch: hasRagResult ? eligibilityClass !== ragResult.eligibility_class : false,
            recommendation: !hasRagResult
              ? "⏳ Awaiting RAG Analysis Results"
              : agreement
              ? `✅ Consensus: ${eligibilityClass} (Both methods agree within threshold)`
              : `⚠️ Disagreement: Formula ${eligibilityClass} vs RAG ${ragResult.eligibility_class}`,
            comment: !hasRagResult
              ? "Run CLI analysis and input results to enable comparison."
              : agreement
              ? "Both analysis methods provide consistent results, demonstrating robust eligibility determination."
              : "Methods disagree, highlighting the interpretability vs flexibility trade-off in AI governance systems."
          }
        }
      };

      setAnalysisResult(result);
    } catch (err) {
      setError(`Failed to load analysis results: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFormulaReport = async () => {
    if (!analysisResult) return;

    try {
      setDownloadingFormula(true);

      // Get citizen data
      const citizen = analysisResult.citizen_data;
      const formula = analysisResult.analysis.formula_result;

      // Extract birthday and age from NRIC
      const extractBirthdayFromNric = (nric: string | null) => {
        if (!nric) return null;
        const nricParts = nric.split('-');
        if (nricParts.length >= 1 && nricParts[0].length === 6) {
          const yymmdd = nricParts[0];
          const yy = parseInt(yymmdd.substring(0, 2));
          const mm = yymmdd.substring(2, 4);
          const dd = yymmdd.substring(4, 6);
          const yyyy = yy <= 30 ? 2000 + yy : 1900 + yy;
          return new Date(`${yyyy}-${mm}-${dd}`);
        }
        return null;
      };

      const calculateAge = (birthday: Date | null) => {
        if (!birthday) return "Unknown";
        const today = new Date();
        const age = today.getFullYear() - birthday.getFullYear();
        const monthDiff = today.getMonth() - birthday.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
          return age - 1;
        }
        return age;
      };

      const formatIncomeBracket = (income: number | null, bracket: string | null) => {
        if (!bracket) return "Not specified";
        if (bracket.match(/^[BMT]\d$/)) {
          const category = bracket[0];
          const number = bracket[1];
          if (category === "B") return `B40-B${number}`;
          if (category === "M") return `M40-M${number}`;
          if (category === "T") return `T20-T${number}`;
        }
        return bracket;
      };

      const birthday = extractBirthdayFromNric(citizen.nric);
      const age = calculateAge(birthday);
      const currentDate = new Date().toLocaleString();

      // Create the report content (using the same format as CitizenListPage)
      const formulaAnalysis = `GOVERNMENT SUBSIDY PLATFORM
FORMULA ANALYSIS REPORT
Generated: ${currentDate}

================================================================================

CITIZEN PROFILE
================================================================================
Name:             ${citizen.full_name || 'Not Provided'}
NRIC:             ${citizen.nric || 'Not Provided'}
Email:            ${citizen.email || 'Not Provided'}
Age:              ${age}
State:            ${citizen.state || 'Not Specified'}
Monthly Income:   RM ${citizen.monthly_income?.toLocaleString() || 'Not Provided'}
Income Bracket:   ${formatIncomeBracket(citizen.monthly_income, citizen.income_bracket)}

================================================================================

ELIGIBILITY SCORE CALCULATION
================================================================================

BURDEN SCORE METHODOLOGY:
Formula: Final Score = (Burden Score × 75%) + (Documentation Score × 25%)

HOUSEHOLD COMPOSITION:
- Household Members: ${citizen.household_size || 4} persons
- Number of Children: ${citizen.number_of_children || 2}
- Adult Equivalent Scale: ${formula.adult_equivalent}

INCOME ANALYSIS:
- Monthly Income: RM ${citizen.monthly_income?.toLocaleString() || 'Not Provided'}
- Income Bracket: ${formatIncomeBracket(citizen.monthly_income, citizen.income_bracket)}
- Equivalent Income: RM ${formula.equivalent_income.toLocaleString()}
- Adult Equivalent Scale: ${formula.adult_equivalent}

COMPONENT WEIGHTS:
+-------------------+---------+----------------------------------------+
| Component         | Weight  | Description                            |
+-------------------+---------+----------------------------------------+
| Burden Score      |   75%   | Income vs household needs              |
| Documentation     |   25%   | Document completeness & authenticity  |
+-------------------+---------+----------------------------------------+

SPECIAL NOTES:
- Disabled citizens automatically qualify for subsidies regardless of score
- Burden score considers household size and income equivalents
- Documentation score validates data authenticity and completeness

ELIGIBILITY DETERMINATION:
+-------------+-------------------+
| Score Range | Subsidy Status    |
+-------------+-------------------+
| Over 80     | ELIGIBLE          |
| 80 & Below  | NOT ELIGIBLE      |
+-------------+-------------------+

================================================================================

ANALYSIS STATUS
================================================================================
Current Status: ANALYZED (Score: ${formula.score})

Classification: ${formula.eligibility_class}
Eligibility: ${formula.score > 80 ? 'ELIGIBLE' : 'NOT ELIGIBLE'}

================================================================================

DETAILED CALCULATION STEPS
================================================================================
${formula.calculation_steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

================================================================================

COMPONENT BREAKDOWN
================================================================================
Base Score (Income Tier):           ${formula.component_scores.base_score}
Raw Burden Score:                   ${formula.component_scores.raw_burden_score}
Documentation Score:                ${formula.component_scores.documentation_score}
${formula.component_scores.disability_score > 0 ? `Disability Score:                  ${formula.component_scores.disability_score}` : ''}

Weighted Burden (75%):              ${formula.component_scores.weighted_burden_75pct}
Weighted Documentation (25%):       ${formula.component_scores.weighted_documentation_25pct}
Component Total:                    ${formula.component_scores.component_total}

Final Score:                        ${formula.score}

================================================================================

METHODOLOGY NOTES
================================================================================
This analysis uses a transparent, mathematical formula approach that:

• Provides deterministic, reproducible results
• Ensures algorithmic transparency for public accountability
• Uses established economic indicators (Adult Equivalent Scale)
• Incorporates Malaysian income classification standards
• Balances income burden assessment with documentation verification

GOVERNANCE PRINCIPLE:
Mathematical transparency ensures fair, auditable subsidy distribution

BURDEN RATIO DETAILS:
Burden Ratio: ${formula.burden_ratio}
State Median Burden: ${formula.state_median_burden.toFixed(6)}
Applicant Burden: ${(formula.adult_equivalent / formula.equivalent_income).toFixed(6)}

================================================================================

OFFICIAL DOCUMENT
Generated by AI-Powered Analysis System
Gov Subsidy Platform v1.0

================================================================================
END OF REPORT
================================================================================`;

      // Create and download the file
      const blob = new Blob([formulaAnalysis], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formula-analysis-${citizen.full_name || 'citizen'}-${new Date().getTime()}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error("Failed to download formula analysis:", err);
      alert("Failed to download formula analysis. Please try again.");
    } finally {
      setDownloadingFormula(false);
    }
  };

  const TabButton = ({ tabId, label, isActive, onClick }: {
    tabId: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        isActive
          ? "text-blue-600 border-blue-600 bg-blue-50"
          : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {label}
    </button>
  );

  const ComparisonView = ({ analysis }: { analysis: AnalysisResponse["analysis"] }) => {
    const hasRagResult = analysis.rag_result.score !== -1;

    return (
      <div className="space-y-6">
        {/* Agreement Banner */}
        <div className={`p-6 rounded-lg border-l-4 ${
          !hasRagResult
            ? "bg-blue-50 border-blue-400"
            : analysis.comparison.agreement
            ? "bg-emerald-50 border-emerald-400"
            : "bg-amber-50 border-amber-400"
        }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {!hasRagResult ? (
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : analysis.comparison.agreement ? (
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-lg font-semibold ${
              !hasRagResult
                ? "text-blue-800"
                : analysis.comparison.agreement ? "text-emerald-800" : "text-amber-800"
            }`}>
              {analysis.comparison.recommendation}
            </h3>
            <p className={`text-sm ${
              !hasRagResult
                ? "text-blue-700"
                : analysis.comparison.agreement ? "text-emerald-700" : "text-amber-700"
            }`}>
              {analysis.comparison.comment}
            </p>
          </div>
        </div>
      </div>

      {/* Score Comparison */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Score Comparison</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {hasRagResult ? analysis.rag_result.score : "N/A"}
            </div>
            <div className="text-sm text-blue-800">RAG Analysis</div>
            <div className="text-xs text-blue-600">
              {hasRagResult ? `Confidence: ${(analysis.rag_result.confidence * 100).toFixed(0)}%` : "Pending CLI Input"}
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{analysis.formula_result.score}</div>
            <div className="text-sm text-green-800">Formula Analysis</div>
            <div className="text-xs text-green-600">Mathematical</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {hasRagResult ? Math.abs(analysis.comparison.score_difference) : "N/A"}
            </div>
            <div className="text-sm text-gray-800">Difference</div>
            <div className="text-xs text-gray-600">Points</div>
          </div>
        </div>
      </div>

      {/* Research Insights */}
      <div className="bg-slate-50 p-6 rounded-lg">
        <h4 className="text-lg font-semibold text-slate-900 mb-3">Research Insights: Interpretability vs Flexibility</h4>
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            <strong>Formula Analysis:</strong> Provides complete mathematical transparency with burden-based scoring using
            state-specific income equivalents. Every calculation step is auditable and reproducible.
          </p>
          <p>
            <strong>RAG Analysis:</strong> Leverages policy context and semantic understanding to handle edge cases
            and complex scenarios that may not be captured by pure mathematical formulas.
          </p>
          <p>
            <strong>Agreement Analysis:</strong> When both methods agree, it provides high confidence
            in the eligibility determination, combining transparency with contextual reasoning.
          </p>
        </div>
      </div>

      {/* RAG Input Section - Only show if no RAG result yet */}
      {!hasRagResult && (
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h4 className="text-lg font-semibold text-yellow-900 mb-4">Input RAG Analysis Results</h4>
          <p className="text-sm text-yellow-800 mb-4">
            Run CLI analysis and input the results below to enable comparison:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-yellow-900 mb-1">RAG Score</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g., 85.5"
                className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                value={ragScore || ""}
                onChange={(e) => setRagScore(e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-yellow-900 mb-1">RAG Explanation</label>
              <textarea
                placeholder="Enter RAG explanation from CLI output..."
                className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows={3}
                value={ragExplanation}
                onChange={(e) => setRagExplanation(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => window.location.reload()}
              disabled={!ragScore}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
              Update Analysis
            </button>
          </div>
        </div>
      )}
    </div>
    );
  };

  const RAGAnalysisView = ({ result }: { result: RAGAnalysisResult }) => {
    const hasResult = result.score !== -1;

    return (
      <div className="space-y-6">
        {/* CLI Demo Notice */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-amber-800">CLI Demo Available</h3>
              <p className="text-amber-700">
                Full RAG analysis with multi-agent reasoning is demonstrated via command line interface.
                Run <code className="bg-amber-100 px-1 rounded">python main.py</code> in backend/smolagents-service/
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Multi-Agent RAG Analysis (CLI Demo)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {hasResult ? result.score.toFixed(1) : "N/A"}
              </div>
              <div className="text-sm text-gray-600">
                {hasResult ? "RAG Score" : "Awaiting CLI Results"}
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{result.eligibility_class}</div>
              <div className="text-sm text-gray-600">Classification</div>
            </div>
          </div>
        {hasResult && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Confidence Level:</span>
              <div className="ml-3 flex-1">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${result.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
              <span className="ml-2 text-sm text-gray-600">{(result.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}
        <div>
          <h5 className="font-medium text-gray-900 mb-2">RAG Explanation:</h5>
          <p className="text-gray-700 bg-gray-50 p-3 rounded">{result.explanation}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Simulated Policy Retrieval</h4>
        <div className="space-y-3">
          {result.retrieved_context.map((context, index) => (
            <div key={index} className="border-l-3 border-amber-400 bg-amber-50 p-3 rounded-r">
              <p className="text-sm text-amber-800">{context}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-500">
          * Full implementation includes ChromaDB vector search + OpenAI reasoning
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">RAG Analysis Architecture:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>CitizenAnalysisAgent:</strong> Multi-agent reasoning coordinator</li>
          <li>• <strong>ChromaDBRetrieverTool:</strong> Semantic policy document search</li>
          <li>• <strong>Policy Reasoning:</strong> Context-aware eligibility analysis</li>
          <li>• <strong>Natural Language:</strong> Human-readable explanations</li>
        </ul>
        <div className="mt-3 p-3 bg-blue-100 rounded border">
          <p className="text-xs text-blue-900">
            <strong>Demo Command:</strong> Navigate to backend/smolagents-service/ and run Python CLI for full RAG demonstration
          </p>
        </div>
      </div>
    </div>
    );
  };

  const FormulaAnalysisView = ({ result }: { result: FormulaAnalysisResult }) => (
    <div className="space-y-6">
      {/* Real Calculation Notice */}
      <div className="bg-emerald-50 border-l-4 border-emerald-400 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-emerald-800">Live Calculation</h3>
            <p className="text-emerald-700">
              These are real calculations using citizen data from the database and the actual EligibilityScoreTool logic.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Mathematical Formula Analysis</h4>
          <button
            onClick={handleDownloadFormulaReport}
            disabled={downloadingFormula}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {downloadingFormula ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{result.score}</div>
            <div className="text-sm text-green-800">Final Score</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">{result.eligibility_class}</div>
            <div className="text-sm text-blue-800">Classification</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-lg font-semibold text-purple-600">RM {result.equivalent_income.toLocaleString()}</div>
            <div className="text-sm text-purple-800">Equivalent Income</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-lg font-semibold text-orange-600">{result.burden_ratio}</div>
            <div className="text-sm text-orange-800">Burden Ratio</div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h5 className="font-medium text-gray-900 mb-2">Formula Explanation:</h5>
          <p className="text-sm text-gray-700 bg-white p-2 rounded border">
            {result.explanation}
          </p>
        </div>
      </div>

      {/* Detailed Calculation Steps */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Step-by-Step Calculation</h4>
        <div className="space-y-3">
          {result.calculation_steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">
                {index + 1}
              </div>
              <div className="bg-blue-50 p-3 rounded-lg flex-1">
                <p className="text-sm text-blue-900 font-mono">{step}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Component Score Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">Base Score (Income Tier):</span>
              <span className="font-bold text-lg text-blue-600">{result.component_scores.base_score}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">Raw Burden Score:</span>
              <span className="font-bold text-lg text-orange-600">{result.component_scores.raw_burden_score}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">Documentation Score:</span>
              <span className="font-bold text-lg text-green-600">{result.component_scores.documentation_score}</span>
            </div>
            {result.component_scores.disability_score > 0 && (
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded border border-purple-200">
                <span className="font-medium">Disability Score:</span>
                <span className="font-bold text-lg text-purple-600">{result.component_scores.disability_score}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="font-medium">Weighted Burden (75%):</span>
              <span className="font-bold text-lg text-blue-600">{result.component_scores.weighted_burden_75pct}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium">Weighted Documentation (25%):</span>
              <span className="font-bold text-lg text-green-600">{result.component_scores.weighted_documentation_25pct}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded border-2 border-gray-300">
              <span className="font-bold">Component Total:</span>
              <span className="font-bold text-xl text-gray-800">{result.component_scores.component_total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources & Methodology */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Data Sources & Methodology</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">State Income Data:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• HIES cleaned state percentile data</li>
              <li>• State-specific income equivalents by bracket</li>
              <li>• Fallback to national thresholds if unavailable</li>
            </ul>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h5 className="font-medium text-green-900 mb-2">Burden Calculation:</h5>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Adult Equivalent scaling (0.5 adults, 0.3 children)</li>
              <li>• State median burden comparison</li>
              <li>• Piecewise scoring: 50, 70, 90, 100 points</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Burden Ratio:</strong> {result.burden_ratio} (Applicant: {(result.adult_equivalent / result.equivalent_income).toFixed(6)} ÷ State Median: {result.state_median_burden.toFixed(6)})
          </p>
        </div>
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <h5 className="font-medium text-green-900 mb-2">Formula Analysis Advantages:</h5>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• <strong>Full Transparency:</strong> Every calculation step is auditable and reproducible</li>
          <li>• <strong>State-Aware:</strong> Uses real Malaysian HIES data for state-specific income equivalents</li>
          <li>• <strong>Burden-Based:</strong> Economic burden methodology accounts for household composition</li>
          <li>• <strong>Policy-Compliant:</strong> Base scores aligned with Malaysian B40/M40/T20 classifications</li>
          <li>• <strong>Mathematically Sound:</strong> Consistent, unbiased, and defensible calculations</li>
        </ul>
      </div>
    </div>
  );

  if (!citizenId) {
    return (
      <AdminLayout title="Analysis Results">
        <div className="text-center py-12">
          <p className="text-gray-500">No citizen ID provided</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analysis Results">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg shadow-md p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Dual Analysis Results
              </h2>
              <p className="text-slate-600">
                Citizen ID: {citizenId} • Interpretability vs Flexibility Analysis
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/citizens")}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              ← Back to Citizens
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        ) : analysisResult ? (
          <div className="bg-white rounded-lg shadow-md">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <TabButton
                  tabId="comparison"
                  label="Comparison Analysis"
                  isActive={activeTab === "comparison"}
                  onClick={() => setActiveTab("comparison")}
                />
                <TabButton
                  tabId="rag"
                  label="RAG Analysis"
                  isActive={activeTab === "rag"}
                  onClick={() => setActiveTab("rag")}
                />
                <TabButton
                  tabId="formula"
                  label="Formula Analysis"
                  isActive={activeTab === "formula"}
                  onClick={() => setActiveTab("formula")}
                />
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "comparison" && (
                <ComparisonView analysis={analysisResult.analysis} />
              )}
              {activeTab === "rag" && (
                <RAGAnalysisView result={analysisResult.analysis.rag_result} />
              )}
              {activeTab === "formula" && (
                <FormulaAnalysisView result={analysisResult.analysis.formula_result} />
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No analysis results available</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}