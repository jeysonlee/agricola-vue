import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agricola.app',
  appName: 'Agricola',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2dd36f',
      showSpinner: false,
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#2dd36f',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
