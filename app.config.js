import "dotenv/config";

export default {
  name: "mobile",
  slug: "mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,

  splash: {
    image: "./assets/WorkaFlowLogo.png",
    resizeMode: "contain",
    backgroundColor: "#1A1F3B",
  },

  ios: { 
    supportsTablet: true,
    bundleIdentifier: "com.affedziep44.JobPortalMobile"
  },

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.affedziep44.jobportalmobile",
    edgeToEdgeEnabled: true,

    // 👇 Add this line to connect your google-services.json file
    googleServicesFile: "./google-services.json",
  },

  web: { 
    favicon: "./assets/favicon.png" 
  },

  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          kotlinVersion: "2.2.20",
        },
      },
    ],
    "expo-font",
    
    "expo-notifications",
  ],

  extra: {
    EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
    EXPO_PayStack_publicKey: process.env.EXPO_PayStack_publicKey,
    eas: {
      projectId: "38cbca8b-5afa-4729-b17d-20982d184c73",
    },
  },
};
