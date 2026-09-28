import { Platform } from 'react-native';

/** Public pages on the static viram.app site (site/). */
export const SITE = 'https://viram.app';
export const PRIVACY_URL = `${SITE}/privacy`;
export const SUPPORT_URL = `${SITE}/support`;

/**
 * The store page, for “Rate Viram” and “Check for an update”. Android's is
 * fixed by the package name; the iOS page is reached through viram.app until
 * the App Store record's ID exists (launch checklist).
 */
export const STORE_URL = Platform.OS === 'android' ? 'https://play.google.com/store/apps/details?id=app.viram' : SITE;
