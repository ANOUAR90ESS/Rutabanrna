import { Capacitor } from '@capacitor/core';

/** True inside the Android app (Capacitor), false on the web. */
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
