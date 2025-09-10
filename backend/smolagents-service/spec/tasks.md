# Implementation Plan

## Phase 1: Core Backend Infrastructure (smolagents-service)

### 1. Project Setup and Dependencies

- [x] 1.1 Set up basic FastAPI project structure in backend/smolagents-service

  - Create main.py with basic FastAPI app
  - Update requirements.txt with smolagents and core dependencies
  - Verify .env file configuration (already exists with all API keys)
  - _Requirements: 10.1, 10.2_

- [x] 1.2 Install and configure smolagents dependencies

  - Test basic smolagents import and ToolCallingAgent initialization with LiteLLMModel
  - Create simple test to verify smolagents is working with gpt-4o-mini
  - _Requirements: 9.1, 9.2_

- [x] 1.3 Set up document processing dependencies

  - Test ChromaDB client initialization
  - _Requirements: 10.4, 10.5_

- [x] 1.4 Configure database and external service connections

  - Add pymongo for MongoDB connectivity
  - Add supabase client for document storage
  - Add tavily-python for external search (you have TAVILY_API_KEY)
  - Create connection test utilities using existing .env credentials
  - _Requirements: 10.5, 10.6, 10.3_

- [x] 1.5 Verify all external service connections
  - Test OpenAI API connection with your API key
  - Test MongoDB connection to RAG_database.doc_chunks
  - Test Supabase connection to documents bucket
  - Test Tavily search API functionality
  - Test Unstructured API for document processing
  - _Requirements: 10.1-10.8_

### 2. Basic Agent Implementation

- [x] 2.1 Create basic CitizenAnalysisAgent class

  - ✅ Implement basic CodeAgent subclass with LiteLLMModel (gpt-4o-mini)
  - ✅ Add simple constructor with tool initialization
  - ✅ Create basic run method without plan review
  - ✅ Add AgentConfig class for environment-based configuration
  - ✅ Create comprehensive unit tests (11 tests passing)
  - ✅ Add integration test framework
  - ✅ Create LiteLLMModel reference documentation
  - _Requirements: 9.1, 9.2_
  - **Files**: `agents/citizen_analysis_agent.py`, `tests/test_citizen_analysis_agent.py`, `tests/integration_test_agent.py`, `docs/litellm_model_reference.md`

- [x] 2.2 Implement basic data validation tool

  - ✅ Create CitizenDataValidationTool class extending Tool (with proper smolagents interface)
  - ✅ Implement format validation (required fields check, data types, 100% confidence)
  - ✅ Implement basic eligibility validation (B40 = 100% confidence, others = lower confidence + LLM review)
  - ✅ Add comprehensive unit tests for validation logic (24 tests passing)
  - ✅ Implement hybrid confidence approach: ☆☆☆ for B40, ★★☆ for non-B40
  - ✅ Add audit trail logging without sensitive data (Requirement 6.1 compliance)
  - ✅ Implement clear validation error messages and recommendations
  - ✅ Add validation statistics tracking and monitoring capabilities
  - ✅ Test integration with CitizenAnalysisAgent (standalone tool ready for manual integration)
  - _Requirements: 1.1, 5.1, 6.1_
  - **Files**: `tools/citizen_data_validation_tool.py`, `tests/test_citizen_data_validation_tool.py`, `tests/simple_integration_test.py`

- [ ] 2.3 Create basic scoring calculator tool

  - Implement EligibilityScoreTool class extending Tool
  - Create mathematical scoring algorithm with default weights
  - Add eligibility level mapping (Highly Eligible, Eligible, etc.)
  - Add unit tests for scoring calculations
  - _Requirements: 1.4, 4.3_

- [ ] 2.4 Implement basic ChromaDB retriever tool
  - Create ChromaDBRetrieverTool class extending Tool
  - Implement basic semantic search functionality
  - Add error handling for ChromaDB unavailable scenarios
  - Test with mock ChromaDB collection
  - _Requirements: 2.1, 2.2, 2.4_

### 3. Plan Review Infrastructure

- [ ] 3.1 Add step callback support to CitizenAnalysisAgent

  - Modify agent constructor to accept step_callbacks parameter
  - Implement basic interrupt_for_plan_review callback function
  - Test PlanningStep detection and interruption
  - _Requirements: 7.1, 7.6_

- [ ] 3.2 Create plan review data models

  - Implement AgentPlan dataclass with plan_id, content, status
  - Create PlanReviewAction dataclass for user actions
  - Add AnalysisSession dataclass for session management
  - _Requirements: 7.2, 8.1_

- [ ] 3.3 Implement plan storage and retrieval

  - Create in-memory session storage for active analysis sessions
  - Add methods to store and retrieve pending plans
  - Implement plan status updates (pending, approved, modified, cancelled)
  - _Requirements: 7.3, 7.4, 7.5_

- [ ] 3.4 Add memory preservation functionality
  - Implement plan modification in agent memory (memory_step.plan update)
  - Test agent.run() with reset=False for memory preservation
  - Verify agent memory steps are maintained across interruptions
  - _Requirements: 7.6, 7.7_

### 4. FastAPI Service Endpoints

- [ ] 4.1 Create basic analysis endpoint

  - Implement POST /analyze-citizen endpoint
  - Create AnalysisRequest and AnalysisResponse models
  - Add basic error handling and validation
  - _Requirements: 1.1, 1.2_

- [ ] 4.2 Add plan review endpoints

  - Implement POST /analysis/{analysis_id}/plan-review endpoint
  - Handle approve, modify, and cancel actions
  - Add proper error responses for invalid sessions
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [ ] 4.3 Implement session management

  - Create session creation and cleanup logic
  - Add session timeout handling
  - Implement session status tracking
  - _Requirements: 8.4, 5.4_

- [ ] 4.4 Add WebSocket support for real-time updates
  - Implement WebSocket endpoint for analysis status updates
  - Create WebSocketMessage data model
  - Add plan review notification broadcasting
  - _Requirements: 4.1, 4.2_

### 5. Advanced Tool Implementation

- [ ] 5.1 Enhance ChromaDB retriever with hybrid search

  - Add BM25 keyword search implementation
  - Implement hybrid search combining semantic and keyword results
  - Add search result ranking and deduplication
  - _Requirements: 2.1, 2.3_

- [ ] 5.2 Create policy analysis tool

  - Implement PolicyAnalysisTool class extending Tool
  - Add policy document parsing and analysis logic
  - Implement conflict detection and resolution
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5.3 Add DuckDuckGo search integration

  - Configure DuckDuckGoSearchTool for external search fallback
  - Implement search result processing and formatting
  - Add fallback logic when ChromaDB results are insufficient
  - _Requirements: 2.3, 2.4_

- [ ] 5.4 Implement smart query generation
  - Create SmartQueryGeneratorTool for optimized search queries
  - Add citizen context-based query optimization
  - Implement query strategy selection (semantic, keyword, hybrid)
  - _Requirements: 2.1, 2.2_

### 6. Error Handling and Resilience

- [ ] 6.1 Add comprehensive error handling

  - Implement graceful degradation for tool failures
  - Add retry logic for external service calls
  - Create error response models and logging
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6.2 Implement audit logging

  - Add audit trail creation for all analysis steps
  - Log plan review actions and modifications
  - Implement structured logging without sensitive data
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 6.3 Add resource management
  - Implement request queuing for resource constraints
  - Add connection pooling for database connections
  - Create resource monitoring and alerting
  - _Requirements: 5.4_

### 7. Testing and Validation

- [ ] 7.1 Create unit tests for core components

  - Test CitizenAnalysisAgent initialization and basic functionality
  - Test all custom tools (validation, scoring, retrieval)
  - Test plan review workflow components
  - _Requirements: All core requirements_

- [ ] 7.2 Add integration tests

  - Test end-to-end analysis workflow without plan review
  - Test plan review interruption and resumption
  - Test error handling scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 7.3 Create mock data and test fixtures
  - Generate synthetic citizen data for testing
  - Create mock ChromaDB responses
  - Set up test environment configuration
  - _Requirements: Testing strategy_

## Phase 2: Frontend Integration (After Backend Core is Complete)

### 8. Basic Frontend Components

- [ ] 8.1 Create analysis dashboard page component

  - Basic React component for citizen analysis interface
  - Integration with backend analysis endpoint
  - Simple status display and result presentation
  - _Requirements: 4.1, 4.2_

- [ ] 8.2 Implement plan review modal component

  - Create PlanReviewModal React component
  - Add plan display, editing, and action buttons
  - Implement WebSocket connection for real-time updates
  - _Requirements: 7.2, 7.3_

- [ ] 8.3 Add real-time status updates
  - Implement WebSocket client for live analysis updates
  - Create agent status visualization components
  - Add progress indicators and live streaming
  - _Requirements: 4.1, 4.2_

### 9. Advanced Frontend Features

- [ ] 9.1 Create agent visualization dashboard

  - Implement real-time agent status display
  - Add agent communication visualization
  - Create progress tracking and memory step display
  - _Requirements: 4.1, 4.2_

- [ ] 9.2 Add analysis result presentation
  - Create comprehensive result display components
  - Implement score visualization and breakdown
  - Add recommendation and audit trail display
  - _Requirements: 4.3, 4.4_

## Phase 3: Advanced Features and Optimization

### 10. Performance and Scalability

- [ ] 10.1 Implement caching strategies

  - Add ChromaDB query result caching
  - Implement agent result caching for similar queries
  - Create cache invalidation and management
  - _Requirements: Performance optimization_

- [ ] 10.2 Add monitoring and observability
  - Implement metrics collection for agent execution
  - Add performance monitoring and alerting
  - Create structured logging and error tracking
  - _Requirements: Monitoring strategy_

### 11. Production Readiness

- [ ] 11.1 Add configuration management

  - Create environment-based configuration
  - Add feature flags for plan review enable/disable
  - Implement deployment configuration
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 11.2 Security and data protection
  - Implement data encryption and access control
  - Add input sanitization and validation
  - Create audit logging without sensitive data storage
  - _Requirements: Security considerations_
- always remember to source venv/bin/activate when you want to test something out.
- Read @backend/smolagents-service/spec/design.md and @backend/smolagents-service/spec/requirements.md before doing any tasks @backend/smolagents-service/spec/tasks.md . This is important.