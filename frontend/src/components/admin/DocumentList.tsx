import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface DocumentFile {
  name: string;
  id: string;
  created_at: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

interface DocumentListProps {
  refreshTrigger?: number;
}

// Component displays list of uploaded documents from Supabase storage
// Shows file names, upload dates, and file sizes
// Refreshes automatically after uploads
export const DocumentList = ({ refreshTrigger }: DocumentListProps) => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

  // Load documents on component mount and when refresh trigger changes
  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  // Fetches list of documents from Supabase storage
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: listError } = await supabase.storage
        .from('documents')
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) {
        throw listError;
      }

      // Filter out Supabase system files and placeholders
      const validDocuments = data?.filter(file => 
        !file.name.startsWith('.') && 
        !file.name.includes('emptyFolderPlaceholder') &&
        !file.name.includes('.emptyFolderPlaceholder')
      ) || [];

      setDocuments(validDocuments);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Handles file selection for batch operations
  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(fileName)) {
        newSelected.delete(fileName);
      } else {
        newSelected.add(fileName);
      }
      return newSelected;
    });
  };

  // Selects or deselects all files
  const toggleSelectAll = () => {
    if (selectedFiles.size === documents.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(documents.map(doc => doc.name)));
    }
  };

  // Deletes multiple files in batch
  const batchDeleteFiles = async () => {
    if (selectedFiles.size === 0) return;

    const fileNames = Array.from(selectedFiles);
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${fileNames.length} file(s)? This action cannot be undone.\n\nFiles to delete:\n${fileNames.join('\n')}`
    );
    
    if (!confirmDelete) return;

    try {
      setBatchDeleteLoading(true);
      setError('');

      console.log('Attempting to delete files:', fileNames);
      
      const { data, error: deleteError } = await supabase.storage
        .from('documents')
        .remove(fileNames);

      console.log('Batch delete response:', { data, error: deleteError });

      if (deleteError) {
        console.error('Batch delete error details:', deleteError);
        throw deleteError;
      }

      // Clear selection and refresh the document list
      setSelectedFiles(new Set());
      await loadDocuments();
      
    } catch (err) {
      console.error('Error batch deleting documents:', err);
      setError(`Failed to delete selected files: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  // Deletes a single document from Supabase storage
  const deleteDocument = async (fileName: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`);
    
    if (!confirmDelete) return;

    try {
      setDeleteLoading(fileName);
      setError('');

      console.log('Attempting to delete file:', fileName);
      
      const { data, error: deleteError } = await supabase.storage
        .from('documents')
        .remove([fileName]);

      console.log('Delete response:', { data, error: deleteError });

      if (deleteError) {
        console.error('Delete error details:', deleteError);
        throw deleteError;
      }

      // Remove from selection if it was selected
      setSelectedFiles(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(fileName);
        return newSelected;
      });

      // Refresh the document list after successful deletion
      await loadDocuments();
      
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(`Failed to delete ${fileName}`);
    } finally {
      setDeleteLoading('');
    }
  };

  // Formats file size from bytes to readable format
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Formats upload date to readable format
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Gets file type icon based on file extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      return (
        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Uploaded Documents</h2>
        <div className="flex items-center space-x-3">
          {documents.length > 0 && (
            <>
              {selectedFiles.size > 0 && (
                <button
                  onClick={batchDeleteFiles}
                  disabled={batchDeleteLoading}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {batchDeleteLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l-3-2.647z"></path>
                      </svg>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Selected ({selectedFiles.size})</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={toggleSelectAll}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {selectedFiles.size === documents.length ? 'Deselect All' : 'Select All'}
              </button>
            </>
          )}
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>No documents uploaded yet</p>
          <p className="text-sm mt-1">Upload PDF or DOCX files to get started</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {documents.map((doc) => (
            <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
              selectedFiles.has(doc.name) 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <div className="flex items-center min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={selectedFiles.has(doc.name)}
                  onChange={() => toggleFileSelection(doc.name)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                />
                {getFileIcon(doc.name)}
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate" title={doc.name}>
                    {doc.name}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 space-x-2">
                    <span>{formatDate(doc.created_at)}</span>
                    {doc.metadata?.size && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(doc.metadata.size)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Uploaded
                </span>
                <button
                  onClick={() => deleteDocument(doc.name)}
                  disabled={deleteLoading === doc.name || batchDeleteLoading}
                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Delete ${doc.name}`}
                >
                  {deleteLoading === doc.name ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l-3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between items-center">
          <div>
            <p>Total documents: {documents.length}</p>
            <p>These files are available for RAG processing</p>
          </div>
          {selectedFiles.size > 0 && (
            <div className="text-blue-600 font-medium">
              {selectedFiles.size} file(s) selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
};