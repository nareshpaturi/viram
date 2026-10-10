/**
 * Viram for Apple Watch (research gap 4): a companion that runs a practice
 * on the watch, wrist down, guided by haptics alone. The phone side is
 * modules/viram-companion.
 *
 * Not in 1.0: app.json's @bacons/apple-targets `match` builds only the
 * widget. To ship it, widen the match to include "watch", set
 * WATCH_APP_AVAILABLE in src/companion/watchState.ts, and add Apple Watch
 * screenshots to the App Store listing.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'watch',
  name: 'ViramWatch',
  displayName: 'Viram',
  bundleIdentifier: '.watchkitapp',
  // Extended runtime sessions for mindfulness and SwiftUI's TimelineView.
  deploymentTarget: '10.0',
  icon: '../../assets/icon.png',
  colors: {
    $accent: '#A8CFD0',
    inhale: '#A8CFD0',
    hold: '#E4B84A',
    exhale: '#E46F51',
    rest: '#EEF4EF',
    mist: '#C9D6D0',
    muted: '#9FB2AA',
  },
  frameworks: ['SwiftUI', 'WatchKit', 'WatchConnectivity'],
};
