import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        Task { @MainActor in AppState.shared.bootstrap() }
    }
    func applicationWillTerminate(_ notification: Notification) {
        MainActor.assumeIsolated { AppState.shared.shutdown() }
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}

@main
struct MeetCoderApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var state = AppState.shared
    @Environment(\.openWindow) private var openWindow

    var body: some Scene {
        Window("MeetCoder", id: "dashboard") {
            Dashboard()
                .environmentObject(state)
                .preferredColorScheme(.dark)
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1380, height: 860)

        MenuBarExtra {
            Button(state.running ? "Figyelés leállítása" : "Figyelés indítása") {
                Task { if state.running { await state.stop() } else { await state.start() } }
            }
            Button("Irányítópult megnyitása") {
                openWindow(id: "dashboard")
                NSApp.activate(ignoringOtherApps: true)
            }
            Divider()
            if let p = state.current { Text("Projekt: \(p.name)") }
            if state.agent.active { Text(state.agent.step) }
            Divider()
            Button("Kilépés") { NSApp.terminate(nil) }.keyboardShortcut("q")
        } label: {
            Image(systemName: state.agent.active ? "hammer.circle.fill" : (state.running ? "record.circle.fill" : "record.circle"))
        }
    }
}
