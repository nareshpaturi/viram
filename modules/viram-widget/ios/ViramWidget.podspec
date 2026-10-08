Pod::Spec.new do |s|
  s.name           = 'ViramWidget'
  s.version        = '1.0.0'
  s.summary        = 'Home-screen widget data for Viram'
  s.description    = 'Shares the ready practice with the Viram widget through the app group and reloads it.'
  s.author         = 'Viram'
  s.homepage       = 'https://viram.app'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'WidgetKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
  s.source_files = '**/*.{h,m,swift}'
end
