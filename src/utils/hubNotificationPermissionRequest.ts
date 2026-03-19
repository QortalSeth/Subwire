declare const qortalRequest: (params: any) => Promise<any>;

export type HubNotificationPermissionOutcome = 'granted' | 'denied' | 'error';

export async function requestHubNotificationPermissionOutcome(): Promise<HubNotificationPermissionOutcome> {
  try {
    const result = await qortalRequest({
      action: 'NOTIFICATION_PERMISSION',
    });
    return result ? 'granted' : 'denied';
  } catch (error) {
    console.error(error);
    return 'error';
  }
}

/**
 * Apply hub NOTIFICATION_PERMISSION result to Jotai + persisted decline state.
 */
export function applyHubNotificationPermissionOutcome(
  address: string,
  outcome: HubNotificationPermissionOutcome,
  setDeclinedByAddress: (
    fn: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void,
  setNotificationPermission: (granted: boolean) => void
): void {
  if (outcome === 'granted') {
    setDeclinedByAddress((prev) => {
      if (!prev[address]) return prev;
      const { [address]: _, ...rest } = prev;
      return rest;
    });
    setNotificationPermission(true);
    return;
  }

  setDeclinedByAddress((prev) =>
    prev[address] ? prev : { ...prev, [address]: true }
  );
  setNotificationPermission(false);
}
