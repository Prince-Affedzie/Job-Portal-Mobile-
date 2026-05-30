import "dotenv/config";

export default {
  name: "Workaflow",
  slug: "mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/workaflow_icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,

  updates: { 
    url: "https://u.expo.dev/38cbca8b-5afa-4729-b17d-20982d184c73"
  }, 
  runtimeVersion: {
    policy: "appVersion"
  },

  splash: {
    image: "./assets/workaflow_icon.png",
    resizeMode: "contain",
    backgroundColor: "#001B48",
  },

  ios: { 
    supportsTablet: true,
    googleServicesFile: "./GoogleService-Info.plist",
    usesAppleSignIn: true, 
    bundleIdentifier: "com.affedziep44.JobPortalMobile",
    infoPlist: {
     NSPhotoLibraryUsageDescription:
      "Workaflow uses your photo library to let you upload profile photos, job images, portfolio items, and work submission files.",

    NSCameraUsageDescription:
      "Workaflow uses your camera to let you take profile photos, upload job-related images, and verify completed work.",

    NSMicrophoneUsageDescription:
      "Workaflow uses your microphone to enable voice messages and communication between clients and freelancers within chats.",

    NSLocationWhenInUseUsageDescription:
      "Workaflow uses your location to help you discover nearby jobs, workers, and services in your area.",
      
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSAllowsArbitraryLoadsInWebContent: true,
        NSExceptionDomains: {
          "paystack.com": { NSIncludesSubdomains: true, NSExceptionAllowsInsecureHTTPLoads: true },
          "paystack.co": { NSIncludesSubdomains: true, NSExceptionAllowsInsecureHTTPLoads: true },
          "checkout.paystack.com": { NSIncludesSubdomains: true, NSExceptionAllowsInsecureHTTPLoads: true }
        }
      }
    }
  }, 

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/workaflow_icon.png",
      backgroundColor: "#ffffff",
    },
    blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_EXTERNAL_STORAGE"
      ],
    package: "com.affedziep44.jobportalmobile",
    edgeToEdgeEnabled: true,
    googleServicesFile: "./google-services.json",
  },

  web: { 
    favicon: "./assets/workaflow_icon.png" 
  },

  plugins: [
    [
      "@react-native-google-signin/google-signin",
      {
        "iosUrlScheme": "com.googleusercontent.apps.830161939039-hqi7kl8gff9dd1oo06indv89somq5nal"
      }
    ],
    "expo-apple-authentication", 
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 35, 
          targetSdkVersion: 35,
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