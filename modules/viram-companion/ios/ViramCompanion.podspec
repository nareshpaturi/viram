Pod::Spec.new do |s|
  s.name           = 'ViramCompanion'
  s.version        = '1.0.0'
  s.summary        = 'Apple Watch companion link for Viram'
  s.description    = 'Sends practices to Viram on Apple Watch and keeps the sessions it sends back until the app saves them.'
  s.author         = 'Viram'
  s.homepage       = 'https://viram.app'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'WatchConnectivity'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
  s.source_files = '**/*.{h,m,swift}'
end
