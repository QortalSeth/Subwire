import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export enum EnumTheme {
  LIGHT = 1,
  DARK = 2,
}

// Atom to hold the current theme
export const themeAtom = atom<EnumTheme>(EnumTheme.DARK);

// Notification permission granted by Qortal (NOTIFICATION_PERMISSION). Not persisted.
export const notificationPermissionAtom = atom<boolean>(false);

/**
 * Whether the hub UI exposes NOTIFICATION_PERMISSION (from SHOW_ACTIONS).
 * null = not checked yet; not persisted.
 */
export const hubSupportsNotificationPermissionAtom = atom<boolean | null>(null);

/** Per-address declines so we do not repeat NOTIFICATION_PERMISSION after deny/dismiss */
export const notificationPermissionDeclinedByAddressAtom = atomWithStorage<
  Record<string, boolean>
>('subwire_notification_permission_declined_by_address', {});
