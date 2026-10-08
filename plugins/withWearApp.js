/**
 * Adds Viram for Wear OS (wear/, research gap 4) to the generated Android
 * project as its own application module. It builds a separate APK under the
 * same package name, as Wear OS apps are published, and shares nothing with
 * the phone app's build but the debug signing key.
 */
const { withSettingsGradle } = require('expo/config-plugins');

const INCLUDE = `
// Viram for Wear OS (plugins/withWearApp.js)
include ':wear'
project(':wear').projectDir = new File(rootDir, '../wear')
`;

module.exports = function withWearApp(config) {
  return withSettingsGradle(config, (config) => {
    if (!config.modResults.contents.includes("include ':wear'")) {
      config.modResults.contents += INCLUDE;
    }
    return config;
  });
};
