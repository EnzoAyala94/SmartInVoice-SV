import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartfactura.app',
  appName: 'Smart Invoice',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  server: {
    // Permite que la app haga peticiones a tu backend desplegado.
    // Reemplaza esta URL por la real de tu backend en Render (sin /api al final).
    allowNavigation: ['*.onrender.com'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#17335C',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
