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

  // Sanitizes filename by removing/replacing invalid characters
  const sanitizeFilename = (filename: string): string => {
    // Remove or replace invalid characters with hyphens
    const sanitized = filename.replace(/[^a-zA-Z0-9-_.]/g, '-');
    
    // Remove multiple consecutive hyphens
    const cleaned = sanitized.replace(/-+/g, '-');
    
    // Remove leading/trailing hyphens
    const trimmed = cleaned.replace(/^-+|-+$/g, '');
    
    // Ensure filename isn't empty
    return trimmed || 'unnamed-file';
  };

  // Validates filename length and characters
  const validateFilename = (filename: string): { isValid: boolean; error?: string } => {
    // Check filename length (including extension)
    if (filename.length > 255) {
      return { isValid: false, error: 'Filename too long (max 255 characters)' };
    }
    
    if (filename.length < 1) {
      return { isValid: false, error: 'Filename cannot be empty' };
    }
    
    // Check for dangerous patterns
    const dangerousPatterns = [
      /^\./,          // Hidden files
      /\.\./, // Directory traversal
      /[<>:"|?*]/,    // Windows invalid chars
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(filename)) {
        return { isValid: false, error: 'Filename contains invalid characters' };
      }
    }
    
    // Check for control characters (0x00-0x1F) using charCodeAt to avoid regex linting issues
    for (let i = 0; i < filename.length; i++) {
      const charCode = filename.charCodeAt(i);
      if (charCode >= 0 && charCode <= 31) {
        return { isValid: false, error: 'Filename contains control characters' };
      }
    }
    
    return { isValid: true };
  };

  // Calculates MD5 hash of file content for duplicate detection
  const calculateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Checks if file already exists in storage by filename
  const checkFileExists = async (filename: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .list('', { search: filename });
      
      if (error) {
        console.error('Error checking file existence:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('File existence check failed:', error);
      return false;
    }
  };

  // Validates file types (PDF and DOCX only) and filenames
  const validateFiles = async (selectedFiles: File[]): Promise<File[]> => {
    const validFiles: File[] = [];
    const errors: string[] = [];
    const seenFilenames = new Set<string>();
    const seenHashes = new Set<string>();
    
    setUploadStatus('Checking for duplicate files...');
    
    for (const file of selectedFiles) {
      // Check file type
      const isValidType = file.type === 'application/pdf' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword';
      
      if (!isValidType) {
        errors.push(`${file.name}: Only PDF and DOCX files are allowed`);
        continue;
      }
      
      // Check filename
      const filenameValidation = validateFilename(file.name);
      if (!filenameValidation.isValid) {
        errors.push(`${file.name}: ${filenameValidation.error}`);
        continue;
      }
      
      // Check for duplicate filenames within selection
      const sanitizedFilename = sanitizeFilename(file.name);
      if (seenFilenames.has(sanitizedFilename)) {
        errors.push(`${file.name}: Duplicate filename in selection`);
        continue;
      }
      seenFilenames.add(sanitizedFilename);
      
      // Check for duplicate content within selection
      try {
        const fileHash = await calculateFileHash(file);
        if (seenHashes.has(fileHash)) {
          errors.push(`${file.name}: Duplicate file content detected`);
          continue;
        }
        seenHashes.add(fileHash);
      } catch (error) {
        console.error('Error calculating file hash:', error);
        errors.push(`${file.name}: Error checking file content`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (errors.length > 0) {
      setUploadStatus(errors.join('; '));
    } else if (validFiles.length !== selectedFiles.length) {
      setUploadStatus('Some files were filtered out.');
    }
    
    return validFiles;
  };

  // Adds files to the upload queue after validation
  const addFiles = async (newFiles: File[]) => {
    try {
      const validFiles = await validateFiles(newFiles);
      setFiles(prev => [...prev, ...validFiles]);
    } catch (error) {
      console.error('Error validating files:', error);
      setUploadStatus('Error validating files');
    }
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
      setUploadStatus('Checking for existing files and calculating content hashes...');
      
      // Get all existing files from storage to compare content
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('documents')
        .list('', { limit: 1000 });
      
      if (listError) {
        console.warn('Could not fetch existing files for content comparison:', listError);
      }
      
      // Check each file for duplicates (both filename and content)
      const fileCheckPromises = files.map(async (file) => {
        const sanitizedFilename = sanitizeFilename(file.name);
        const fileHash = await calculateFileHash(file);
        
        // Check filename duplicates
        const filenameExists = await checkFileExists(sanitizedFilename);
        
        // Check content duplicates by downloading and comparing hashes of existing files
        let contentExists = false;
        if (existingFiles && !filenameExists) {
          for (const existingFile of existingFiles) {
            try {
              // Download existing file and calculate its hash
              const { data: fileData } = await supabase.storage
                .from('documents')
                .download(existingFile.name);
              
              if (fileData) {
                const existingHash = await calculateFileHash(fileData as File);
                if (existingHash === fileHash) {
                  contentExists = true;
                  break;
                }
              }
            } catch (error) {
              // Silently continue if we can't download/check a file
              console.warn(`Could not check content of ${existingFile.name}:`, error);
            }
          }
        }
        
        return { 
          file, 
          sanitizedFilename, 
          fileHash,
          filenameExists, 
          contentExists,
          isDuplicate: filenameExists || contentExists
        };
      });
      
      const fileChecks = await Promise.all(fileCheckPromises);
      
      // Filter out files that already exist
      const duplicateFiles = fileChecks.filter(check => check.isDuplicate);
      const newFiles = fileChecks.filter(check => !check.isDuplicate);
      
      if (duplicateFiles.length > 0) {
        const duplicateNames = duplicateFiles.map(check => {
          const reason = check.filenameExists ? 'filename exists' : 'identical content exists';
          return `${check.file.name} (${reason})`;
        }).join(', ');
        
        if (newFiles.length === 0) {
          setUploadStatus(`Upload cancelled: All files are duplicates - ${duplicateNames}`);
          return [];
        } else {
          setUploadStatus(`Skipping duplicates: ${duplicateNames}. Uploading remaining ${newFiles.length} files...`);
        }
      }
      
      if (newFiles.length === 0) {
        setUploadStatus('No new files to upload');
        return [];
      }
      
      // Upload only new files with sanitized filename and timestamp prefix
      const uploadPromises = newFiles.map(async ({ file, sanitizedFilename }) => {
        const fileName = `${Date.now()}-${sanitizedFilename}`;
        
        console.log(`Uploading file: "${file.name}" -> "${fileName}"`);
        
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file);
        
        if (error) {
          console.error(`Upload error for "${file.name}":`, error);
          throw new Error(`Failed to upload "${file.name}": ${error.message}`);
        }
        
        return { fileName, originalName: file.name, path: data.path };
      });

      const results = await Promise.all(uploadPromises);
      
      let statusMessage = `Successfully uploaded ${results.length} files`;
      if (duplicateFiles.length > 0) {
        statusMessage += ` (${duplicateFiles.length} duplicates skipped)`;
      }
      
      setUploadStatus(statusMessage);
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