import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UploadResult {
  fileName: string;
  originalName: string;
  path: string;
}

export const useFileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  // Checks if current user is admin by querying profiles table
  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        return false;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return false;
      }

      const adminStatus = profile?.is_admin || false;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.error('Admin check failed:', error);
      setIsAdmin(false);
      return false;
    }
  };

  // Validates file types (PDF and DOCX only)
  const validateFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    );
    
    if (validFiles.length !== selectedFiles.length) {
      setUploadStatus('Some files were filtered out. Only PDF and DOCX files are allowed.');
    }
    
    return validFiles;
  };

  // Adds files to the upload queue after validation
  const addFiles = (newFiles: File[]) => {
    const validFiles = validateFiles(newFiles);
    setFiles(prev => [...prev, ...validFiles]);
  };

  // Removes a file from the upload queue by index
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clears all files from the upload queue
  const clearFiles = () => {
    setFiles([]);
    setUploadStatus('');
  };

  // Uploads all files in the queue to Supabase storage
  const uploadFiles = async (): Promise<UploadResult[]> => {
    if (files.length === 0) {
      setUploadStatus('Please select files to upload');
      return [];
    }

    // Check admin status before upload
    if (isAdmin === null) {
      setUploadStatus('Checking permissions...');
      const adminCheck = await checkAdminStatus();
      if (!adminCheck) {
        setUploadStatus('Upload failed: Admin permissions required');
        return [];
      }
    } else if (!isAdmin) {
      setUploadStatus('Upload failed: Admin permissions required');
      return [];
    }

    setUploading(true);
    setUploadStatus('');
    
    try {
      // Upload each file with timestamp prefix to avoid naming conflicts
      const uploadPromises = files.map(async (file) => {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file);
        
        if (error) throw error;
        return { fileName, originalName: file.name, path: data.path };
      });

      const results = await Promise.all(uploadPromises);
      setUploadStatus(`Successfully uploaded ${results.length} files`);
      setFiles([]);
      return results;
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setUploadStatus(`Upload failed: ${errorMessage}`);
      return [];
    } finally {
      setUploading(false);
    }
  };

  return {
    files,
    uploading,
    uploadStatus,
    isAdmin,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    setUploadStatus,
    checkAdminStatus
  };
};