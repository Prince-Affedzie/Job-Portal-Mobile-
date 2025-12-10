import "dotenv/config";

export default {
  name: "Workaflow",
  slug: "mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/AppIcon-original.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,

  updates: { 
   url: "https://u.expo.dev/38cbca8b-5afa-4729-b17d-20982d184c73"
  }, 
   runtimeVersion: {
  policy: "appVersion"
 },

  splash: {
    image: "./assets/logominimal.png",
    resizeMode: "contain",
    backgroundColor: "#2D1B69",
  },

  ios: { 
    supportsTablet: true,
    bundleIdentifier: "com.affedziep44.JobPortalMobile"
  },

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/WorkaflowAppIcon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.affedziep44.jobportalmobile",
    edgeToEdgeEnabled: true,
 
    googleServicesFile: "./google-services.json",
  },

  

  web: { 
    favicon: "./assets/WorkaflowAppIcon.png" 
  },

  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          
        },
      },
    ],
    "expo-font",
    
    "expo-notifications",
     "expo-asset",
  ],

  extra: {
    EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
    EXPO_PayStack_publicKey: process.env.EXPO_PayStack_publicKey,
    eas: {
      projectId: "38cbca8b-5afa-4729-b17d-20982d184c73",
    },
  },
};
