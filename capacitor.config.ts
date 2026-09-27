import type { CapacitorConfig } from '@capacitor/cli';

// Android app (Capacitor): the same web app, bundled with the TMB timetable for offline use.
const config: CapacitorConfig = {
  appId: 'com.barnatransit.app',
  appName: 'BarnaTransit',
  webDir: 'dist',
  android: {
    // Keep the WebView on https://localhost (secure context: geolocation, Cache Storage)
    allowMixedContent: false
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_barnatransit',
      iconColor: '#10b981'
    }
  }
};

export default config;
