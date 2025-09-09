/**
 * Frontend Integration Tests for ZK Migration
 * 
 * This test suite validates that the frontend properly integrates with
 * the new backend API for ZK verification, replacing direct database writes.
 * 
 * Tests the updated useICVerification hook and related components.
 * 
 * Run with: npm test -- --testPathPattern=frontend-integration-tests.js
 */

// Mock fetch for testing
global.fetch = jest.fn();

// Mock Supabase auth
const mockSupabaseAuth = {
  getUser: jest.fn()
};

const mockSupabase = {
  auth: mockSupabaseAuth
};

// Mock the supabase module
jest.mock('../frontend/src/lib/supabase', () => ({
  supabase: mockSupabase
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useICVerification } from '../frontend/src/hooks/useICVerification';

describe('ZK Migration Frontend Integration Tests', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    fetch.mockClear();
    
    // Mock console methods to reduce noise in tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Default auth mock - user is authenticated
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-123' } },
      error: null
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Hook Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useICVerification());
      
      expect(result.current.verificationData).toEqual({
        citizenName: '',
        incomeBracket: '',
        verificationStatus: 'unverified',
        zkProof: undefined,
        errorMessage: undefined
      });
    });
  });

  describe('Authentication Flow', () => {
    test('should fail verification when user is not authenticated', async () => {
      // Mock unauthenticated user
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        const verificationResult = await result.current.verifyIC('030520-01-2185');
        expect(verificationResult.verificationStatus).toBe('error');
        expect(verificationResult.errorMessage).toContain('Authentication required');
      });
    });

    test('should proceed with verification when user is authenticated', async () => {
      // Mock successful ZK verification
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            citizen_name: 'John Doe',
            income_bracket: 'B1',
            verification_status: 'verified',
            zk_verified: true,
            zk_proof: {
              public_signals: ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1']
            }
          })
        })
        // Mock successful backend storage
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            incomeBracket: 'B1'
          })
        });
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        const verificationResult = await result.current.verifyIC('030520-01-2185');
        expect(verificationResult.verificationStatus).toBe('verified');
      });
    });
  });

  describe('Two-Step Verification Flow', () => {
    test('should call ZK verification API first', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            citizen_name: 'John Doe',
            zk_verified: true,
            zk_proof: {
              public_signals: ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1']
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            incomeBracket: 'B1'
          })
        });
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        await result.current.verifyIC('030520-01-2185');
      });
      
      // Verify first API call was to ZK verification
      expect(fetch).toHaveBeenNthCalledWith(1, 
        'http://localhost:3002/api/ic-verification',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ic: '030520-01-2185' })
        })
      );
    });

    test('should call backend storage API second with extracted data', async () => {
      const mockZKProof = {
        public_signals: ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1']
      };
      
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            citizen_name: 'John Doe',
            zk_verified: true,
            zk_proof: mockZKProof
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            incomeBracket: 'B1'
          })
        });
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        await result.current.verifyIC('030520-01-2185');
      });
      
      // Verify second API call was to backend storage with correct data
      expect(fetch).toHaveBeenNthCalledWith(2,
        'http://localhost:3002/api/zk/verify-and-store',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'test-user-123',
            zkFlags: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            isSignatureValid: true,
            isDataAuthentic: true
          })
        })
      );
    });

    test('should handle ZK verification failure gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: 'Invalid IC number'
        })
      });
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        const verificationResult = await result.current.verifyIC('invalid-ic');
        expect(verificationResult.verificationStatus).toBe('error');
        expect(verificationResult.errorMessage).toContain('ZK verification failed');
      });
      
      // Should not call backend storage if ZK verification fails
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('should handle backend storage failure gracefully', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            citizen_name: 'John Doe',
            zk_verified: true,
            zk_proof: {
              public_signals: ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1']
            }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({
            success: false,
            error: 'Database update failed'
          })
        });
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        const verificationResult = await result.current.verifyIC('030520-01-2185');
        expect(verificationResult.verificationStatus).toBe('error');
        expect(verificationResult.errorMessage).toContain('Failed to store ZK verification results');
      });
    });
  });

  describe('Data Extraction and Mapping', () => {
    test('should correctly extract ZK flags from public signals', async () => {
      const mockPublicSignals = ['0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1'];
      
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            citizen_name: 'Jane Doe',
            zk_verified: true,
            zk_proof: {
              public_signals: mockPublicSignals
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            incomeBracket: 'B2'
          })
        });
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        await result.current.verifyIC('030520-01-2185');
      });
      
      // Check that the extracted data was sent correctly
      const backendCall = fetch.mock.calls[1];
      const requestBody = JSON.parse(backendCall[1].body);
      
      expect(requestBody.zkFlags).toEqual([0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(requestBody.isSignatureValid).toBe(true);
      expect(requestBody.isDataAuthentic).toBe(true);
    });

    test('should handle invalid signature in public signals', async () => {
      const mockPublicSignals = ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1']; // Signature invalid
      
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            citizen_name: 'John Doe',
            zk_verified: true,
            zk_proof: {
              public_signals: mockPublicSignals
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            incomeBracket: 'B1'
          })
        });
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        await result.current.verifyIC('030520-01-2185');
      });
      
      const backendCall = fetch.mock.calls[1];
      const requestBody = JSON.parse(backendCall[1].body);
      
      expect(requestBody.isSignatureValid).toBe(false);
      expect(requestBody.isDataAuthentic).toBe(true);
    });
  });

  describe('Loading States', () => {
    test('should set loading state during verification', async () => {
      // Create a promise that we can control
      let resolveZkVerification;
      const zkPromise = new Promise(resolve => {
        resolveZkVerification = resolve;
      });
      
      fetch.mockReturnValueOnce({
        ok: true,
        json: () => zkPromise
      });
      
      const { result } = renderHook(() => useICVerification());
      
      // Start verification
      act(() => {
        result.current.verifyIC('030520-01-2185');
      });
      
      // Check loading state
      expect(result.current.verificationData.verificationStatus).toBe('loading');
      
      // Resolve the promise
      act(() => {
        resolveZkVerification({
          success: true,
          citizen_name: 'John Doe',
          zk_verified: true,
          zk_proof: {
            public_signals: ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1']
          }
        });
      });
      
      // Mock backend storage
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          incomeBracket: 'B1'
        })
      });
      
      await waitFor(() => {
        expect(result.current.verificationData.verificationStatus).toBe('verified');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        const verificationResult = await result.current.verifyIC('030520-01-2185');
        expect(verificationResult.verificationStatus).toBe('error');
        expect(verificationResult.errorMessage).toContain('Network error');
      });
    });

    test('should handle malformed API responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          // Missing required fields
          success: true
        })
      });
      
      const { result } = renderHook(() => useICVerification());
      
      await act(async () => {
        const verificationResult = await result.current.verifyIC('030520-01-2185');
        expect(verificationResult.verificationStatus).toBe('error');
      });
    });
  });

  describe('State Management', () => {
    test('should update state correctly through verification flow', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            citizen_name: 'Alice Smith',
            zk_verified: true,
            zk_proof: {
              public_signals: ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1']
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            incomeBracket: 'B1'
          })
        });
      
      const { result } = renderHook(() => useICVerification());
      
      // Initial state
      expect(result.current.verificationData.verificationStatus).toBe('unverified');
      expect(result.current.verificationData.citizenName).toBe('');
      expect(result.current.verificationData.incomeBracket).toBe('');
      
      await act(async () => {
        await result.current.verifyIC('030520-01-2185');
      });
      
      // Final state
      expect(result.current.verificationData.verificationStatus).toBe('verified');
      expect(result.current.verificationData.citizenName).toBe('Alice Smith');
      expect(result.current.verificationData.incomeBracket).toBe('B1');
      expect(result.current.verificationData.zkProof).toBeDefined();
    });

    test('should reset error state on new verification', async () => {
      const { result } = renderHook(() => useICVerification());
      
      // First, cause an error
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await act(async () => {
        await result.current.verifyIC('030520-01-2185');
      });
      
      expect(result.current.verificationData.verificationStatus).toBe('error');
      expect(result.current.verificationData.errorMessage).toBeDefined();
      
      // Then, start a new verification
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            citizen_name: 'Bob Johnson',
            zk_verified: true,
            zk_proof: {
              public_signals: ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1']
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            incomeBracket: 'B1'
          })
        });
      
      await act(async () => {
        await result.current.verifyIC('030520-01-2185');
      });
      
      // Error should be cleared
      expect(result.current.verificationData.verificationStatus).toBe('verified');
      expect(result.current.verificationData.errorMessage).toBeUndefined();
    });
  });
});

// Additional component integration tests
describe('Component Integration with ZK Migration', () => {
  test('should integrate properly with IncomeVerificationField component', () => {
    // This would test the actual component integration
    // Left as a placeholder for UI component tests
    expect(true).toBe(true);
  });
  
  test('should integrate properly with ZKVerificationBadge component', () => {
    // This would test status badge updates
    // Left as a placeholder for UI component tests
    expect(true).toBe(true);
  });
});