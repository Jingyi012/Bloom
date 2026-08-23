const appJson = require('./app.json');

/**
 * Allows the release workflow to stamp the APK with the same version used by
 * the GitHub Release tag. Local builds continue using app.json's version.
 */
module.exports = ({ config }) => ({
  ...config,
  version: process.env.BLOOM_APP_VERSION || appJson.expo.version,
  // Public mobile configuration must be present in the generated Expo
  // manifest. EAS performs the JavaScript bundle on its build workers, so
  // relying only on process.env inside the bundle can leave release builds
  // without the API URL or Google client IDs.
  extra: {
    ...(config.extra || {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl,
    googleIosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      config.extra?.googleIosClientId,
    googleAndroidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      config.extra?.googleAndroidClientId,
    googleWebClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      config.extra?.googleWebClientId,
  },
});
