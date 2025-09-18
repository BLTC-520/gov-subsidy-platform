# Frontend Integration Guide - Dual Analysis API

This guide provides complete integration instructions for the three dual-analysis endpoints that enable RAG vs Formula comparison in the subsidy eligibility system.

## Overview

The dual-analysis system provides three endpoints for comprehensive eligibility analysis:

1. **`/analyze-citizen-rag`** - Contextual policy reasoning using LLM
2. **`/analyze-citizen-formula`** - Mathematical burden score calculation  
3. **`/compare-analyses`** - Compare results from both approaches

## API Documentation

### Swagger UI (Interactive Documentation)
```
http://localhost:3003/docs
```

### OpenAPI JSON Schema  
```
http://localhost:3003/openapi.json
```

**Use the Swagger UI for complete API reference, request/response schemas, and interactive testing.**

## Quick Start Example

```javascript
// Sample citizen data
const citizenData = {
  citizen_id: "123456789012",
  income_bracket: "B40",
  state: "Selangor",
  age: 35,
  household_size: 4,
  number_of_children: 2,
  residency_duration_months: 24,
  employment_status: "employed",
  is_signature_valid: true,
  is_data_authentic: true,
  disability_status: false
};

// Parallel execution
const [ragResponse, formulaResponse] = await Promise.allSettled([
  fetch('/analyze-citizen-rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ citizen_id: "123456789012", citizen_data: citizenData })
  }),
  fetch('/analyze-citizen-formula', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ citizen_id: "123456789012", citizen_data: citizenData })
  })
]);

// Compare if both succeeded
if (ragResponse.status === 'fulfilled' && formulaResponse.status === 'fulfilled') {
  const ragResult = await ragResponse.value.json();
  const formulaResult = await formulaResponse.value.json();
  
  const comparison = await fetch('/compare-analyses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      citizen_id: "123456789012",
      rag_result: ragResult.result,
      formula_result: formulaResult.result
    })
  });
  
  const comparisonResult = await comparison.json();
  console.log('Dual Analysis Complete:', comparisonResult);
}
```

---

## Frontend Implementation Patterns

### 1. Parallel Execution (Recommended)

Execute RAG and Formula analyses in parallel for best performance:

```javascript
async function performDualAnalysis(citizenData) {
  const citizenId = citizenData.citizen_id;
  
  try {
    // Execute both analyses in parallel
    const [ragResponse, formulaResponse] = await Promise.allSettled([
      fetch('/analyze-citizen-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citizen_id: citizenId, citizen_data: citizenData })
      }),
      fetch('/analyze-citizen-formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citizen_id: citizenId, citizen_data: citizenData })
      })
    ]);
    
    // Handle results
    let ragResult = null;
    let formulaResult = null;
    
    if (ragResponse.status === 'fulfilled' && ragResponse.value.ok) {
      ragResult = await ragResponse.value.json();
    }
    
    if (formulaResponse.status === 'fulfilled' && formulaResponse.value.ok) {
      formulaResult = await formulaResponse.value.json();
    }
    
    // Compare if both succeeded
    if (ragResult && formulaResult) {
      const comparisonResponse = await fetch('/compare-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizen_id: citizenId,
          rag_result: ragResult.result,
          formula_result: formulaResult.result
        })
      });
      
      const comparison = comparisonResponse.ok ? await comparisonResponse.json() : null;
      
      return { ragResult, formulaResult, comparison };
    }
    
    return { ragResult, formulaResult, comparison: null };
    
  } catch (error) {
    console.error('Dual analysis failed:', error);
    throw error;
  }
}
```

### 2. Progressive Loading UI

Show results as they arrive:

```javascript
async function performAnalysisWithUI(citizenData, updateUI) {
  updateUI({ status: 'analyzing', ragResult: null, formulaResult: null });
  
  // Start both analyses
  const ragPromise = analyzeRAG(citizenData);
  const formulaPromise = analyzeFormula(citizenData);
  
  // Update UI as results arrive
  ragPromise.then(result => {
    updateUI(prev => ({ ...prev, ragResult: result }));
  });
  
  formulaPromise.then(result => {
    updateUI(prev => ({ ...prev, formulaResult: result }));
  });
  
  // Wait for both and compare
  try {
    const [ragResult, formulaResult] = await Promise.all([ragPromise, formulaPromise]);
    const comparison = await compareAnalyses(citizenData.citizen_id, ragResult, formulaResult);
    
    updateUI(prev => ({ ...prev, comparison, status: 'completed' }));
  } catch (error) {
    updateUI(prev => ({ ...prev, error, status: 'error' }));
  }
}
```

### 3. Error Handling

Implement graceful degradation:

```javascript
async function robustDualAnalysis(citizenData) {
  const results = {
    rag: { status: 'pending', data: null, error: null },
    formula: { status: 'pending', data: null, error: null },
    comparison: { status: 'pending', data: null, error: null }
  };
  
  // RAG Analysis with error handling
  try {
    const ragResponse = await fetch('/analyze-citizen-rag', { /* ... */ });
    if (ragResponse.ok) {
      results.rag = { status: 'success', data: await ragResponse.json(), error: null };
    } else {
      results.rag = { status: 'error', data: null, error: `HTTP ${ragResponse.status}` };
    }
  } catch (error) {
    results.rag = { status: 'error', data: null, error: error.message };
  }
  
  // Formula Analysis with error handling  
  try {
    const formulaResponse = await fetch('/analyze-citizen-formula', { /* ... */ });
    if (formulaResponse.ok) {
      results.formula = { status: 'success', data: await formulaResponse.json(), error: null };
    } else {
      results.formula = { status: 'error', data: null, error: `HTTP ${formulaResponse.status}` };
    }
  } catch (error) {
    results.formula = { status: 'error', data: null, error: error.message };
  }
  
  // Comparison only if both succeeded
  if (results.rag.status === 'success' && results.formula.status === 'success') {
    try {
      const comparisonResponse = await fetch('/compare-analyses', { /* ... */ });
      if (comparisonResponse.ok) {
        results.comparison = { status: 'success', data: await comparisonResponse.json(), error: null };
      } else {
        results.comparison = { status: 'error', data: null, error: `HTTP ${comparisonResponse.status}` };
      }
    } catch (error) {
      results.comparison = { status: 'error', data: null, error: error.message };
    }
  }
  
  return results;
}
```

---

## UI Component Suggestions

### 1. Tabbed Interface

```jsx
function DualAnalysisResults({ ragResult, formulaResult, comparison }) {
  const [activeTab, setActiveTab] = useState('comparison');
  
  return (
    <div className="dual-analysis-results">
      <div className="tabs">
        <button 
          className={activeTab === 'comparison' ? 'active' : ''} 
          onClick={() => setActiveTab('comparison')}
        >
          Comparison {comparison?.agreement ? '✅' : '⚠️'}
        </button>
        <button 
          className={activeTab === 'rag' ? 'active' : ''} 
          onClick={() => setActiveTab('rag')}
        >
          RAG Analysis
        </button>
        <button 
          className={activeTab === 'formula' ? 'active' : ''} 
          onClick={() => setActiveTab('formula')}
        >
          Formula Score
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'comparison' && <ComparisonView data={comparison} />}
        {activeTab === 'rag' && <RagAnalysisView data={ragResult} />}
        {activeTab === 'formula' && <FormulaScoreView data={formulaResult} />}
      </div>
    </div>
  );
}
```

### 2. Comparison Banner

```jsx
function ComparisonBanner({ comparison }) {
  if (!comparison) return null;
  
  const bannerClass = comparison.agreement ? 'agreement' : 'disagreement';
  const icon = comparison.agreement ? '✅' : '⚠️';
  
  return (
    <div className={`comparison-banner ${bannerClass}`}>
      <div className="banner-content">
        <span className="icon">{icon}</span>
        <span className="recommendation">{comparison.recommendation}</span>
        <span className="difference">Δ{comparison.score_difference.toFixed(1)} points</span>
      </div>
      <div className="comment">{comparison.comment}</div>
    </div>
  );
}
```

---

## Error Handling Patterns

### Common Error Responses

#### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "citizen_data"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

#### 500 Service Error
```json
{
  "detail": "RAG analysis failed: OpenAI API key not configured"
}
```

### Error Handling in UI

```javascript
function handleAnalysisError(error, analysisType) {
  if (error.status === 422) {
    return `Invalid input data for ${analysisType} analysis`;
  } else if (error.status === 500) {
    return `${analysisType} analysis service temporarily unavailable`;
  } else {
    return `${analysisType} analysis failed: ${error.message}`;
  }
}
```

---

## Performance Considerations

### 1. Timeout Settings
- **RAG Analysis**: 60 seconds (includes web search)
- **Formula Analysis**: 30 seconds (mathematical computation)  
- **Comparison**: 10 seconds (simple calculation)

### 2. Caching Strategy
Consider caching results for identical citizen data:

```javascript
const analysisCache = new Map();

function getCacheKey(citizenData) {
  return JSON.stringify(citizenData);
}

async function cachedDualAnalysis(citizenData) {
  const cacheKey = getCacheKey(citizenData);
  
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey);
  }
  
  const result = await performDualAnalysis(citizenData);
  analysisCache.set(cacheKey, result);
  
  return result;
}
```

### 3. Loading States
Provide clear feedback during analysis:

```jsx
function AnalysisLoadingState({ ragLoading, formulaLoading }) {
  return (
    <div className="analysis-loading">
      <div className="loading-item">
        <span>RAG Analysis</span>
        {ragLoading ? <Spinner /> : <CheckIcon />}
      </div>
      <div className="loading-item">
        <span>Formula Analysis</span>
        {formulaLoading ? <Spinner /> : <CheckIcon />}
      </div>
    </div>
  );
}
```

---

This integration guide provides everything needed to implement the dual-analysis system in your frontend application. The key is parallel execution of both analyses with graceful error handling and a clean comparison interface.