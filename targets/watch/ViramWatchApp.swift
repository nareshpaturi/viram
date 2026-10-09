import SwiftUI

@main
struct ViramWatchApp: App {
  @StateObject private var connectivity = Connectivity.shared

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(connectivity)
        .onAppear { connectivity.activate() }
    }
  }
}

/// The practices the phone sent, Breathe's ready practice first. One tap begins.
struct RootView: View {
  @EnvironmentObject private var connectivity: Connectivity
  @State private var runner: PracticeRunner?

  var body: some View {
    NavigationStack {
      Group {
        if let practices = connectivity.context?.practices, !practices.isEmpty {
          List {
            ForEach(Array(practices.enumerated()), id: \.element.key) { index, practice in
              Button {
                begin(practice)
              } label: {
                VStack(alignment: .leading, spacing: 2) {
                  if index == 0 {
                    Text("Ready when you are").font(.caption2).foregroundStyle(Color("muted"))
                  }
                  Text(practice.name).font(.headline)
                  Text(practice.detail).font(.footnote).foregroundStyle(Color("mist"))
                }
                .padding(.vertical, 4)
              }
              .accessibilityHint("Begins after three seconds to settle")
            }
            Text("Your haptics follow Viram’s settings on your iPhone.")
              .font(.footnote)
              .foregroundStyle(Color("muted"))
              .listRowBackground(Color.clear)
          }
        } else {
          ScrollView {
            VStack(alignment: .leading, spacing: 8) {
              Text("A little space to breathe.").font(.headline)
              Text("Open Viram on your iPhone once to bring your practices here.")
                .font(.footnote)
                .foregroundStyle(Color("mist"))
            }
          }
        }
      }
      .navigationTitle("Viram")
    }
    .fullScreenCover(item: presented) { runner in
      PracticeView(runner: runner) { self.runner = nil }
    }
  }

  /// However the practice screen closes, a practice under way is ended and kept, never dropped (QA W01).
  private var presented: Binding<PracticeRunner?> {
    Binding(
      get: { runner },
      set: { next in
        if next == nil { runner?.close() }
        runner = next
      })
  }

  private func begin(_ practice: WatchPractice) {
    let next = PracticeRunner(practice: practice, haptics: connectivity.haptics) { session in
      Connectivity.shared.send(session)
    }
    runner = next
    next.begin()
  }
}
