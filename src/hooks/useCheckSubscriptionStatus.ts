/**
 * React hook wrapper for checkSubscriptionStatus utility
 * This provides a convenient way to check subscription status in React components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGlobal } from 'qapp-core';
import { checkSubscriptionStatus } from '../utils/checkSubscriptionStatus';

export type SubscriptionStatus =
  | 'not-subscribed'
  | 'subscribed-paid'
  | 'subscribed-unpaid'
  | 'owner'
  | 'no-subscription';

export interface CheckSubscriptionStatusResult {
  /**
   * The subscription status
   */
  status: SubscriptionStatus;

  /**
   * Whether the address is subscribed (member of the group)
   */
  isSubscribed: boolean;

  /**
   * Whether the subscription needs payment
   */
  needsPayment: boolean;

  /**
   * Whether the address is the group owner
   */
  isOwner: boolean;

  /**
   * Whether the address is a member of the group
   */
  isMember: boolean;

  /**
   * Whether a payment record exists on the blockchain
   */
  hasPaymentRecord: boolean;

  /**
   * The payment transaction signature from the PRODUCT record (if found)
   */
  paymentTxSignature?: string;

  /**
   * Whether the payment transaction was validated on-chain
   */
  isPaymentTxValid?: boolean;

  /**
   * Error message if payment validation failed
   */
  paymentValidationError?: string;

  /**
   * Whether the group owner has enabled a subscription for this group
   */
  hasSubscriptionEnabled: boolean;

  /**
   * Error message if subscription is not enabled
   */
  subscriptionDisabledReason?: string;
}

export interface UseCheckSubscriptionStatusParams {
  /**
   * The address to check subscription status for
   */
  address: string | null;

  /**
   * The group ID to check membership in
   */
  groupId: number | null;

  /**
   * Whether the hook should run (defaults to true)
   */
  enabled?: boolean;
}

export interface UseCheckSubscriptionStatusReturn
  extends CheckSubscriptionStatusResult {
  /**
   * Whether the check is currently loading
   */
  loading: boolean;

  /**
   * Error that occurred during the check
   */
  error: Error | null;

  /**
   * Function to manually refresh the subscription status
   */
  refresh: () => void;
}

/**
 * React hook to check an address's subscription status for a private group
 *
 * @param params - Parameters for checking subscription status
 * @returns Subscription status with loading and error states
 *
 * @example
 * ```typescript
 * import { useGlobal } from 'qapp-core';
 * import { useCheckSubscriptionStatusLib } from './lib/useCheckSubscriptionStatus';
 *
 * function MyComponent() {
 *   const { auth } = useGlobal();
 *
 *   const {
 *     status,
 *     isSubscribed,
 *     needsPayment,
 *     loading,
 *     error,
 *     refresh
 *   } = useCheckSubscriptionStatusLib({
 *     address: auth?.address ?? null,
 *     groupId: 12345,
 *   });
 *
 *   if (loading) return <div>Checking subscription...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Status: {status}</p>
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCheckSubscriptionStatusLib(
  params: UseCheckSubscriptionStatusParams
): UseCheckSubscriptionStatusReturn {
  const { address, groupId, enabled = true } = params;
  const { identifierOperations } = useGlobal();
  const [result, setResult] = useState<CheckSubscriptionStatusResult>({
    status: 'no-subscription',
    isSubscribed: false,
    needsPayment: false,
    isOwner: false,
    isMember: false,
    hasPaymentRecord: false,
    hasSubscriptionEnabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Track previous values to prevent infinite re-renders
  const prevAddressRef = useRef<string>('');
  const prevGroupIdRef = useRef<number>(0);
  const prevIdentifierOperationsRef = useRef<string>('');
  const prevEnabledRef = useRef<boolean>(true);
  const prevRefreshKeyRef = useRef<number>(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const currentIdentifierOperations = identifierOperations ? 'present' : '';

    if (
      address === prevAddressRef.current &&
      groupId === prevGroupIdRef.current &&
      currentIdentifierOperations === prevIdentifierOperationsRef.current &&
      enabled === prevEnabledRef.current &&
      refreshKey === prevRefreshKeyRef.current
    ) {
      return;
    }

    prevAddressRef.current = address || '';
    prevGroupIdRef.current = groupId || 0;
    prevIdentifierOperationsRef.current = currentIdentifierOperations;
    prevEnabledRef.current = enabled;
    prevRefreshKeyRef.current = refreshKey;

    if (!enabled) {
      return;
    }

    if (!address || !groupId || !identifierOperations) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkStatus() {
      // Type guard: at this point we know they're not null
      if (!address || !groupId) return;

      setLoading(true);
      setError(null);

      try {
        const statusResult = await checkSubscriptionStatus({
          address,
          groupId,
          identifierOperations,
        });

        if (!cancelled) {
          setResult(statusResult);
          setError(null);
        }
      } catch (err) {
        console.error('[useCheckSubscriptionStatus] Error:', err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to check subscription status')
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [address, groupId, identifierOperations, enabled, refreshKey]);

  return {
    ...result,
    loading,
    error,
    refresh,
  };
}
