"""
CitizenDataValidationTool - Comprehensive citizen data validation for eligibility analysis.

This tool implements a hybrid validation approach:
- ☆☆☆ Rule-based validation for B40 eligibility (100% confidence)
- ★★☆ LLM-guided validation for edge cases (lower confidence)

Follows design patterns from spec/design.md lines 637-695.
"""

from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from dataclasses import dataclass

from smolagents import Tool


@dataclass
class ValidationResult:
    """Structured validation result for audit trail and decision making"""
    category: str
    valid: bool
    confidence: float
    reasoning: str
    missing_fields: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    requires_llm_review: bool = False


class CitizenDataValidationTool(Tool):
    """
    Validates citizen data against eligibility requirements with hybrid confidence levels.
    
    Architecture Level:
    - ☆☆☆ Simple Processor: B40 eligibility (rule-based, 100% confidence)  
    - ★★☆ Tool Level: Non-B40 cases (LLM guidance needed, lower confidence)
    
    Requirements Addressed:
    - Requirement 1.1: Accept and validate data format
    - Requirement 5.1: Clear validation error messages
    - Requirement 6.1: Audit trail logging
    """
    
    name = "citizen_data_validator"
    description = "Validates citizen data format, completeness, and eligibility criteria with confidence scoring"
    output_type = "object"  # Required by smolagents Tool class
    
    inputs = {
        "citizen_data": {
            "type": "object", 
            "description": "Citizen demographic and financial data for validation"
        },
        "validation_type": {
            "type": "string", 
            "description": "Validation scope: 'format', 'completeness', 'eligibility', or 'all'",
            "nullable": True
        },
        "strict_mode": {
            "type": "boolean", 
            "description": "If true, applies strict validation rules with higher confidence thresholds",
            "nullable": True
        }
    }
    
    outputs = {
        "overall_valid": {"type": "boolean", "description": "Overall validation result"},
        "confidence_score": {"type": "number", "description": "Confidence in validation result (0.0-1.0)"},
        "validation_details": {"type": "object", "description": "Detailed validation results by category"},
        "recommendations": {"type": "array", "description": "List of recommendations for data improvement"},
        "audit_trail": {"type": "object", "description": "Audit information for compliance tracking"},
        "requires_manual_review": {"type": "boolean", "description": "Whether manual/LLM review is recommended"}
    }
    
    def __init__(self, enable_audit_logging: bool = True):
        """Initialize validation tool with audit logging capability"""
        super().__init__()
        self.enable_audit_logging = enable_audit_logging
        self.logger = logging.getLogger(__name__)
        
        # ☆☆☆ Rule-based configuration (100% confidence)
        self.required_fields = [
            "citizen_id", "income_bracket", "state", "age", "residency_duration_months"
        ]
        
        self.eligible_income_brackets_high_confidence = ["B40"]  # Only B40 gets 100% confidence
        self.all_known_brackets = ["B40", "M40", "T20", "M40-M1", "M40-M2"]  # Known but lower confidence
        
        self.min_age = 18
        self.max_age = 65
        self.min_residency_months = 6
        
        # Validation statistics for audit trail
        self.validation_stats = {
            "total_validations": 0,
            "high_confidence_validations": 0,
            "manual_review_required": 0
        }
    
    def forward(
        self, 
        citizen_data: Dict[str, Any], 
        validation_type: str = "all",
        strict_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Main validation method implementing hybrid confidence approach.
        
        Args:
            citizen_data: Dictionary containing citizen information
            validation_type: Scope of validation to perform
            strict_mode: Whether to apply stricter validation rules
            
        Returns:
            Comprehensive validation result with confidence scoring
        """
        validation_start_time = datetime.now()
        self.validation_stats["total_validations"] += 1
        
        try:
            validation_results = {}
            
            # Perform requested validation types
            if validation_type in ["format", "all"]:
                validation_results["format"] = self._validate_format(citizen_data)
                
            if validation_type in ["completeness", "all"]:
                validation_results["completeness"] = self._validate_completeness(citizen_data)
                
            if validation_type in ["eligibility", "all"]:
                validation_results["eligibility"] = self._validate_eligibility(citizen_data, strict_mode)
            
            # Calculate overall confidence and validity
            overall_result = self._calculate_overall_result(validation_results)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(validation_results, citizen_data)
            
            # Create audit trail
            audit_trail = self._create_audit_trail(
                citizen_data, validation_type, validation_results, 
                validation_start_time, strict_mode
            )
            
            # Determine if manual review is needed
            requires_manual_review = any(
                result.requires_llm_review for result in validation_results.values()
            ) or overall_result["confidence_score"] < 0.8
            
            if requires_manual_review:
                self.validation_stats["manual_review_required"] += 1
            else:
                self.validation_stats["high_confidence_validations"] += 1
            
            return {
                "overall_valid": overall_result["valid"],
                "confidence_score": overall_result["confidence_score"],
                "validation_details": {
                    category: {
                        "valid": result.valid,
                        "confidence": result.confidence,
                        "reasoning": result.reasoning,
                        "missing_fields": result.missing_fields,
                        "recommendations": result.recommendations,
                        "requires_llm_review": result.requires_llm_review
                    }
                    for category, result in validation_results.items()
                },
                "recommendations": recommendations,
                "audit_trail": audit_trail,
                "requires_manual_review": requires_manual_review
            }
            
        except Exception as e:
            self.logger.error(f"Validation error: {str(e)}")
            return self._create_error_response(str(e), validation_start_time)
    
    def _validate_format(self, citizen_data: Dict[str, Any]) -> ValidationResult:
        """
        ☆☆☆ Simple Processor Level: Rule-based format validation (100% confidence)
        """
        missing_fields = []
        invalid_types = []
        
        # Check required fields presence
        for field in self.required_fields:
            if field not in citizen_data or citizen_data[field] is None:
                missing_fields.append(field)
        
        # Check data types for present fields
        type_checks = {
            "citizen_id": (str, "string"),
            "age": (int, "integer"),
            "residency_duration_months": (int, "integer"),
            "income_bracket": (str, "string"),
            "state": (str, "string")
        }
        
        for field, (expected_type, type_name) in type_checks.items():
            if field in citizen_data and not isinstance(citizen_data[field], expected_type):
                invalid_types.append(f"{field} must be {type_name}")
        
        # Format validation has 100% confidence (pure rule-based)
        is_valid = len(missing_fields) == 0 and len(invalid_types) == 0
        
        reasoning_parts = []
        if missing_fields:
            reasoning_parts.append(f"Missing required fields: {', '.join(missing_fields)}")
        if invalid_types:
            reasoning_parts.append(f"Type errors: {', '.join(invalid_types)}")
        if is_valid:
            reasoning_parts.append("All required fields present with correct types")
        
        return ValidationResult(
            category="format",
            valid=is_valid,
            confidence=1.0,  # 100% confidence in rule-based format checking
            reasoning=" | ".join(reasoning_parts),
            missing_fields=missing_fields if missing_fields else None,
            requires_llm_review=False  # Format validation is deterministic
        )
    
    def _validate_completeness(self, citizen_data: Dict[str, Any]) -> ValidationResult:
        """
        ☆☆☆ Simple Processor Level: Rule-based completeness validation
        """
        optional_beneficial_fields = [
            "employment_status", "family_size", "monthly_income", 
            "has_disability", "education_level", "marital_status"
        ]
        
        present_optional_fields = [
            field for field in optional_beneficial_fields 
            if field in citizen_data and citizen_data[field] is not None
        ]
        
        completeness_score = len(present_optional_fields) / len(optional_beneficial_fields)
        
        # High completeness = high confidence
        confidence = 0.7 + (completeness_score * 0.3)  # 0.7-1.0 range
        is_valid = completeness_score >= 0.5  # At least 50% of optional fields
        
        reasoning = f"Data completeness: {completeness_score:.1%} ({len(present_optional_fields)}/{len(optional_beneficial_fields)} beneficial fields present)"
        
        recommendations = []
        missing_beneficial = [
            field for field in optional_beneficial_fields
            if field not in present_optional_fields
        ]
        if missing_beneficial:
            recommendations.append(f"Consider collecting: {', '.join(missing_beneficial[:3])}")  # Top 3
        
        return ValidationResult(
            category="completeness",
            valid=is_valid,
            confidence=confidence,
            reasoning=reasoning,
            recommendations=recommendations,
            requires_llm_review=completeness_score < 0.3  # Very incomplete data needs review
        )
    
    def _validate_eligibility(self, citizen_data: Dict[str, Any], strict_mode: bool = False) -> ValidationResult:
        """
        Hybrid validation: ☆☆☆ for B40, ★★☆ for others
        
        Based on design.md requirement: Only B40 gets 100% confidence
        """
        income_bracket = citizen_data.get("income_bracket", "").upper()
        age = citizen_data.get("age", 0)
        residency_months = citizen_data.get("residency_duration_months", 0)
        
        # ☆☆☆ Rule-based validation for B40 (100% confidence)
        if income_bracket == "B40":
            age_eligible = self.min_age <= age <= self.max_age
            residency_eligible = residency_months >= self.min_residency_months
            
            is_valid = age_eligible and residency_eligible
            
            reasoning_parts = [
                f"Income bracket: B40 (eligible with high confidence)",
                f"Age: {age} ({'eligible' if age_eligible else 'not eligible'} - requires {self.min_age}-{self.max_age})",
                f"Residency: {residency_months} months ({'eligible' if residency_eligible else 'not eligible'} - requires {self.min_residency_months}+ months)"
            ]
            
            return ValidationResult(
                category="eligibility", 
                valid=is_valid,
                confidence=1.0,  # 100% confidence for B40 rule-based validation
                reasoning=" | ".join(reasoning_parts),
                requires_llm_review=False  # B40 is deterministic
            )
        
        # ★★☆ LLM-guided validation needed for non-B40 cases
        elif income_bracket in self.all_known_brackets:
            # Known bracket but not B40 - needs LLM guidance for policy interpretation
            confidence = 0.6 if strict_mode else 0.4  # Lower confidence, needs manual review
            
            reasoning = (
                f"Income bracket: {income_bracket} (known bracket but requires LLM analysis for eligibility determination). "
                f"Current policy focus on B40 bracket. Age: {age}, Residency: {residency_months} months."
            )
            
            return ValidationResult(
                category="eligibility",
                valid=False,  # Conservative: assume ineligible until LLM review
                confidence=confidence,
                reasoning=reasoning,
                requires_llm_review=True,  # Non-B40 needs LLM guidance
                recommendations=[
                    f"LLM analysis required for {income_bracket} bracket eligibility",
                    "Review latest policy documents for non-B40 eligibility criteria"
                ]
            )
        
        # Unknown or invalid income bracket
        else:
            return ValidationResult(
                category="eligibility",
                valid=False,
                confidence=0.2,  # Very low confidence
                reasoning=f"Unknown income bracket: '{income_bracket}'. Expected one of: {', '.join(self.all_known_brackets)}",
                requires_llm_review=True,
                recommendations=[
                    "Verify and correct income bracket classification",
                    "Check for data entry errors or new bracket definitions"
                ]
            )
    
    def _calculate_overall_result(self, validation_results: Dict[str, ValidationResult]) -> Dict[str, Any]:
        """Calculate weighted overall validation result"""
        if not validation_results:
            return {"valid": False, "confidence_score": 0.0}
        
        # Weight different validation categories
        weights = {
            "format": 0.4,        # Format is critical
            "eligibility": 0.4,   # Eligibility is critical  
            "completeness": 0.2   # Completeness is helpful but not blocking
        }
        
        total_weight = 0.0
        weighted_confidence = 0.0
        all_valid = True
        
        for category, result in validation_results.items():
            weight = weights.get(category, 0.1)  # Default weight for unknown categories
            total_weight += weight
            weighted_confidence += result.confidence * weight
            
            if not result.valid and category in ["format", "eligibility"]:  # Critical categories
                all_valid = False
        
        # Normalize confidence score
        final_confidence = weighted_confidence / total_weight if total_weight > 0 else 0.0
        
        return {
            "valid": all_valid,
            "confidence_score": round(final_confidence, 3)
        }
    
    def _generate_recommendations(
        self, 
        validation_results: Dict[str, ValidationResult], 
        citizen_data: Dict[str, Any]
    ) -> List[str]:
        """Generate actionable recommendations based on validation results"""
        recommendations = []
        
        for result in validation_results.values():
            if result.recommendations:
                recommendations.extend(result.recommendations)
        
        # Add high-level recommendations
        overall_confidence = self._calculate_overall_result(validation_results)["confidence_score"]
        
        if overall_confidence < 0.5:
            recommendations.append("Consider manual review due to low confidence score")
        
        if any(result.requires_llm_review for result in validation_results.values()):
            recommendations.append("LLM-guided analysis recommended for complete assessment")
        
        return list(set(recommendations))  # Remove duplicates
    
    def _create_audit_trail(
        self, 
        citizen_data: Dict[str, Any], 
        validation_type: str,
        validation_results: Dict[str, ValidationResult],
        start_time: datetime,
        strict_mode: bool
    ) -> Dict[str, Any]:
        """Create audit trail for compliance and debugging"""
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # Log characteristics without sensitive data (Requirement 6.1)
        data_characteristics = {
            "total_fields": len(citizen_data),
            "required_fields_present": sum(
                1 for field in self.required_fields 
                if field in citizen_data and citizen_data[field] is not None
            ),
            "income_bracket": citizen_data.get("income_bracket", "unknown"),
            "has_age": "age" in citizen_data,
            "has_residency_info": "residency_duration_months" in citizen_data
        }
        
        return {
            "timestamp": datetime.now().isoformat(),
            "validation_type": validation_type,
            "strict_mode": strict_mode,
            "execution_time_seconds": execution_time,
            "data_characteristics": data_characteristics,
            "validation_categories_processed": list(validation_results.keys()),
            "overall_confidence": self._calculate_overall_result(validation_results)["confidence_score"],
            "tool_version": "1.0.0",
            "validation_stats": self.validation_stats.copy()
        }
    
    def _create_error_response(self, error_message: str, start_time: datetime) -> Dict[str, Any]:
        """Create standardized error response"""
        execution_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "overall_valid": False,
            "confidence_score": 0.0,
            "validation_details": {},
            "recommendations": ["Fix validation error before proceeding"],
            "audit_trail": {
                "timestamp": datetime.now().isoformat(),
                "execution_time_seconds": execution_time,
                "error": error_message,
                "tool_version": "1.0.0"
            },
            "requires_manual_review": True,
            "error": error_message
        }
    
    def get_validation_statistics(self) -> Dict[str, Any]:
        """Get validation statistics for monitoring and optimization"""
        return {
            "validation_stats": self.validation_stats.copy(),
            "high_confidence_rate": (
                self.validation_stats["high_confidence_validations"] / 
                max(1, self.validation_stats["total_validations"])
            ),
            "manual_review_rate": (
                self.validation_stats["manual_review_required"] / 
                max(1, self.validation_stats["total_validations"])
            )
        }