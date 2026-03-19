/**
 * Parse SHOW_ACTIONS response from qortalRequest — shape may vary by hub version.
 */
export function showActionsIncludesNotificationPermission(
  result: unknown
): boolean {
  return collectShowActionNames(result).includes('NOTIFICATION_PERMISSION');
}

function collectShowActionNames(value: unknown): string[] {
  if (value == null) return [];

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    const names: string[] = [];
    for (const item of value) {
      if (typeof item === 'string') {
        names.push(item);
      } else if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const action = o.action ?? o.name ?? o.type;
        if (typeof action === 'string') names.push(action);
      }
    }
    return names;
  }

  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const key of ['actions', 'list', 'allowedActions', 'showActions']) {
      const nested = o[key];
      if (nested !== undefined) {
        return collectShowActionNames(nested);
      }
    }
  }

  return [];
}

declare const qortalRequest: (params: any) => Promise<any>;

export async function fetchHubSupportsNotificationPermission(): Promise<boolean> {
  try {
    const result = await qortalRequest({ action: 'SHOW_ACTIONS' });
    return showActionsIncludesNotificationPermission(result);
  } catch {
    return false;
  }
}
