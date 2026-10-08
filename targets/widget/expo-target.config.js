/**
 * The “Breathe” widget (research runner-up): the ready practice on the home
 * or lock screen, one tap from its settle countdown. Generated into the
 * Xcode project by @bacons/apple-targets; the app writes its data through
 * modules/viram-widget into the shared app group.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'widget',
  name: 'BreatheWidget',
  displayName: 'Breathe',
  icon: '../../assets/icon.png',
  deploymentTarget: '17.0',
  colors: {
    $widgetBackground: '#12372F',
    $accent: '#A8CFD0',
    pine: '#12372F',
    mist: '#EEF4EF',
    soft: '#C9D6D0',
    sky: '#A8CFD0',
    coral: '#E46F51',
  },
  frameworks: ['SwiftUI', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': ['group.app.viram'],
  },
};
