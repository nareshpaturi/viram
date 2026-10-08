import SwiftUI
import WidgetKit

/// What the app shares (src/widget/widget.ts).
struct WidgetData: Codable {
  let name: String
  let detail: String
  /// Opens the practice's settle countdown.
  let url: String
  /// "yyyy-MM-dd", local, or null before any practice.
  let lastPracticeDay: String?

  static let placeholder = WidgetData(name: "Sama Vritti", detail: "4 · 4 · 4 · 4 · 5 min", url: "viram:///", lastPracticeDay: nil)

  static func read() -> WidgetData {
    guard let json = UserDefaults(suiteName: "group.app.viram")?.string(forKey: "widget"),
      let data = json.data(using: .utf8),
      let decoded = try? JSONDecoder().decode(WidgetData.self, from: data)
    else { return .placeholder }
    return decoded
  }
}

struct BreatheEntry: TimelineEntry {
  let date: Date
  let data: WidgetData

  var practicedToday: Bool {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return data.lastPracticeDay == formatter.string(from: date)
  }
}

/// One entry now and one at midnight, so “Practiced today” turns over with the day; the app reloads on every change.
struct BreatheProvider: TimelineProvider {
  func placeholder(in context: Context) -> BreatheEntry { BreatheEntry(date: Date(), data: .placeholder) }

  func getSnapshot(in context: Context, completion: @escaping (BreatheEntry) -> Void) {
    completion(BreatheEntry(date: Date(), data: context.isPreview ? .placeholder : .read()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<BreatheEntry>) -> Void) {
    let data = WidgetData.read()
    let now = Date()
    let midnight = Calendar.current.startOfDay(for: now.addingTimeInterval(86_400))
    completion(Timeline(entries: [BreatheEntry(date: now, data: data), BreatheEntry(date: midnight, data: data)], policy: .atEnd))
  }
}

struct BreatheView: View {
  @Environment(\.widgetFamily) private var family
  let entry: BreatheEntry

  var body: some View {
    Group {
      switch family {
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          Image(systemName: entry.practicedToday ? "checkmark" : "wind")
            .font(.title3)
        }
        .accessibilityLabel(entry.practicedToday ? "Practiced today. Begin \(entry.data.name)" : "Begin \(entry.data.name)")
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          Text(entry.practicedToday ? "Practiced today ✓" : "Breathe").font(.caption2)
          Text(entry.data.name).font(.headline).lineLimit(1)
          Text(entry.data.detail).font(.caption).lineLimit(1)
        }
      default:
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 6) {
            Circle().fill(Color("coral")).frame(width: 8, height: 8)
            Text(entry.practicedToday ? "Practiced today ✓" : "Breathe")
              .font(.caption)
              .foregroundStyle(Color("sky"))
          }
          Spacer(minLength: 0)
          Text(entry.data.name)
            .font(.system(.headline, design: .serif))
            .foregroundStyle(Color("mist"))
            .lineLimit(2)
          Text(entry.data.detail)
            .font(.caption)
            .foregroundStyle(Color("soft"))
            .lineLimit(family == .systemSmall ? 2 : 1)
          if family != .systemSmall {
            Text("Tap to begin")
              .font(.caption2.weight(.semibold))
              .foregroundStyle(Color("pine"))
              .padding(.horizontal, 10)
              .padding(.vertical, 4)
              .background(Capsule().fill(Color("sky")))
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Begin \(entry.data.name), \(entry.data.detail)\(entry.practicedToday ? ". Practiced today." : "")")
      }
    }
    .widgetURL(URL(string: entry.data.url))
    .containerBackground(for: .widget) { Color("pine") }
  }
}

@main
struct BreatheWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "Breathe", provider: BreatheProvider()) { entry in
      BreatheView(entry: entry)
    }
    .configurationDisplayName("Breathe")
    .description("Your ready practice, one tap from beginning.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
  }
}
