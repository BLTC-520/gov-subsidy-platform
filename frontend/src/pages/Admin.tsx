import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/common/AdminLayout';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalCitizens: number;
  totalDocuments: number;
  totalAdmins: number;
  recentUploads: number;
}

// Main Admin Dashboard showing platform overview and statistics
// Displays citizen registration counts, document stats, and recent activity
// Central hub for admin navigation and system monitoring
export default function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalCitizens: 0,
    totalDocuments: 0,
    totalAdmins: 0,
    recentUploads: 0
  });
  const [loading, setLoading] = useState(true);

  // Load dashboard statistics on component mount
  useEffect(() => {
    loadDashboardStats();
  }, []);

  // Fetches platform statistics from Supabase
  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Debug: Check if RLS is blocking profile access
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*');
      
      console.log('All profiles visible to current user:', allProfiles);

      // Get citizens (is_admin = false, handling both boolean and string)
      const { data: citizens, count: citizenCount, error: citizenError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .or('is_admin.eq.false,is_admin.eq."false"');
      
      // Get admins (is_admin = true, handling both boolean and string)
      const { data: admins, count: adminCount, error: adminError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .or('is_admin.eq.true,is_admin.eq."true"');

      console.log('Citizens data:', citizens, 'Count:', citizenCount);
      console.log('Admins data:', admins, 'Count:', adminCount);

      // Get documents from storage
      const { data: documents, error: docsError } = await supabase.storage
        .from('documents')
        .list('', { limit: 1000 });

      if (citizenError) throw citizenError;
      if (adminError) throw adminError;
      if (docsError) throw docsError;

      const validDocuments = documents?.filter(file => 
        !file.name.startsWith('.') && 
        !file.name.includes('emptyFolderPlaceholder')
      ) || [];

      // Get recent uploads (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const recentUploads = validDocuments.filter(doc => 
        new Date(doc.created_at) > yesterday
      ).length;

      setStats({
        totalCitizens: citizenCount || 0,
        totalAdmins: adminCount || 0,
        totalDocuments: validDocuments.length,
        recentUploads
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stat card component for consistent styling
  const StatCard = ({ title, value, icon, color = "blue" }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color?: string;
  }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <div className={`text-${color}-600`}>{icon}</div>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '...' : value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome to Gov Subsidy Platform</h2>
          <p className="text-blue-100">
            AI-powered blockchain-based subsidy distribution system
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Citizens"
            value={stats.totalCitizens}
            color="green"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          <StatCard
            title="Total Admins"
            value={stats.totalAdmins}
            color="purple"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />

          <StatCard
            title="RAG Documents"
            value={stats.totalDocuments}
            color="blue"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />

          <StatCard
            title="Recent Uploads"
            value={stats.recentUploads}
            color="orange"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            }
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/admin/file-upload')}
              className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span className="text-blue-700 font-medium">Upload RAG Documents</span>
            </button>

            <button 
              onClick={() => navigate('/admin/batch-airdrop')}
              className="flex items-center justify-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            >
              <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-green-700 font-medium">Batch Airdrop</span>
            </button>

            <button 
              onClick={loadDashboardStats}
              disabled={loading}
              className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-gray-700 font-medium">
                {loading ? 'Refreshing...' : 'Refresh Stats'}
              </span>
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Supabase Connection</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✅ Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage Bucket</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✅ Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">AI Processing</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                🚧 In Development
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
