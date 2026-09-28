Pod::Spec.new do |s|
  s.name           = 'ViramHealth'
  s.version        = '1.0.0'
  s.summary        = 'Write-only Apple Health mindful sessions for Viram'
  s.description    = 'Adds completed Viram practices to Apple Health as mindful sessions. Never reads health data.'
  s.author         = 'Viram'
  s.homepage       = 'https://viram.app'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'HealthKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
  s.source_files = '**/*.{h,m,swift}'
end
