import pandas as pd
import csv
from typing import List, Dict, Any
import logging
from io import StringIO
from datetime import datetime
from services.supabase_client import supabase_service

logger = logging.getLogger(__name__)

class CSVExportService:
    def __init__(self):
        self.supabase_service = supabase_service
    
    def export_scoring_results(self) -> str:
        """
        Export all scoring results to CSV format.
        
        Returns:
            CSV content as string
        """
        try:
            # Get scoring data from Supabase
            scoring_data = self.supabase_service.export_scoring_results_to_csv()
            
            if not scoring_data:
                logger.warning("No scoring results found for export")
                return ""
            
            # Create CSV content
            output = StringIO()
            fieldnames = [
                'citizen_id',
                'email', 
                'wallet_address',
                'eligibility_score',
                'subsidy_amount',
                'last_scored_at',
                'export_date'
            ]
            
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for row in scoring_data:
                writer.writerow({
                    'citizen_id': row.get('citizen_id', ''),
                    'email': row.get('email', ''),
                    'wallet_address': row.get('wallet_address', ''),
                    'eligibility_score': row.get('eligibility_score', 0),
                    'subsidy_amount': row.get('subsidy_amount', 0),
                    'last_scored_at': row.get('last_scored_at', ''),
                    'export_date': datetime.now().isoformat()
                })
            
            csv_content = output.getvalue()
            output.close()
            
            logger.info(f"Exported {len(scoring_data)} scoring results to CSV")
            return csv_content
            
        except Exception as e:
            logger.error(f"Error exporting CSV: {str(e)}")
            return ""
    
    def export_eligible_citizens(self, min_score: float = 20.0) -> str:
        """
        Export only eligible citizens (above minimum score threshold).
        
        Args:
            min_score: Minimum eligibility score threshold
            
        Returns:
            CSV content as string
        """
        try:
            # Get all scoring data
            all_data = self.supabase_service.export_scoring_results_to_csv()
            
            # Filter eligible citizens
            eligible_data = [
                row for row in all_data 
                if row.get('eligibility_score', 0) >= min_score
            ]
            
            if not eligible_data:
                logger.warning(f"No eligible citizens found with score >= {min_score}")
                return ""
            
            # Create CSV content
            output = StringIO()
            fieldnames = [
                'citizen_id',
                'email',
                'wallet_address',
                'eligibility_score',
                'subsidy_amount',
                'last_scored_at'
            ]
            
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for row in eligible_data:
                writer.writerow({
                    'citizen_id': row.get('citizen_id', ''),
                    'email': row.get('email', ''),
                    'wallet_address': row.get('wallet_address', ''),
                    'eligibility_score': row.get('eligibility_score', 0),
                    'subsidy_amount': row.get('subsidy_amount', 0),
                    'last_scored_at': row.get('last_scored_at', '')
                })
            
            csv_content = output.getvalue()
            output.close()
            
            logger.info(f"Exported {len(eligible_data)} eligible citizens to CSV")
            return csv_content
            
        except Exception as e:
            logger.error(f"Error exporting eligible citizens CSV: {str(e)}")
            return ""
    
    def export_statistics_summary(self) -> str:
        """
        Export statistics summary of scoring results.
        
        Returns:
            CSV content with statistics
        """
        try:
            # Get all scoring data
            all_data = self.supabase_service.export_scoring_results_to_csv()
            
            if not all_data:
                return ""
            
            # Calculate statistics
            scores = [row.get('eligibility_score', 0) for row in all_data]
            amounts = [row.get('subsidy_amount', 0) for row in all_data]
            
            stats = {
                'total_citizens': len(all_data),
                'eligible_citizens': len([s for s in scores if s >= 20]),
                'average_score': sum(scores) / len(scores),
                'median_score': sorted(scores)[len(scores) // 2],
                'max_score': max(scores),
                'min_score': min(scores),
                'total_subsidy_amount': sum(amounts),
                'average_subsidy': sum(amounts) / len(amounts),
                'citizens_with_wallet': len([row for row in all_data if row.get('wallet_address')]),
                'export_date': datetime.now().isoformat()
            }
            
            # Create CSV content
            output = StringIO()
            fieldnames = ['metric', 'value']
            
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for metric, value in stats.items():
                writer.writerow({
                    'metric': metric,
                    'value': value
                })
            
            csv_content = output.getvalue()
            output.close()
            
            logger.info("Exported statistics summary to CSV")
            return csv_content
            
        except Exception as e:
            logger.error(f"Error exporting statistics CSV: {str(e)}")
            return ""

# Create global service instance
csv_export_service = CSVExportService()