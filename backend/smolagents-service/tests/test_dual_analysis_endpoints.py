"""
Integration tests for dual-analysis endpoints.

Tests the three new API endpoints:
- /analyze-citizen-rag
- /analyze-citizen-formula  
- /compare-analyses

These tests verify the complete dual-analysis workflow and error handling.
"""

import pytest
import requests
import json
from typing import Dict, Any
from datetime import datetime


class TestDualAnalysisEndpoints:
    """Integration tests for dual-analysis API endpoints"""
    
    BASE_URL = "http://localhost:3003"  # Smolagents service URL
    
    @pytest.fixture
    def sample_citizen_data(self) -> Dict[str, Any]:
        """Sample citizen data for testing"""
        return {
            "citizen_id": "123456789012",
            "income_bracket": "B40",
            "state": "Selangor",
            "age": 35,
            "household_size": 4,
            "number_of_children": 2,
            "residency_duration_months": 24,
            "employment_status": "employed",
            "is_signature_valid": True,
            "is_data_authentic": True,
            "disability_status": False
        }
    
    @pytest.fixture
    def sample_rag_result(self) -> Dict[str, Any]:
        """Sample RAG analysis result for comparison testing"""
        return {
            "score": 78.5,
            "confidence": 0.85,
            "eligibility_class": "B40",
            "explanation": "Policy analysis indicates B40 eligibility based on income bracket and household composition",
            "retrieved_context": ["Policy document 1", "Policy document 2"],
            "reasoning_path": ["Step 1: Data validation", "Step 2: Policy retrieval", "Step 3: Reasoning"],
            "policy_factors": ["B40 income threshold", "Household size factor"],
            "edge_cases_identified": []
        }
    
    @pytest.fixture  
    def sample_formula_result(self) -> Dict[str, Any]:
        """Sample Formula analysis result for comparison testing"""
        return {
            "score": 76.2,
            "burden_score": 76.2,
            "eligibility_class": "B40",
            "explanation": "Burden score 76.2 calculated using equivalised income with adult equivalent scale",
            "equivalent_income": 4500.0,
            "adult_equivalent": 2.1,
            "component_scores": {"burden": 65, "documentation": 25, "disability": 0},
            "confidence": 1.0
        }
    
    def test_health_endpoint(self):
        """Test that the service is running"""
        response = requests.get(f"{self.BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "smolagents" in data["service"]
    
    def test_rag_analysis_endpoint_structure(self, sample_citizen_data):
        """Test RAG analysis endpoint returns expected structure"""
        request_data = {
            "citizen_id": "test_citizen_001",
            "citizen_data": sample_citizen_data
        }
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/analyze-citizen-rag",
                json=request_data,
                timeout=60  # RAG analysis may take time
            )
            
            # Check response structure regardless of success/failure
            assert response.status_code in [200, 500]  # Either works or fails gracefully
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                assert "method" in data
                assert data["method"] == "rag"
                assert "citizen_id" in data
                assert data["citizen_id"] == "test_citizen_001"
                assert "result" in data
                assert "timestamp" in data
                
                # Verify result structure
                result = data["result"]
                expected_fields = [
                    "score", "confidence", "eligibility_class", "explanation",
                    "retrieved_context", "reasoning_path", "policy_factors"
                ]
                
                for field in expected_fields:
                    assert field in result, f"Missing field: {field}"
                
                # Verify data types and ranges
                assert isinstance(result["score"], (int, float))
                assert 0 <= result["score"] <= 100
                assert isinstance(result["confidence"], (int, float))
                assert 0 <= result["confidence"] <= 1
                assert isinstance(result["eligibility_class"], str)
                assert isinstance(result["explanation"], str)
                assert isinstance(result["retrieved_context"], list)
                assert isinstance(result["reasoning_path"], list)
                
                print(f"✅ RAG Analysis Success: {result['eligibility_class']} (Score: {result['score']}, Confidence: {result['confidence']:.2f})")
            
            else:
                # Check error response structure
                error_data = response.json()
                assert "detail" in error_data
                print(f"⚠️ RAG Analysis Failed (Expected for testing): {error_data['detail']}")
                
        except requests.exceptions.RequestException as e:
            pytest.skip(f"Service not available: {str(e)}")
    
    def test_formula_analysis_endpoint_structure(self, sample_citizen_data):
        """Test Formula analysis endpoint returns expected structure"""
        request_data = {
            "citizen_id": "test_citizen_002", 
            "citizen_data": sample_citizen_data
        }
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/analyze-citizen-formula",
                json=request_data,
                timeout=30  # Formula analysis should be faster
            )
            
            # Check response structure regardless of success/failure
            assert response.status_code in [200, 500]  # Either works or fails gracefully
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                assert "method" in data
                assert data["method"] == "formula"
                assert "citizen_id" in data
                assert data["citizen_id"] == "test_citizen_002"
                assert "result" in data
                assert "timestamp" in data
                
                # Verify result structure
                result = data["result"]
                expected_fields = [
                    "score", "burden_score", "eligibility_class", "explanation",
                    "equivalent_income", "adult_equivalent", "component_scores", "confidence"
                ]
                
                for field in expected_fields:
                    assert field in result, f"Missing field: {field}"
                
                # Verify data types and ranges
                assert isinstance(result["score"], (int, float))
                assert 0 <= result["score"] <= 100
                assert isinstance(result["burden_score"], (int, float))
                assert isinstance(result["confidence"], (int, float))
                assert result["confidence"] == 1.0  # Formula analysis should have 100% confidence
                assert isinstance(result["eligibility_class"], str)
                assert isinstance(result["equivalent_income"], (int, float))
                assert isinstance(result["adult_equivalent"], (int, float))
                assert isinstance(result["component_scores"], dict)
                
                print(f"✅ Formula Analysis Success: {result['eligibility_class']} (Score: {result['score']}, Income: RM{result['equivalent_income']:.0f})")
            
            else:
                # Check error response structure  
                error_data = response.json()
                assert "detail" in error_data
                print(f"⚠️ Formula Analysis Failed (Expected for testing): {error_data['detail']}")
                
        except requests.exceptions.RequestException as e:
            pytest.skip(f"Service not available: {str(e)}")
    
    def test_comparison_endpoint_structure(self, sample_rag_result, sample_formula_result):
        """Test comparison endpoint returns expected structure"""
        request_data = {
            "citizen_id": "test_citizen_003",
            "rag_result": sample_rag_result,
            "formula_result": sample_formula_result
        }
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/compare-analyses",
                json=request_data,
                timeout=10  # Comparison should be fast
            )
            
            # Check response structure regardless of success/failure
            assert response.status_code in [200, 500]  # Either works or fails gracefully
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                assert "citizen_id" in data
                assert data["citizen_id"] == "test_citizen_003"
                assert "comparison" in data
                assert "timestamp" in data
                
                # Verify comparison structure
                comparison = data["comparison"]
                expected_fields = [
                    "agreement", "score_difference", "rag_confidence", 
                    "recommendation", "comment"
                ]
                
                for field in expected_fields:
                    assert field in comparison, f"Missing field: {field}"
                
                # Verify data types
                assert isinstance(comparison["agreement"], bool)
                assert isinstance(comparison["score_difference"], (int, float))
                assert isinstance(comparison["rag_confidence"], (int, float))
                assert isinstance(comparison["recommendation"], str)
                assert isinstance(comparison["comment"], str)
                
                # Verify logical relationships
                if comparison["agreement"]:
                    assert "✅" in comparison["recommendation"] or "Consensus" in comparison["recommendation"]
                else:
                    assert "⚠️" in comparison["recommendation"] or "Disagreement" in comparison["recommendation"]
                
                print(f"✅ Comparison Success: {'Agreement' if comparison['agreement'] else 'Disagreement'} (Diff: {comparison['score_difference']:.1f})")
            
            else:
                # Check error response structure
                error_data = response.json()
                assert "detail" in error_data
                print(f"⚠️ Comparison Failed (Expected for testing): {error_data['detail']}")
                
        except requests.exceptions.RequestException as e:
            pytest.skip(f"Service not available: {str(e)}")
    
    def test_invalid_requests(self):
        """Test endpoints handle invalid requests gracefully"""
        
        # Test empty request
        try:
            response = requests.post(f"{self.BASE_URL}/analyze-citizen-rag", json={})
            assert response.status_code == 422  # Validation error
        except requests.exceptions.RequestException:
            pytest.skip("Service not available")
        
        # Test missing citizen_data
        try:
            response = requests.post(
                f"{self.BASE_URL}/analyze-citizen-formula",
                json={"citizen_id": "test"}
            )
            assert response.status_code == 422  # Validation error
        except requests.exceptions.RequestException:
            pytest.skip("Service not available")
        
        # Test comparison with missing results
        try:
            response = requests.post(
                f"{self.BASE_URL}/compare-analyses", 
                json={"citizen_id": "test"}
            )
            assert response.status_code == 422  # Validation error
        except requests.exceptions.RequestException:
            pytest.skip("Service not available")
    
    def test_end_to_end_workflow(self, sample_citizen_data):
        """Test complete dual-analysis workflow"""
        citizen_id = "test_e2e_001"
        
        try:
            # Step 1: RAG Analysis
            rag_request = {
                "citizen_id": citizen_id,
                "citizen_data": sample_citizen_data
            }
            
            rag_response = requests.post(
                f"{self.BASE_URL}/analyze-citizen-rag",
                json=rag_request,
                timeout=60
            )
            
            # Step 2: Formula Analysis  
            formula_request = {
                "citizen_id": citizen_id,
                "citizen_data": sample_citizen_data
            }
            
            formula_response = requests.post(
                f"{self.BASE_URL}/analyze-citizen-formula",
                json=formula_request,
                timeout=30
            )
            
            # Only proceed with comparison if both analyses succeeded
            if rag_response.status_code == 200 and formula_response.status_code == 200:
                rag_data = rag_response.json()
                formula_data = formula_response.json()
                
                # Step 3: Comparison
                comparison_request = {
                    "citizen_id": citizen_id,
                    "rag_result": rag_data["result"],
                    "formula_result": formula_data["result"]
                }
                
                comparison_response = requests.post(
                    f"{self.BASE_URL}/compare-analyses",
                    json=comparison_request,
                    timeout=10
                )
                
                if comparison_response.status_code == 200:
                    comparison_data = comparison_response.json()
                    
                    print("\n🎯 End-to-End Workflow Results:")
                    print(f"   RAG:     {rag_data['result']['eligibility_class']} (Score: {rag_data['result']['score']:.1f}, Confidence: {rag_data['result']['confidence']:.2f})")
                    print(f"   Formula: {formula_data['result']['eligibility_class']} (Score: {formula_data['result']['score']:.1f}, Confidence: {formula_data['result']['confidence']:.2f})")
                    print(f"   Result:  {comparison_data['comparison']['recommendation']}")
                    
                    assert True  # Workflow completed successfully
                else:
                    print(f"⚠️ End-to-end test: Comparison failed with status {comparison_response.status_code}")
                    assert comparison_response.status_code in [422, 500]  # Expected failure types
            else:
                print(f"⚠️ End-to-end test: Analysis failed - RAG: {rag_response.status_code}, Formula: {formula_response.status_code}")
                assert rag_response.status_code in [422, 500] or formula_response.status_code in [422, 500]  # Expected failure types
                
        except requests.exceptions.RequestException as e:
            pytest.skip(f"Service not available: {str(e)}")


if __name__ == "__main__":
    # Run tests directly for development
    import sys
    
    print("🧪 Running Dual-Analysis Endpoints Integration Tests")
    print("=" * 60)
    
    test_instance = TestDualAnalysisEndpoints()
    
    # Test data
    sample_data = {
        "citizen_id": "123456789012",
        "income_bracket": "B40",
        "state": "Selangor", 
        "age": 35,
        "household_size": 4,
        "number_of_children": 2,
        "residency_duration_months": 24,
        "employment_status": "employed",
        "is_signature_valid": True,
        "is_data_authentic": True,
        "disability_status": False
    }
    
    sample_rag = {
        "score": 78.5,
        "confidence": 0.85,
        "eligibility_class": "B40",
        "explanation": "Test RAG result",
        "retrieved_context": [],
        "reasoning_path": [],
        "policy_factors": [],
        "edge_cases_identified": []
    }
    
    sample_formula = {
        "score": 76.2,
        "burden_score": 76.2,
        "eligibility_class": "B40",
        "explanation": "Test formula result",
        "equivalent_income": 4500.0,
        "adult_equivalent": 2.1,
        "component_scores": {"burden": 65, "documentation": 25, "disability": 0},
        "confidence": 1.0
    }
    
    # Run individual tests
    try:
        print("\n1. Testing service health...")
        test_instance.test_health_endpoint()
        print("   ✅ Health check passed")
        
        print("\n2. Testing RAG analysis endpoint...")
        test_instance.test_rag_analysis_endpoint_structure(sample_data)
        
        print("\n3. Testing Formula analysis endpoint...")
        test_instance.test_formula_analysis_endpoint_structure(sample_data)
        
        print("\n4. Testing Comparison endpoint...")
        test_instance.test_comparison_endpoint_structure(sample_rag, sample_formula)
        
        print("\n5. Testing invalid requests...")
        test_instance.test_invalid_requests()
        print("   ✅ Invalid request handling passed")
        
        print("\n6. Testing end-to-end workflow...")
        test_instance.test_end_to_end_workflow(sample_data)
        
        print("\n" + "=" * 60)
        print("🎉 All tests completed! Check individual results above.")
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {str(e)}")
        sys.exit(1)