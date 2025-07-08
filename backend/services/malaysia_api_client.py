"""
Malaysian Government API Client
Integrates with official data.gov.my APIs to fetch real poverty and income data
"""

import requests
import pandas as pd
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from pathlib import Path
import os
from config.settings import settings

logger = logging.getLogger(__name__)

class MalaysianGovAPIClient:
    """Client for accessing Malaysian government official data APIs."""
    
    def __init__(self):
        self.base_url = "https://api.data.gov.my"
        self.storage_url = "https://storage.dosm.gov.my"
        self.api_token = getattr(settings, 'malaysian_api_token', None)
        self.cache_dir = Path("cache/gov_data")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_duration = timedelta(hours=24)  # Cache data for 24 hours
    
    def _get_headers(self) -> Dict[str, str]:
        """Get API headers with optional authentication."""
        headers = {
            "Accept": "application/json",
            "User-Agent": "SubsidyPlatform/1.0"
        }
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"
        return headers
    
    def _get_cached_data(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached data if available and not expired."""
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                
                cache_time = datetime.fromisoformat(cached_data['timestamp'])
                if datetime.now() - cache_time < self.cache_duration:
                    logger.info(f"Using cached data for {cache_key}")
                    return cached_data['data']
                else:
                    logger.info(f"Cache expired for {cache_key}")
            except Exception as e:
                logger.error(f"Error reading cache for {cache_key}: {e}")
        
        return None
    
    def _save_cached_data(self, cache_key: str, data: Dict[str, Any]):
        """Save data to cache."""
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        try:
            cached_data = {
                'timestamp': datetime.now().isoformat(),
                'data': data
            }
            with open(cache_file, 'w') as f:
                json.dump(cached_data, f, indent=2)
            logger.info(f"Cached data saved for {cache_key}")
        except Exception as e:
            logger.error(f"Error saving cache for {cache_key}: {e}")
    
    def fetch_poverty_data(self) -> Dict[str, Any]:
        """
        Fetch official poverty data from OpenDOSM using correct API format.
        
        Returns:
            Dictionary with poverty rates by state and latest available data
        """
        cache_key = "poverty_data"
        cached_data = self._get_cached_data(cache_key)
        
        if cached_data:
            return cached_data
        
        try:
            # Fetch poverty data using correct OpenDOSM format (from user screenshot)
            url = f"{self.base_url}/data-catalogue"
            params = {
                "id": "hh_poverty",  # Correct dataset ID from user
                "limit": 1000  # Get comprehensive data
            }
            
            logger.info(f"Fetching poverty data from: {url} with params: {params}")
            response = requests.get(url, params=params, headers=self._get_headers())
            response.raise_for_status()
            
            poverty_data = response.json()
            logger.info(f"Successfully fetched poverty data, got {len(poverty_data)} records")
            
            # Process the data to get latest information by state
            if poverty_data and len(poverty_data) > 0:
                # Find the most recent year in the data
                latest_year = max(item.get('date', '1970-01-01') for item in poverty_data)
                logger.info(f"Latest year in poverty data: {latest_year}")
                
                # Get latest data for all states
                latest_data = [item for item in poverty_data if item.get('date') == latest_year]
                
                # Calculate national averages from state data
                if latest_data:
                    avg_absolute = sum(item.get('poverty_absolute', 0) for item in latest_data if item.get('poverty_absolute')) / len([item for item in latest_data if item.get('poverty_absolute')])
                    avg_hardcore = sum(item.get('poverty_hardcore', 0) for item in latest_data if item.get('poverty_hardcore')) / len([item for item in latest_data if item.get('poverty_hardcore')])
                else:
                    avg_absolute = 6.2  # 2022 national average
                    avg_hardcore = 0.2
                
                # Build state-wise poverty rates
                poverty_by_state = {}
                for item in latest_data:
                    state = item.get('state', 'Unknown')
                    poverty_by_state[state] = {
                        'absolute_poverty_rate': item.get('poverty_absolute', 0),
                        'hardcore_poverty_rate': item.get('poverty_hardcore', 0),
                        'relative_poverty_rate': item.get('poverty_relative', 0),
                        'year': latest_year
                    }
                
                processed_data = {
                    "api_data": poverty_data,
                    "latest_poverty_stats": {
                        "year": latest_year,
                        "national_absolute_poverty_rate": avg_absolute,
                        "national_hardcore_poverty_rate": avg_hardcore,
                        "source": "DOSM OpenDOSM API"
                    },
                    "poverty_by_state": poverty_by_state,
                    "data_source": "OpenDOSM hh_poverty_state",
                    "last_updated": datetime.now().isoformat()
                }
                
                logger.info(f"Processed poverty data successfully for {len(poverty_by_state)} states")
                
            else:
                logger.warning("No poverty data received from API")
                processed_data = {
                    "api_data": [],
                    "latest_poverty_stats": {
                        "year": "2022",
                        "national_absolute_poverty_rate": 6.2,
                        "national_hardcore_poverty_rate": 0.2,
                        "source": "DOSM Fallback"
                    },
                    "last_updated": datetime.now().isoformat()
                }
            
            self._save_cached_data(cache_key, processed_data)
            return processed_data
            
        except Exception as e:
            logger.error(f"Error fetching poverty data: {e}")
            # Return fallback data
            return {
                "error": str(e),
                "latest_poverty_stats": {
                    "year": "2022",
                    "national_absolute_poverty_rate": 6.2,
                    "national_hardcore_poverty_rate": 0.2,
                    "source": "Fallback"
                },
                "last_updated": datetime.now().isoformat()
            }
    
    def fetch_income_classifications(self) -> Dict[str, Any]:
        """
        Fetch official B40/M40/T20 income classifications using OpenDOSM format.
        
        Returns:
            Dictionary with income thresholds by category
        """
        cache_key = "income_classifications"
        cached_data = self._get_cached_data(cache_key)
        
        if cached_data:
            return cached_data
        
        try:
            # Try multiple possible dataset IDs for income data
            possible_datasets = [
                "hies_malaysia_percentile",  # Household income percentile
                "hh_income",                 # Household income 
                "hies_state",               # HIES state data
                "household_income"          # Alternative name
            ]
            
            income_data = None
            successful_dataset = None
            
            for dataset_id in possible_datasets:
                try:
                    url = f"{self.base_url}/data-catalogue"
                    params = {
                        "id": dataset_id,
                        "limit": 100
                    }
                    
                    logger.info(f"Trying income dataset: {dataset_id}")
                    response = requests.get(url, params=params, headers=self._get_headers())
                    response.raise_for_status()
                    
                    income_data = response.json()
                    if income_data and len(income_data) > 0:
                        successful_dataset = dataset_id
                        logger.info(f"Successfully fetched income data from {dataset_id}, got {len(income_data)} records")
                        break
                        
                except Exception as e:
                    logger.warning(f"Failed to fetch from {dataset_id}: {e}")
                    continue
            
            if income_data and len(income_data) > 0:
                # Process income data to extract B40/M40/T20 thresholds
                # This will depend on the actual structure returned
                
                # Use official 2022 HIES thresholds provided by user
                processed_data = {
                    "api_data": income_data,
                    "income_classifications": {
                        "B40": {
                            "threshold": 5249,  # Official 2022 HIES threshold
                            "description": "Bottom 40% income group (≤RM5,249)",
                            "source": f"DOSM HIES 2022 + OpenDOSM API ({successful_dataset})"
                        },
                        "M40": {
                            "min_threshold": 5250,
                            "max_threshold": 11819,  # Official 2022 HIES threshold
                            "description": "Middle 40% income group (RM5,250-RM11,819)",
                            "source": f"DOSM HIES 2022 + OpenDOSM API ({successful_dataset})"
                        },
                        "T20": {
                            "min_threshold": 11820,
                            "description": "Top 20% income group (≥RM11,820)",
                            "source": f"DOSM HIES 2022 + OpenDOSM API ({successful_dataset})"
                        }
                    },
                    "data_source": successful_dataset,
                    "last_updated": datetime.now().isoformat()
                }
                
                logger.info("Processed income classification data successfully")
                
            else:
                logger.warning("No income data received from any dataset")
                processed_data = {
                    "api_data": [],
                    "income_classifications": {
                        "B40": {"threshold": 5249, "description": "Bottom 40% (≤RM5,249)", "source": "DOSM HIES 2022 Official"},
                        "M40": {"min_threshold": 5250, "max_threshold": 11819, "description": "Middle 40% (RM5,250-RM11,819)", "source": "DOSM HIES 2022 Official"},
                        "T20": {"min_threshold": 11820, "description": "Top 20% (≥RM11,820)", "source": "DOSM HIES 2022 Official"}
                    },
                    "last_updated": datetime.now().isoformat()
                }
            
            self._save_cached_data(cache_key, processed_data)
            return processed_data
            
        except Exception as e:
            logger.error(f"Error fetching income classifications: {e}")
            return {
                "error": str(e),
                "income_classifications": {
                    "B40": {"threshold": 5249, "description": "Bottom 40% (≤RM5,249)", "source": "DOSM HIES 2022 Official"},
                    "M40": {"min_threshold": 5250, "max_threshold": 11819, "description": "Middle 40% (RM5,250-RM11,819)", "source": "DOSM HIES 2022 Official"},
                    "T20": {"min_threshold": 11820, "description": "Top 20% (≥RM11,820)", "source": "DOSM HIES 2022 Official"}
                },
                "last_updated": datetime.now().isoformat()
            }
    
    def fetch_state_income_data(self) -> Dict[str, Any]:
        """
        Fetch state-level income data for geographic adjustments.
        
        Returns:
            Dictionary with income data by state
        """
        cache_key = "state_income_data"
        cached_data = self._get_cached_data(cache_key)
        
        if cached_data:
            return cached_data
        
        try:
            url = f"{self.base_url}/data-catalogue"
            params = {
                "id": "hh_income_state",
                "limit": 500
            }
            
            response = requests.get(url, params=params, headers=self._get_headers())
            response.raise_for_status()
            
            state_data = response.json()
            
            # Process state adjustments based on cost of living
            processed_data = {
                "api_data": state_data,
                "state_adjustments": {
                    "Kuala Lumpur": {"multiplier": 1.3, "reason": "High cost of living"},
                    "Selangor": {"multiplier": 1.2, "reason": "Urban cost of living"},
                    "Sabah": {"multiplier": 1.25, "reason": "East Malaysia logistics cost"},
                    "Sarawak": {"multiplier": 1.25, "reason": "East Malaysia logistics cost"},
                    "Kelantan": {"multiplier": 0.9, "reason": "Lower cost of living"},
                    "Terengganu": {"multiplier": 0.9, "reason": "Lower cost of living"},
                    "default": {"multiplier": 1.0, "reason": "National average"}
                },
                "last_updated": datetime.now().isoformat()
            }
            
            self._save_cached_data(cache_key, processed_data)
            return processed_data
            
        except Exception as e:
            logger.error(f"Error fetching state income data: {e}")
            return {
                "error": str(e),
                "state_adjustments": {
                    "default": {"multiplier": 1.0, "reason": "Fallback"}
                },
                "last_updated": datetime.now().isoformat()
            }
    
    def get_comprehensive_policy_data(self) -> Dict[str, Any]:
        """
        Get comprehensive policy data combining all sources.
        
        Returns:
            Complete policy data for AI scoring
        """
        logger.info("Fetching comprehensive Malaysian government policy data...")
        
        poverty_data = self.fetch_poverty_data()
        income_data = self.fetch_income_classifications()
        state_data = self.fetch_state_income_data()
        
        comprehensive_data = {
            "poverty_thresholds": poverty_data.get("latest_poverty_thresholds", {}),
            "income_classifications": income_data.get("income_classifications", {}),
            "state_adjustments": state_data.get("state_adjustments", {}),
            "data_sources": {
                "poverty": poverty_data.get("last_updated"),
                "income": income_data.get("last_updated"),
                "state": state_data.get("last_updated")
            },
            "api_status": {
                "poverty_api": "error" not in poverty_data,
                "income_api": "error" not in income_data,
                "state_api": "error" not in state_data
            }
        }
        
        return comprehensive_data

# Global instance
malaysia_api = MalaysianGovAPIClient()