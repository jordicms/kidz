import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.paynopain.kidz',
  appName: 'Kidz Universo',
  webDir: 'dist',
  backgroundColor: '#05060f',
  ios: {
    contentInset: 'never',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
