import { useState } from 'react';
import { AdminLayout } from '../components/common/AdminLayout';
import { FileUpload } from '../components/admin/FileUpload';
import { DocumentList } from '../components/admin/DocumentList';

// Dedicated page for RAG document upload and management
// Combines file upload functionality with document listing
// Accessible via admin dropdown navigation
export default function FileUploadPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to trigger document list refresh after successful uploads
  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <AdminLayout title="File Upload For RAG">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - File Upload */}
        <div className="space-y-6">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </div>
        
        {/* Right Side - Document List */}
        <div>
          <DocumentList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </AdminLayout>
  );
}