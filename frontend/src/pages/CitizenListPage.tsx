import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AdminLayout } from "../components/common/AdminLayout";
import { useAppSettings } from "../hooks/useAppSettings";

interface Citizen {
  id: string;
  email: string;
  full_name: string | null;
  nric: string | null;
  monthly_income: number | null;
  income_bracket: string | null;
  state: string | null;
  eligibility_score: number | null;
  wallet_address: string | null;
  created_at: string;
}


export default function CitizenListPage() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [csvGenerating, setCsvGenerating] = useState(false);
  const [csvCopied, setCsvCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [incomeFilter, setIncomeFilter] = useState("");
  const [sortField, setSortField] = useState<keyof Citizen>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const loadCitizens = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("is_admin", false);

      // Apply search filter
      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,nric.ilike.%${searchTerm}%`
        );
      }

      // Apply state filter
      if (stateFilter) {
        query = query.eq("state", stateFilter);
      }

      // Apply income bracket filter
      if (incomeFilter) {
        // Convert display format (e.g., "M40-M2") to backend format (e.g., "M2")
        let backendFilter = incomeFilter;
        const match = incomeFilter.match(/^([BMT])40-\1(\d)$/);
        if (match) {
          backendFilter = match[1] + match[2]; // "M40-M2" → "M2"
        }
        query = query.eq("income_bracket", backendFilter);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === "asc" });

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setCitizens(data || []);
      setTotalCount(count || 0);
    } catch {
      setError("Failed to load citizens");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchTerm,
    stateFilter,
    incomeFilter,
    sortField,
    sortDirection,
    itemsPerPage,
  ]);

  useEffect(() => {
    loadCitizens();
  }, [loadCitizens]);

  const handleAnalyze = async (citizenId: string) => {
    // Navigate directly to the analysis results page for dual-analysis demonstration
    navigate(`/admin/analysis-results/${citizenId}`);
  };

  const generateEligibilityCSV = async () => {
    setCsvGenerating(true);
    setCsvCopied(false);

    try {
      // Fetch all eligible citizens (no pagination, no search filters)
      const { data: eligibleCitizens, error: fetchError } = await supabase
        .from("profiles")
        .select("wallet_address, eligibility_score")
        .eq("is_admin", false)
        .gte("eligibility_score", settings.eligibility_threshold)
        .not("wallet_address", "is", null);

      if (fetchError) {
        throw fetchError;
      }

      if (!eligibleCitizens || eligibleCitizens.length === 0) {
        alert("No eligible citizens found with wallet addresses");
        return;
      }

      // Generate CSV content
      const csvHeader = "address,amount";
      const csvRows = eligibleCitizens.map(
        (citizen) => `${citizen.wallet_address},${settings.allocation_amount}`
      );
      const csvContent = [csvHeader, ...csvRows].join("\n");

      // Copy to clipboard
      await navigator.clipboard.writeText(csvContent);
      setCsvCopied(true);

      // Auto-hide the copied message after 3 seconds
      setTimeout(() => setCsvCopied(false), 3000);

    } catch (err) {
      console.error("Error generating CSV:", err);
      alert("Failed to generate CSV. Please try again.");
    } finally {
      setCsvGenerating(false);
    }
  };

  const handleCopyJson = async (citizen: Citizen) => {
    try {
      // Extract birthday from NRIC (format: YYMMDD-PB-####)
      const extractBirthdayFromNric = (nric: string | null) => {
        if (!nric) return null;
        const nricParts = nric.split('-');
        if (nricParts.length >= 1 && nricParts[0].length === 6) {
          const yymmdd = nricParts[0];
          const yy = parseInt(yymmdd.substring(0, 2));
          const mm = yymmdd.substring(2, 4);
          const dd = yymmdd.substring(4, 6);
          // Assume years 00-30 are 2000s, 31-99 are 1900s
          const yyyy = yy <= 30 ? 2000 + yy : 1900 + yy;
          return `${yyyy}-${mm}-${dd}`;
        }
        return null;
      };

      // Create agent input format matching the expected schema
      const agentInput = {
        citizen_id: citizen.id,
        citizen_data: {
          email: citizen.email,
          full_name: citizen.full_name,
          nric: citizen.nric,
          birthday: extractBirthdayFromNric(citizen.nric),
          monthly_income: citizen.monthly_income,
          income_bracket: citizen.income_bracket,
          state: citizen.state,
          household_number: 4, // Default value - you can adjust this
          number_of_child: 2, // Default value - you can adjust this
          is_signature_valid: true, // Default value - you can adjust this
          is_data_authentic: true // Default value - you can adjust this
        }
      };

      const jsonString = JSON.stringify(agentInput, null, 2);
      await navigator.clipboard.writeText(jsonString);

      setJsonCopied(citizen.id);
      setTimeout(() => setJsonCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy JSON:", err);
      alert("Failed to copy JSON. Please try again.");
    }
  };


  const handleSort = (field: keyof Citizen) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getAnalysisStatus = (citizen: Citizen) => {
    if (citizen.eligibility_score !== null) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          Score: {citizen.eligibility_score}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
        Not Analyzed
      </span>
    );
  };

  const formatIncomeBracket = (
    _income: number | null,
    bracket: string | null
  ) => {
    if (!bracket) return "Not specified";

    // Handle backend format (e.g., "M2") and convert to display format (e.g., "M40-M2")
    if (bracket.match(/^[BMT]\d$/)) {
      const category = bracket[0]; // B, M, or T
      const number = bracket[1]; // 1, 2, 3, 4

      if (category === "B") return `B40-B${number}`;
      if (category === "M") return `M40-M${number}`;
      if (category === "T") return `T20-T${number}`;
    }

    // If already in correct format or unknown format, return as-is
    return bracket;
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const SortIcon = ({ field }: { field: keyof Citizen }) => {
    if (sortField !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    return sortDirection === "asc" ? (
      <svg
        className="w-4 h-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  return (
    <AdminLayout title="Citizen Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg shadow-md p-6 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Citizen List
          </h2>
          <p className="text-slate-600">
            Manage and analyze citizen eligibility for subsidies
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Name, email, or NRIC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All States</option>
                <option value="Johor">Johor</option>
                <option value="Kedah">Kedah</option>
                <option value="Kelantan">Kelantan</option>
                <option value="Melaka">Melaka</option>
                <option value="Negeri Sembilan">Negeri Sembilan</option>
                <option value="Pahang">Pahang</option>
                <option value="Pulau Pinang">Pulau Pinang</option>
                <option value="Perak">Perak</option>
                <option value="Perlis">Perlis</option>
                <option value="Sabah">Sabah</option>
                <option value="Sarawak">Sarawak</option>
                <option value="Selangor">Selangor</option>
                <option value="Terengganu">Terengganu</option>
                <option value="Kuala Lumpur">Kuala Lumpur</option>
                <option value="Labuan">Labuan</option>
                <option value="Putrajaya">Putrajaya</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income Bracket
              </label>
              <select
                value={incomeFilter}
                onChange={(e) => setIncomeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Brackets</option>
                <option value="B40-B1">B40-B1</option>
                <option value="B40-B2">B40-B2</option>
                <option value="B40-B3">B40-B3</option>
                <option value="B40-B4">B40-B4</option>
                <option value="M40-M1">M40-M1</option>
                <option value="M40-M2">M40-M2</option>
                <option value="M40-M3">M40-M3</option>
                <option value="M40-M4">M40-M4</option>
                <option value="T20-T1">T20-T1</option>
                <option value="T20-T2">T20-T2</option>
              </select>
            </div>

            <div className="flex items-end space-x-3">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStateFilter("");
                  setIncomeFilter("");
                  setCurrentPage(1);
                }}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Clear Filters
              </button>
              <button
                onClick={generateEligibilityCSV}
                disabled={csvGenerating}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {csvGenerating ? "Generating..." : csvCopied ? "Copied!" : "Generate CSV"}
              </button>
            </div>
          </div>
        </div>

        {/* Citizens Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("full_name")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Name</span>
                          <SortIcon field="full_name" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("nric")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>NRIC</span>
                          <SortIcon field="nric" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("income_bracket")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Income Bracket</span>
                          <SortIcon field="income_bracket" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("state")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>State</span>
                          <SortIcon field="state" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Analysis Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {citizens.map((citizen) => (
                      <tr key={citizen.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {citizen.full_name || "No name provided"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {citizen.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {citizen.nric || "Not provided"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatIncomeBracket(
                            citizen.monthly_income,
                            citizen.income_bracket
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {citizen.state || "Not specified"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getAnalysisStatus(citizen)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAnalyze(citizen.id)}
                              className="bg-slate-700 text-white px-3 py-1 rounded-md text-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                            >
                              Analyze
                            </button>
                            <button
                              onClick={() => handleCopyJson(citizen)}
                              className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              title="Copy JSON for agent testing"
                            >
                              {jsonCopied === citizen.id ? "Copied!" : "Copy JSON"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {(currentPage - 1) * itemsPerPage + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, totalCount)}
                      </span>{" "}
                      of <span className="font-medium">{totalCount}</span>{" "}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}

                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
