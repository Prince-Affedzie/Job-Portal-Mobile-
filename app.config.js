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