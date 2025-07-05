import React, { useRef } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';

interface FileUploadProps {
  onUploadSuccess?: () => void;
}

// Component handles drag-and-drop and click-to-upload functionality
// Uses custom hook for file management and upload logic
// Supports PDF and DOCX files only with visual feedback
export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    files,
    uploading,
    uploadStatus,
    isAdmin,
    addFiles,
    removeFile,
    uploadFiles
  } = useFileUpload();

  // Handles file selection from input or drag-and-drop
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    await addFiles(selectedFiles);
  };

  // Handles drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    await addFiles(droppedFiles);
  };

  // Triggers file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handles upload and resets input
  const handleUpload = async () => {
    const results = await uploadFiles();
    if (results.length > 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Trigger document list refresh
      onUploadSuccess?.();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Upload</h2>
      <p className="text-gray-600 mb-6">Upload PDF and DOCX files for RAG processing</p>
      
      {/* Drag and Drop Zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 hover:border-blue-400 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-blue-600 font-medium hover:text-blue-500">Click to upload files</span>
          <span className="text-gray-500"> or drag and drop</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-sm text-gray-500 mt-2">PDF, DOCX files only</p>
        </div>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium text-gray-700 mb-2">Selected Files ({files.length}):</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="Remove file"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0 || isAdmin === false}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </div>
        ) : isAdmin === null ? (
          'Checking permissions...'
        ) : isAdmin === false ? (
          'Admin permissions required'
        ) : (
          `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`
        )}
      </button>

      {/* Status Messages */}
      {uploadStatus && (
        <div className={`mt-4 p-3 rounded ${
          uploadStatus.includes('failed') || uploadStatus.includes('filtered') 
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          <div className="flex items-center">
            {uploadStatus.includes('failed') || uploadStatus.includes('filtered') ? (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {uploadStatus}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Upload Instructions</h3>
        <div className="space-y-1 text-sm text-blue-700">
          <p>• Supported formats: PDF (.pdf) and Word documents (.docx, .doc)</p>
          <p>• Files will be processed by the RAG system for citizen scoring</p>
          <p>• Maximum file size: 50MB per file</p>
          <p>• Multiple files can be uploaded simultaneously</p>
        </div>
      </div>
    </div>
  );
};