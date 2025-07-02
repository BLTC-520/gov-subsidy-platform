import { useState } from 'react';
import { AdminLayout } from '../components/common/AdminLayout';
import { FileUpload } from '../components/admin/FileUpload';
import { DocumentList } from '../components/admin/DocumentList';

// Main Admin page that composes modular components
// Uses AdminLayout for consistent styling and navigation
// FileUpload component handles document upload for RAG processing
// DocumentList shows uploaded files on the right side
export default function Admin() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to trigger document list refresh after successful uploads
  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - File Upload */}
        <div className="space-y-6">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
          
          {/* Future components will go here */}
          {/* <ScoreMatrix /> */}
          {/* <CitizenDataUpload /> */}
        </div>
        
        {/* Right Side - Document List */}
        <div>
          <DocumentList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </AdminLayout>
  );
}
