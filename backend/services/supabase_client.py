from supabase import create_client, Client
from typing import List, Dict, Any, Optional
import logging
from config.settings import settings

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )
        self.service_client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
    
    def get_citizen_profile(self, citizen_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch citizen profile from Supabase.
        
        Args:
            citizen_id: ID of the citizen
            
        Returns:
            Dictionary containing citizen profile data
        """
        try:
            response = self.service_client.table("profiles").select("*").eq("id", citizen_id).execute()
            
            if response.data:
                return response.data[0]
            else:
                logger.warning(f"No profile found for citizen {citizen_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching citizen profile: {str(e)}")
            return None
    
    def get_all_profiles(self) -> List[Dict[str, Any]]:
        """
        Fetch all citizen profiles from Supabase.
        
        Returns:
            List of citizen profile dictionaries
        """
        try:
            response = self.service_client.table("profiles").select("*").execute()
            return response.data if response.data else []
            
        except Exception as e:
            logger.error(f"Error fetching all profiles: {str(e)}")
            return []
    
    def update_citizen_score(self, citizen_id: str, eligibility_score: float, 
                           subsidy_amount: float, reasoning: str) -> bool:
        """
        Update citizen's eligibility score in Supabase.
        
        Args:
            citizen_id: ID of the citizen
            eligibility_score: Calculated eligibility score
            subsidy_amount: Calculated subsidy amount (not stored, just for logging)
            reasoning: Explanation of the scoring (not stored, just for logging)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            response = self.service_client.table("profiles").update({
                "eligibility_score": eligibility_score
            }).eq("id", citizen_id).execute()
            
            if response.data:
                logger.info(f"Updated score for citizen {citizen_id}: {eligibility_score} (subsidy: RM{subsidy_amount})")
                return True
            else:
                logger.error(f"Failed to update score for citizen {citizen_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating citizen score: {str(e)}")
            return False
    
    def get_uploaded_documents(self) -> List[Dict[str, Any]]:
        """
        Get list of all uploaded documents from Supabase Storage.
        
        Returns:
            List of document metadata
        """
        try:
            # List files in the documents bucket
            response = self.service_client.storage.from_("documents").list()
            
            documents = []
            for file_info in response:
                documents.append({
                    "filename": file_info["name"],
                    "size": file_info["metadata"]["size"],
                    "updated_at": file_info["updated_at"],
                    "content_type": file_info["metadata"]["mimetype"]
                })
            
            logger.info(f"Found {len(documents)} uploaded documents")
            return documents
            
        except Exception as e:
            logger.error(f"Error listing documents: {str(e)}")
            return []
    
    def download_document(self, filename: str) -> Optional[bytes]:
        """
        Download a document from Supabase Storage.
        
        Args:
            filename: Name of the file to download
            
        Returns:
            File content as bytes, or None if error
        """
        try:
            response = self.service_client.storage.from_("documents").download(filename)
            
            if response:
                logger.info(f"Downloaded document: {filename}")
                return response
            else:
                logger.error(f"Failed to download document: {filename}")
                return None
                
        except Exception as e:
            logger.error(f"Error downloading document {filename}: {str(e)}")
            return None
    
    def get_document_url(self, filename: str) -> Optional[str]:
        """
        Get public URL for a document in Supabase Storage.
        
        Args:
            filename: Name of the file
            
        Returns:
            Public URL or None if error
        """
        try:
            response = self.service_client.storage.from_("documents").get_public_url(filename)
            return response["publicURL"] if response else None
            
        except Exception as e:
            logger.error(f"Error getting document URL {filename}: {str(e)}")
            return None
    
    def export_scoring_results_to_csv(self) -> List[Dict[str, Any]]:
        """
        Export all scoring results for CSV generation.
        
        Returns:
            List of dictionaries suitable for CSV export
        """
        try:
            # Get all profiles with scores
            response = self.service_client.table("profiles").select(
                "id, email, wallet_address, eligibility_score, created_at"
            ).not_.is_("eligibility_score", "null").execute()
            
            csv_data = []
            for profile in response.data:
                # Calculate subsidy amount from eligibility score
                score = profile.get("eligibility_score", 0)
                if score >= 80:
                    subsidy_amount = 2000
                elif score >= 60:
                    subsidy_amount = 1500
                elif score >= 40:
                    subsidy_amount = 1000
                elif score >= 20:
                    subsidy_amount = 500
                else:
                    subsidy_amount = 0
                
                csv_data.append({
                    "citizen_id": profile["id"],
                    "email": profile["email"],
                    "wallet_address": profile.get("wallet_address", ""),
                    "eligibility_score": score,
                    "subsidy_amount": subsidy_amount,
                    "created_at": profile.get("created_at", "")
                })
            
            logger.info(f"Exported {len(csv_data)} scoring results")
            return csv_data
            
        except Exception as e:
            logger.error(f"Error exporting CSV data: {str(e)}")
            return []

# Create global service instance
supabase_service = SupabaseService()