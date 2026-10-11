// Renders site/img/og.jpg, the 1200 × 630 image link previews show for viram.app:
// the Soft Light day wash, the breathing disc, and the brand type. With `play`,
// renders Google Play's 1024 × 500 feature graphic instead, without price words
// (Play's metadata rules) and naming no platform.
// Run from the repo root: swift scripts/render-og-image.swift [play]
import AppKit
import CoreText

let play = CommandLine.arguments.dropFirst().first == "play"
let width = play ? 1024.0 : 1200.0, height = play ? 500.0 : 630.0
/// Everything is laid out for 1200 × 630 and scaled to the canvas height.
let k = height / 630
for font in ["node_modules/@expo-google-fonts/newsreader/500Medium/Newsreader_500Medium.ttf", "node_modules/@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf", "node_modules/@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf"] {
  CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: font) as CFURL, .process, nil)
}

func color(_ hex: String, _ alpha: Double = 1) -> NSColor {
  let v = Int(hex.dropFirst(), radix: 16)!
  return NSColor(srgbRed: Double((v >> 16) & 255) / 255, green: Double((v >> 8) & 255) / 255, blue: Double(v & 255) / 255, alpha: alpha)
}

func glow(_ ctx: CGContext, x: Double, y: Double, radius: Double, _ hex: String, _ alpha: Double) {
  let colors = [color(hex, alpha).cgColor, color(hex, 0).cgColor] as CFArray
  let gradient = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB), colors: colors, locations: [0, 1])!
  ctx.drawRadialGradient(gradient, startCenter: CGPoint(x: x, y: y), startRadius: 0, endCenter: CGPoint(x: x, y: y), endRadius: radius, options: [])
}

func text(_ string: String, font: String, size: Double, hex: String, at point: CGPoint, kern: Double = 0) {
  let attributes: [NSAttributedString.Key: Any] = [.font: NSFont(name: font, size: size)!, .foregroundColor: color(hex), .kern: kern]
  NSAttributedString(string: string, attributes: attributes).draw(at: point)
}

let image = NSImage(size: NSSize(width: width, height: height))
image.lockFocus()
let ctx = NSGraphicsContext.current!.cgContext

// The day wash: paper warmed at the top right, sky low on the left.
let base = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB), colors: [color("#F8F7EE").cgColor, color("#EAF3EE").cgColor] as CFArray, locations: [0, 1])!
ctx.drawLinearGradient(base, start: CGPoint(x: 0, y: height), end: CGPoint(x: 0, y: 0), options: [])
glow(ctx, x: width, y: height, radius: 700 * k, "#E4B84A", 0.26)
glow(ctx, x: 0, y: 0, radius: 760 * k, "#A8CFD0", 0.5)

// The breathing disc.
let cx = width - 225 * k, cy = height / 2, r = 190 * k
glow(ctx, x: cx, y: cy, radius: r * 1.45, "#A8CFD0", 0.55)
ctx.saveGState()
ctx.addEllipse(in: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
ctx.clip()
color("#F4F1E8").setFill()
CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2).fill()
glow(ctx, x: cx - r * 0.4, y: cy - r * 0.36, radius: r * 1.2, "#A8CFD0", 0.95)
glow(ctx, x: cx + r * 0.4, y: cy - r * 0.24, radius: r * 1.05, "#E46F51", 0.85)
glow(ctx, x: cx + r * 0.12, y: cy + r * 0.64, radius: r * 1.0, "#E4B84A", 0.8)
glow(ctx, x: cx - r * 0.32, y: cy + r * 0.44, radius: r * 0.75, "#FFFFFF", 0.9)
ctx.restoreGState()

// The mark, then the words.
let mark = NSImage(contentsOfFile: "site/img/icon-512.png")!
let markRect = NSRect(x: 80 * k, y: height - 144 * k, width: 64 * k, height: 64 * k)
NSBezierPath(roundedRect: markRect, xRadius: 15 * k, yRadius: 15 * k).addClip()
mark.draw(in: markRect)
NSGraphicsContext.current!.cgContext.resetClip()
text("Viram", font: "DMSans-SemiBold", size: 34 * k, hex: "#12372F", at: CGPoint(x: 160 * k, y: height - 130 * k))
text("Pranayama,", font: "Newsreader-Medium", size: 76 * k, hex: "#17211D", at: CGPoint(x: 80 * k, y: 300 * k))
text("guided at your pace.", font: "Newsreader-Medium", size: 76 * k, hex: "#17211D", at: CGPoint(x: 80 * k, y: 212 * k))
text(play ? "Gentle breathing, guided by voice" : "A free breathing app for iPhone and Android", font: "DMSans-Regular", size: 28 * k, hex: "#47544D", at: CGPoint(x: 82 * k, y: 150 * k))
text(play ? "TWELVE TECHNIQUES  ·  WORKS OFFLINE" : "NO ADS  ·  NO ACCOUNT  ·  WORKS OFFLINE", font: "DMSans-SemiBold", size: 20 * k, hex: "#963D29", at: CGPoint(x: 82 * k, y: 86 * k), kern: 1.6 * k)
image.unlockFocus()

let rep = NSBitmapImageRep(data: image.tiffRepresentation!)!
let scaled = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(width), pixelsHigh: Int(height), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: scaled)
rep.draw(in: NSRect(x: 0, y: 0, width: width, height: height))
NSGraphicsContext.restoreGraphicsState()
let output = play ? "docs/store/play/feature-graphic.jpg" : "site/img/og.jpg"
try! scaled.representation(using: .jpeg, properties: [.compressionFactor: play ? 0.9 : 0.82])!.write(to: URL(fileURLWithPath: output))
print("Wrote \(output)")
