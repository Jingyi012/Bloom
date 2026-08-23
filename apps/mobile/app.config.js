const appJson = require('./app.json');

/**
 * Allows the release workflow to stamp the APK with the same version used by
 * the GitHub Release tag. Local builds continue using app.json's version.
 */
module.exports = ({ config }) => ({
  ...config,
  version: process.env.BLOOM_APP_VERSION || appJson.expo.version,
});
