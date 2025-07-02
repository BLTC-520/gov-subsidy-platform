import { supabase } from './supabase';

// Storage bucket setup and management utilities
// Handles document storage for RAG processing

export const STORAGE_BUCKET = 'documents';

// Creates the documents bucket if it doesn't exist
// This function should be called during app initialization
export const initializeStorage = async () => {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      // Create bucket with public access for downloads
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: false, // Private bucket for security
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword'
        ],
        fileSizeLimit: 52428800 // 50MB limit
      });

      if (createError) {
        console.error('Error creating storage bucket:', createError);
        return false;
      }

      console.log('Documents storage bucket created successfully');
    }

    return true;
  } catch (error) {
    console.error('Storage initialization error:', error);
    return false;
  }
};

// Gets a signed URL for downloading a file
export const getFileUrl = async (filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting file URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
};

// Lists all uploaded documents
export const listDocuments = async () => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list();

    if (error) {
      console.error('Error listing documents:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error listing documents:', error);
    return [];
  }
};

// Deletes a document from storage
export const deleteDocument = async (filePath: string) => {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting document:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
};