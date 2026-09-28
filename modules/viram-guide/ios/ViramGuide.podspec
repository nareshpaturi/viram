Pod::Spec.new do |s|
  s.name           = 'ViramGuide'
  s.version        = '1.0.0'
  s.summary        = 'Viram practice guidance on the audio clock'
  s.description    = 'Schedules Viram voice, tone, and haptic cues on the audio clock so guidance continues with the screen locked.'
  s.author         = 'Viram'
  s.homepage       = 'https://viram.app'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
  s.source_files = '**/*.{h,m,swift}'
end
