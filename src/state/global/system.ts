import { atom } from 'jotai';

export enum EnumTheme {
  LIGHT = 1,
  DARK = 2,
}

// Atom to hold the current theme
export const themeAtom = atom<EnumTheme>(EnumTheme.DARK);

// Notification permission granted by Qortal (NOTIFICATION_PERMISSION). Not persisted.
export const notificationPermissionAtom = atom<boolean>(false);
