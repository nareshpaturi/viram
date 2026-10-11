// Renders the store screenshots: each raw capture framed on the Soft Light
// wash with its caption. Flattened JPEG, no transparency, as both stores require.
//   ios      docs/store/screenshots/ios-raw/ → ios-6.9/, 1320 × 2868 (the 6.9"
//            iPhone size App Store Connect requires; it scales them down)
//   android  docs/store/play/raw/ → play/screenshots/, 1080 × 1920 (Play's 9:16)
// Run from the repo root: swift scripts/render-store-screenshots.swift ios|android
import AppKit
import CoreText

let android = CommandLine.arguments.dropFirst().first == "android"
let width = android ? 1080.0 : 1320.0, height = android ? 1920.0 : 2868.0
/// Type and spacing scale with the canvas; 1 is the iPhone size.
let k = android ? 0.72 : 1.0
let raw = android ? "docs/store/play/raw/" : "docs/store/screenshots/ios-raw/"
let out = android ? "docs/store/play/screenshots/" : "docs/store/screenshots/ios-6.9/"
for font in ["node_modules/@expo-google-fonts/newsreader/500Medium/Newsreader_500Medium.ttf", "node_modules/@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf"] {
  CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: font) as CFURL, .process, nil)
}

/// Each screen and what it says. Keep captions true to the 1.0 app.
let shots: [(file: String, title: String, line: String)] = [
  // Play discourages price words in graphics, so its first line leaves out “free”.
  ("1-breathe", "Pranayama, guided\nat your pace.", android ? "Gentle, private, and ready offline." : "Free, private, and ready offline."),
  ("2-practice", "A calm voice\nkeeps time.", "Even with your phone locked."),
  ("3-library", "Twelve gentle\ntechniques.", "Classical pranayama and modern patterns."),
  ("4-guide", "Learn each one\nproperly.", "Steps, care notes, and the sources."),
  android
    ? ("5-introduction", "Read along\nthe first time.", "A spoken introduction, with captions.")
    : ("5-settle", "Settle in,\nthen breathe.", "Its care note comes before you begin."),
]

func color(_ hex: String, _ alpha: Double = 1) -> NSColor {
  let v = Int(hex.dropFirst(), radix: 16)!
  return NSColor(srgbRed: Double((v >> 16) & 255) / 255, green: Double((v >> 8) & 255) / 255, blue: Double(v & 255) / 255, alpha: alpha)
}

func glow(_ ctx: CGContext, x: Double, y: Double, radius: Double, _ hex: String, _ alpha: Double) {
  let colors = [color(hex, alpha).cgColor, color(hex, 0).cgColor] as CFArray
  let gradient = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB), colors: colors, locations: [0, 1])!
  ctx.drawRadialGradient(gradient, startCenter: CGPoint(x: x, y: y), startRadius: 0, endCenter: CGPoint(x: x, y: y), endRadius: radius, options: [])
}

func centered(_ text: String, font: String, size: Double, hex: String, top: Double, lineHeight: Double) -> Double {
  let style = NSMutableParagraphStyle()
  style.alignment = .center
  style.minimumLineHeight = lineHeight
  style.maximumLineHeight = lineHeight
  let string = NSAttributedString(string: text, attributes: [.font: NSFont(name: font, size: size)!, .foregroundColor: color(hex), .paragraphStyle: style])
  let bounds = string.boundingRect(with: NSSize(width: width - 160, height: 1000), options: [.usesLineFragmentOrigin])
  string.draw(with: NSRect(x: 80, y: height - top - bounds.height, width: width - 160, height: bounds.height), options: [.usesLineFragmentOrigin])
  return top + bounds.height
}

for shot in shots {
  let image = NSImage(size: NSSize(width: width, height: height))
  image.lockFocus()
  let ctx = NSGraphicsContext.current!.cgContext

  // The day wash.
  let base = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB), colors: [color("#F8F7EE").cgColor, color("#EAF3EE").cgColor] as CFArray, locations: [0, 1])!
  ctx.drawLinearGradient(base, start: CGPoint(x: 0, y: height), end: CGPoint(x: 0, y: 0), options: [])
  glow(ctx, x: width, y: height, radius: 1400 * k, "#E4B84A", 0.24)
  glow(ctx, x: 0, y: 0, radius: 1600 * k, "#A8CFD0", 0.5)

  // Caption.
  let afterTitle = centered(shot.title, font: "Newsreader-Medium", size: 108 * k, hex: "#17211D", top: 150 * k, lineHeight: 118 * k)
  let afterLine = centered(shot.line, font: "DMSans-Regular", size: 46 * k, hex: "#47544D", top: afterTitle + 36 * k, lineHeight: 58 * k)

  // The screen, scaled to fit below the caption, with rounded corners and a soft pine shadow.
  let screen = NSImage(contentsOfFile: raw + shot.file + ".jpg")!
  let available = height - (afterLine + 90 * k) - 110 * k
  let scale = min(available / screen.size.height, (width - 220 * k) / screen.size.width)
  let w = screen.size.width * scale, h = screen.size.height * scale
  let frame = NSRect(x: (width - w) / 2, y: 110 * k, width: w, height: h)
  let radius = (android ? 40.0 : 96.0) * scale / 0.46
  ctx.saveGState()
  ctx.setShadow(offset: CGSize(width: 0, height: -30 * k), blur: 90 * k, color: color("#12372F", 0.28).cgColor)
  color("#FFFFFF").setFill()
  NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius).fill()
  ctx.restoreGState()
  NSGraphicsContext.saveGraphicsState()
  NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius).addClip()
  screen.draw(in: frame)
  NSGraphicsContext.restoreGraphicsState()
  color("#12372F", 0.12).setStroke()
  let rim = NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius)
  rim.lineWidth = 3
  rim.stroke()
  image.unlockFocus()

  // Exactly 1320 × 2868; JPEG flattens it, so there's no transparency.
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(width), pixelsHigh: Int(height), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  image.draw(in: NSRect(x: 0, y: 0, width: width, height: height))
  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.9])!.write(to: URL(fileURLWithPath: out + shot.file + ".jpg"))
  print("Wrote \(out)\(shot.file).jpg")
}
