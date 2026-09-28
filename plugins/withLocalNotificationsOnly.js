/**
 * Viram schedules one local reminder and never uses push (FR-17). The
 * expo-notifications plugin adds the iOS push entitlement regardless, which
 * device builds can't sign without a push-enabled team, so remove it.
 * List this plugin before expo-notifications: later plugins' mods run first.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
