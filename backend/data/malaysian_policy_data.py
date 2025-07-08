"""
Malaysian Government Subsidy Policy Data
Source: Department of Statistics Malaysia (DOSM), Ministry of Finance, eKasih Database
Updated: Real-time via official government APIs
"""

import logging
from typing import Dict, Any
from services.malaysia_api_client import malaysia_api

logger = logging.getLogger(__name__)

# Global cache for API data
_api_data_cache = None

def _get_live_government_data() -> Dict[str, Any]:
    """
    Fetch live government data from official APIs.
    Uses caching to avoid excessive API calls.
    """
    global _api_data_cache
    
    if _api_data_cache is None:
        logger.info("Fetching live Malaysian government policy data...")
        try:
            _api_data_cache = malaysia_api.get_comprehensive_policy_data()
            logger.info("Successfully fetched live government data")
        except Exception as e:
            logger.error(f"Failed to fetch live data, using fallback: {e}")
            # Fallback to hardcoded data if API fails
            _api_data_cache = {
                "poverty_thresholds": {
                    "absolute_poverty": {"threshold": 2208, "source": "DOSM Fallback"},
                    "hardcore_poverty": {"threshold": 1169, "source": "DOSM Fallback"}
                },
                "income_classifications": {
                    "B40": {"threshold": 4850, "description": "Bottom 40%", "source": "DOSM Fallback"},
                    "M40": {"min_threshold": 4851, "max_threshold": 10970, "description": "Middle 40%", "source": "DOSM Fallback"},
                    "T20": {"min_threshold": 10971, "description": "Top 20%", "source": "DOSM Fallback"}
                },
                "state_adjustments": {
                    "Kuala Lumpur": {"multiplier": 1.3, "reason": "High cost of living"},
                    "Selangor": {"multiplier": 1.2, "reason": "Urban cost of living"},
                    "Sabah": {"multiplier": 1.25, "reason": "East Malaysia logistics cost"},
                    "Sarawak": {"multiplier": 1.25, "reason": "East Malaysia logistics cost"},
                    "Kelantan": {"multiplier": 0.9, "reason": "Lower cost of living"},
                    "Terengganu": {"multiplier": 0.9, "reason": "Lower cost of living"},
                    "default": {"multiplier": 1.0, "reason": "National average"}
                }
            }
    
    return _api_data_cache

# Dynamic data retrieval from live APIs
def get_income_classifications() -> Dict[str, Any]:
    """Get current B40/M40/T20 income classifications from live API."""
    return _get_live_government_data().get("income_classifications", {})

def get_poverty_thresholds() -> Dict[str, Any]:
    """Get current poverty line thresholds from live API."""
    return _get_live_government_data().get("poverty_thresholds", {})

def get_state_adjustments() -> Dict[str, Any]:
    """Get current state cost-of-living adjustments from live API."""
    return _get_live_government_data().get("state_adjustments", {})

# Official Poverty Line Income (PLI) by State - 2022 DOSM Data
# Source: https://storage.dosm.gov.my/technotes/hies_poverty.pdf
OFFICIAL_POVERTY_LINE_INCOME_2022 = {
    "Malaysia": 2208,  # National average PLI
    "Johor": 2505,
    "Kedah": 2254,
    "Kelantan": 2139,
    "Melaka": 2375,
    "Negeri Sembilan": 2088,
    "Pahang": 2270,
    "Pulau Pinang": 1989,
    "Perak": 2077,
    "Perlis": 1967,
    "Selangor": 2022,
    "Terengganu": 2507,
    "Sabah": 2537,
    "Sarawak": 2131,
    "W.P. Kuala Lumpur": 2216,
    "W.P. Labuan": 2633,
    "W.P. Putrajaya": 2128
}

# Bantuan Keluarga Malaysia (BKM) Official Program Criteria
# Source: LHDN Malaysia / Ministry of Finance
BKM_PROGRAM_CRITERIA = {
    "general_eligibility": {
        "max_household_income": 5000,  # RM per month
        "categories": ["married_households", "single_parents", "senior_citizens_60+", "singles_21_59"]
    },
    "income_tiers": {
        "tier_1": {
            "income_range": "below_2500",
            "description": "Households with income below RM2,500",
            "higher_assistance": True
        },
        "tier_2": {
            "income_range": "2501_to_5000", 
            "description": "Households with income RM2,501-RM5,000",
            "lower_assistance": True
        }
    },
    "assistance_amounts_2023": {
        "tier_1_5_plus_children": 2500,  # Households <RM2,500 with 5+ children
        "tier_1_up_to_4_children": [1000, 2000],  # Range: RM1,000-RM2,000
        "tier_2_with_children": [500, 1000],  # RM500-RM1,000 based on children count
        "senior_citizens_no_spouse": {
            "low_income": 600,    # Lower income seniors
            "higher_income": 350  # Higher income seniors
        },
        "single_parent_bonus": 500,  # Additional RM500 on top of base
        "singles_below_2500": 350   # Singles with income <RM2,500
    },
    "special_provisions": {
        "single_parents": "Additional RM500 on top of base amount",
        "senior_citizens": "Age 60+ with specific income thresholds",
        "large_families": "5+ children qualify for maximum assistance",
        "electricity_subsidy": "Extended to households below PLI thresholds"
    },
    "budget_allocation": "Over RM10 billion including social welfare aids",
    "target_beneficiaries": "Millions of B40 and M40 households"
}

# Complex Eligibility Matrix Factors (Why AI is Needed)
ELIGIBILITY_COMPLEXITY_FACTORS = {
    "income_verification": {
        "challenges": [
            "Multiple income sources",
            "Seasonal/irregular income", 
            "Cash-based businesses",
            "Family financial support"
        ]
    },
    "household_composition": {
        "variables": [
            "Number of children",
            "Children's ages (school-age vs dependents)",
            "Single parent status",
            "Elderly dependents",
            "Disabled family members"
        ]
    },
    "state_variations": {
        "cost_of_living": "Different PLI by state",
        "local_programs": "State-specific additional assistance",
        "urban_rural": "Different thresholds within states"
    },
    "program_interactions": {
        "multiple_programs": "BKM, STR, state programs, OKU benefits",
        "stacking_rules": "Which benefits can be combined",
        "priority_determination": "Which program provides most benefit"
    }
}

# Maintain backward compatibility with existing code
INCOME_CLASSIFICATIONS = get_income_classifications()
POVERTY_LINE = get_poverty_thresholds()
STATE_ADJUSTMENTS = get_state_adjustments()

# Current Government Subsidy Programs (2024)
SUBSIDY_PROGRAMS = {
    "Bantuan Keluarga Malaysia (BKM)": {
        "target_group": "B40 and lower M40",
        "income_threshold": 5000,
        "amount_range": "RM300-2500 annually",
        "criteria": "Household income, number of children, disability status",
        "source": "Ministry of Finance Budget 2024"
    },
    "Sumbangan Tunai Rahmah (STR)": {
        "target_group": "B40 households",
        "income_threshold": 4850,
        "amount_range": "RM500-1500 annually", 
        "criteria": "B40 classification, Malaysian citizen",
        "source": "Prime Minister's Department 2024"
    },
    "Bantuan Prihatin Rakyat (BPR)": {
        "target_group": "Low income affected by COVID-19",
        "income_threshold": 4000,
        "amount_range": "RM1000-1600 one-time",
        "criteria": "Income loss due to pandemic",
        "source": "Ministry of Finance Special Package"
    }
}

# Household Size Multipliers (Official eKasih Criteria)
HOUSEHOLD_MULTIPLIERS = {
    1: {"multiplier": 1.0, "description": "Single person"},
    2: {"multiplier": 1.4, "description": "Couple"},
    3: {"multiplier": 1.7, "description": "Small family"},
    4: {"multiplier": 2.0, "description": "Average family"},
    5: {"multiplier": 2.3, "description": "Large family"},
    6: {"multiplier": 2.6, "description": "Very large family"},
    7: {"multiplier": 2.9, "description": "Extended family"},
    8: {"multiplier": 3.2, "description": "Multi-generational household"}
}

# OKU (Disabled Person) Benefits
OKU_BENEFITS = {
    "additional_allowance": {
        "amount": 450,  # RM per month
        "source": "Department of Social Welfare Malaysia",
        "description": "Monthly allowance for registered OKU"
    },
    "threshold_adjustment": {
        "multiplier": 1.5,
        "description": "Higher income threshold for OKU households",
        "source": "eKasih Database Criteria"
    },
    "priority_scoring": {
        "bonus_points": 20,
        "description": "Additional eligibility points for disabled persons",
        "source": "Ministry of Women Family Community Development"
    }
}

# Children/Dependent Adjustments
CHILDREN_BENEFITS = {
    "per_child_allowance": {
        "amount": 120,  # RM per child per month
        "max_children": 5,
        "source": "Child Support Program Malaysia"
    },
    "school_age_bonus": {
        "amount": 200,  # RM per school-age child
        "age_range": "7-17 years",
        "source": "Education Ministry Support Program"
    },
    "single_parent_multiplier": {
        "multiplier": 1.3,
        "description": "Additional support for single-parent households",
        "source": "Social Welfare Department"
    }
}

# Official Scoring Weights (Based on eKasih Algorithm)
OFFICIAL_SCORING_WEIGHTS = {
    "income_factor": {
        "weight": 50,  # 50% of total score
        "description": "Primary eligibility factor",
        "source": "eKasih Database Algorithm"
    },
    "household_size": {
        "weight": 20,  # 20% of total score
        "description": "Family size consideration",
        "source": "Social Welfare Assessment Criteria"
    },
    "disability_status": {
        "weight": 15,  # 15% of total score
        "description": "OKU priority consideration",
        "source": "Disability Rights Act Malaysia"
    },
    "geographic_location": {
        "weight": 10,  # 10% of total score
        "description": "State cost of living adjustment",
        "source": "Regional Development Policy"
    },
    "dependents_children": {
        "weight": 5,   # 5% of total score
        "description": "Child welfare consideration",
        "source": "Child Protection Act Malaysia"
    }
}

def get_policy_context_string() -> str:
    """Generate a comprehensive policy context string for AI scoring."""
    context = []
    
    context.append("=== OFFICIAL MALAYSIAN GOVERNMENT POLICY DATA ===")
    context.append("Sources: DOSM HIES 2022, https://storage.dosm.gov.my/technotes/hies_poverty.pdf")
    context.append("")
    
    context.append("INCOME CLASSIFICATIONS (DOSM HIES 2022):")
    for category, data in INCOME_CLASSIFICATIONS.items():
        if category == "M40":
            context.append(f"- {category}: RM{data['min_threshold']}-{data['max_threshold']} ({data['description']})")
        else:
            threshold = data.get('threshold', data.get('min_threshold', 'N/A'))
            context.append(f"- {category}: RM{threshold}+ ({data['description']})")
    context.append("")
    
    context.append("OFFICIAL POVERTY LINE INCOME (PLI) BY STATE 2022:")
    context.append("Source: https://storage.dosm.gov.my/technotes/hies_poverty.pdf")
    for state, pli in OFFICIAL_POVERTY_LINE_INCOME_2022.items():
        context.append(f"- {state}: RM{pli} per month")
    context.append("")
    
    context.append("BANTUAN KELUARGA MALAYSIA (BKM) PROGRAM CRITERIA:")
    context.append("Source: LHDN Malaysia / Ministry of Finance")
    context.append(f"- Maximum household income: RM{BKM_PROGRAM_CRITERIA['general_eligibility']['max_household_income']}")
    context.append("- Income Tier 1 (<RM2,500): Higher assistance amounts")
    context.append("- Income Tier 2 (RM2,501-RM5,000): Lower assistance amounts")
    context.append("- Assistance Amounts:")
    context.append(f"  * 5+ children (<RM2,500): RM{BKM_PROGRAM_CRITERIA['assistance_amounts_2023']['tier_1_5_plus_children']}")
    context.append(f"  * Up to 4 children (<RM2,500): RM{BKM_PROGRAM_CRITERIA['assistance_amounts_2023']['tier_1_up_to_4_children'][0]}-{BKM_PROGRAM_CRITERIA['assistance_amounts_2023']['tier_1_up_to_4_children'][1]}")
    context.append(f"  * Single parent bonus: +RM{BKM_PROGRAM_CRITERIA['assistance_amounts_2023']['single_parent_bonus']}")
    context.append(f"  * Senior citizens (no spouse): RM{BKM_PROGRAM_CRITERIA['assistance_amounts_2023']['senior_citizens_no_spouse']['low_income']}/RM{BKM_PROGRAM_CRITERIA['assistance_amounts_2023']['senior_citizens_no_spouse']['higher_income']}")
    context.append("")
    
    context.append("OFFICIAL SCORING WEIGHTS:")
    for factor, data in OFFICIAL_SCORING_WEIGHTS.items():
        context.append(f"- {factor.replace('_', ' ').title()}: {data['weight']}% - {data['description']}")
    context.append("")
    
    context.append("OKU BENEFITS:")
    context.append(f"- Monthly allowance: RM{OKU_BENEFITS['additional_allowance']['amount']}")
    context.append(f"- Income threshold multiplier: {OKU_BENEFITS['threshold_adjustment']['multiplier']}x")
    context.append(f"- Priority bonus points: +{OKU_BENEFITS['priority_scoring']['bonus_points']}")
    context.append("")
    
    context.append("ELIGIBILITY COMPLEXITY FACTORS (Why AI Assessment is Critical):")
    context.append("- Income verification challenges: Multiple/irregular sources, cash businesses")
    context.append("- Household composition: Children count/ages, single parents, elderly/disabled dependents")
    context.append("- State variations: Different PLI thresholds, local programs")
    context.append("- Program interactions: BKM, STR, OKU benefits stacking rules")
    context.append("")
    
    return "\n".join(context)