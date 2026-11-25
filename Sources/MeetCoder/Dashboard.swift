import SwiftUI
import WebKit

enum Theme {
    static let bg = Color(red: 0.035, green: 0.043, blue: 0.063)
    static let card = Color(red: 0.075, green: 0.086, blue: 0.118)
    static let stroke = Color.white.opacity(0.07)
    static let accent = Color(red: 0.36, green: 0.93, blue: 0.72)
    static let ai = Color(red: 0.62, green: 0.56, blue: 1.0)
    static let warn = Color(red: 1.0, green: 0.72, blue: 0.35)
    static let add = Color(red: 0.40, green: 0.87, blue: 0.55)
    static let del = Color(red: 1.0, green: 0.45, blue: 0.47)
    static let dim = Color.white.opacity(0.5)
    static let mono = Font.system(size: 11.5, design: .monospaced)
}

struct Card<Content: View, Trailing: View>: View {
    let title: String
    let icon: String
    var tint: Color = Theme.dim
    @ViewBuilder var trailing: () -> Trailing
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                Image(systemName: icon).font(.system(size: 11, weight: .semibold)).foregroundStyle(tint)
                Text(title.uppercased()).font(.system(size: 10.5, weight: .semibold)).tracking(0.9).foregroundStyle(Theme.dim)
                Spacer()
                trailing()
            }
            content()
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.stroke))
    }
}

struct Chip: View {
    let icon: String
    let text: String
    var tint: Color = .white
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 10.5, weight: .semibold)).foregroundStyle(tint)
            Text(text).font(.system(size: 12, weight: .medium)).lineLimit(1)
        }
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Color.white.opacity(0.06), in: Capsule())
        .overlay(Capsule().strokeBorder(Theme.stroke))
    }
}

struct PulseDot: View {
    var color: Color
    var active: Bool
    @State private var on = false
    var body: some View {
        Circle().fill(color).frame(width: 7, height: 7)
            .shadow(color: color.opacity(active ? 0.9 : 0), radius: on ? 6 : 1)
            .opacity(active ? (on ? 1 : 0.45) : 0.35)
            .onAppear { withAnimation(.easeInOut(duration: 0.9).repeatForever()) { on = true } }
    }
}

// MARK: Dashboard

struct Dashboard: View {
    @EnvironmentObject var state: AppState
    @AppStorage("compact") private var compact = false
    @State private var showSettings = false

    var body: some View {
        VStack(spacing: 12) {
            TopBar(compact: $compact, showSettings: $showSettings)
            if compact {
                StreamCard().frame(height: 230)
                NowCodingCard()
            } else {
                HStack(spacing: 12) {
                    VStack(spacing: 12) {
                        StreamCard().frame(minHeight: 250)
                        NowCodingCard().frame(height: 250)
                    }
                    .frame(minWidth: 380, idealWidth: 430, maxWidth: 480)
                    VStack(spacing: 12) {
                        ChangeLogCard()
                        DevCard().frame(minHeight: 260, idealHeight: 320, maxHeight: 360)
                    }
                    NotesCard().frame(minWidth: 280, idealWidth: 330, maxWidth: 380)
                }
            }
            StatusBar()
        }
        .padding(.horizontal, 14).padding(.bottom, 12).padding(.top, 6)
        .frame(minWidth: compact ? 400 : 1120, minHeight: compact ? 560 : 700)
        .background(
            ZStack {
                Theme.bg
                RadialGradient(colors: [Theme.ai.opacity(0.10), .clear], center: .topLeading, startRadius: 0, endRadius: 700)
                RadialGradient(colors: [Theme.accent.opacity(0.06), .clear], center: .bottomTrailing, startRadius: 0, endRadius: 600)
            }.ignoresSafeArea()
        )
        .sheet(isPresented: $showSettings) { SettingsSheet().environmentObject(state) }
        .onChange(of: compact) { _, c in
            for w in NSApp.windows where w.identifier?.rawValue.contains("dashboard") == true || w.title == "MeetCoder" {
                w.level = c ? .floating : .normal
                var f = w.frame
                let size = c ? NSSize(width: 420, height: 620) : NSSize(width: 1380, height: 860)
                f.origin.y += f.height - size.height
                f.size = size
                w.setFrame(f, display: true, animate: true)
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: compact)
    }
}

struct TopBar: View {
    @EnvironmentObject var state: AppState
    @ObservedObject var capture = AppState.shared.capture
    @Binding var compact: Bool
    @Binding var showSettings: Bool

    var body: some View {
        HStack(spacing: 10) {
            Spacer().frame(width: 64)   // traffic lights
            HStack(spacing: 7) {
                Image(systemName: "sparkles.rectangle.stack.fill").foregroundStyle(Theme.accent)
                Text("MeetCoder").font(.system(size: 15, weight: .bold))
            }
            Button {
                Task { if state.running { await state.stop() } else { await state.start() } }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: state.running ? "stop.fill" : "play.fill").font(.system(size: 10))
                    Text(state.running ? "Leállítás" : "Indítás").font(.system(size: 12.5, weight: .semibold))
                }
                .padding(.horizontal, 14).padding(.vertical, 7)
                .background(state.running ? Theme.del.opacity(0.18) : Theme.accent, in: Capsule())
                .foregroundStyle(state.running ? Theme.del : .black)
            }
            .buttonStyle(.plain)

            if !compact {
                Menu {
                    ForEach(capture.windows, id: \.windowID) { w in
                        Button("\(w.owningApplication?.applicationName ?? "") — \((w.title ?? "").head(60))") {
                            Task { await state.switchWindow(w) }
                        }
                    }
                    Divider()
                    Button("Ablaklista frissítése") { Task { await capture.refreshWindows() } }
                } label: {
                    Chip(icon: "macwindow", text: capture.active ? capture.windowTitle.head(34) : "Ablak kiválasztása")
                }
                .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()

                Chip(icon: "person.fill", text: state.presenter ?? "Nincs megosztó", tint: state.presenter == nil ? Theme.dim : Theme.ai)
            }

            Menu {
                ForEach(state.projects) { p in
                    Button("\(p.name) — \(p.stackLabel)") { state.setCurrent(p) }
                }
                if state.projects.isEmpty { Text("Nincs projekt a mappában") }
                Divider()
                Button("Projektek újraolvasása") { state.rescan() }
            } label: {
                Chip(icon: "folder.fill", text: state.current?.name ?? "Projekt: még nem dőlt el", tint: state.current == nil ? Theme.warn : Theme.accent)
            }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()

            Spacer()

            if !compact {
                Button { Task { await state.grab() } } label: {
                    HStack(spacing: 6) {
                        if state.grabbing { ProgressView().controlSize(.small) } else { Image(systemName: "externaldrive.fill.badge.plus").font(.system(size: 11)) }
                        Text("Projektfájlok letöltése (T:)").font(.system(size: 12, weight: .medium))
                    }
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(Theme.ai.opacity(0.18), in: Capsule())
                    .overlay(Capsule().strokeBorder(Theme.ai.opacity(0.35)))
                }
                .buttonStyle(.plain).disabled(state.grabbing)
            }
            IconButton(icon: compact ? "arrow.up.left.and.arrow.down.right" : "pip", help: compact ? "Teljes nézet" : "Kompakt nézet") { compact.toggle() }
            IconButton(icon: "gearshape.fill", help: "Beállítások") { showSettings = true }
        }
        .frame(height: 38)
    }
}

struct IconButton: View {
    let icon: String
    let help: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 12, weight: .medium))
                .frame(width: 30, height: 30)
                .background(Color.white.opacity(0.06), in: Circle())
        }
        .buttonStyle(.plain).help(help)
    }
}

// MARK: Stream

struct StreamCard: View {
    @EnvironmentObject var state: AppState
    @ObservedObject var capture = AppState.shared.capture
    @State private var flash = false

    var body: some View {
        Card(title: "Élő közvetítés", icon: "dot.radiowaves.left.and.right", tint: capture.active ? Theme.del : Theme.dim) {
            HStack(spacing: 6) {
                PulseDot(color: Theme.del, active: capture.active)
                Text(capture.active ? "ÉLŐ" : "SZÜNET").font(.system(size: 10, weight: .bold)).foregroundStyle(capture.active ? Theme.del : Theme.dim)
            }
        } content: {
            ZStack {
                RoundedRectangle(cornerRadius: 9, style: .continuous).fill(Color.black.opacity(0.45))
                if let img = capture.preview, capture.active {
                    Image(decorative: img, scale: 1).resizable().aspectRatio(contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                        .padding(3)
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "rectangle.dashed.badge.record").font(.system(size: 28)).foregroundStyle(Theme.dim)
                        Text(capture.error ?? "Nyomd meg az Indítás gombot a Meet ablak figyeléséhez.")
                            .font(.system(size: 12)).foregroundStyle(capture.error == nil ? Theme.dim : Theme.warn)
                            .multilineTextAlignment(.center).padding(.horizontal, 20)
                    }
                }
                if state.analysing {
                    VStack { Spacer(); HStack { Spacer()
                        HStack(spacing: 6) { ProgressView().controlSize(.mini); Text("Sonnet elemez…").font(.system(size: 10.5, weight: .medium)) }
                            .padding(.horizontal, 9).padding(.vertical, 5).background(.ultraThinMaterial, in: Capsule()).padding(8)
                    } }
                }
            }
            .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).strokeBorder(Theme.accent.opacity(flash ? 0.9 : 0), lineWidth: 2))
            .onChange(of: state.lastKeptAt) { _, _ in
                flash = true
                withAnimation(.easeOut(duration: 1.1)) { flash = false }
            }
            HStack {
                Text("\(state.framesKept) változás észlelve · \(state.framesAnalysed) elemezve").font(.system(size: 11)).foregroundStyle(Theme.dim)
                Spacer()
                Button("Elemzés most") { state.analyseNow() }
                    .buttonStyle(.plain).font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.accent)
                    .disabled(!state.running || state.analysing)
            }
        }
    }
}

// MARK: Now coding

struct NowCodingCard: View {
    @EnvironmentObject var state: AppState
    @State private var manual = ""

    var body: some View {
        Card(title: "Most ezen dolgozunk", icon: "hammer.fill", tint: state.agent.active ? Theme.accent : Theme.dim) {
            if state.agent.active {
                Button("Megszakítás") { state.stopAgent() }.buttonStyle(.plain).font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.del)
            }
        } content: {
            VStack(alignment: .leading, spacing: 9) {
                Text(state.teacherArea.isEmpty ? (state.current == nil ? "A projekt még nem dőlt el — csak jegyzetelek" : "Várakozás a tanár képernyőjére…") : state.teacherArea)
                    .font(.system(size: 19, weight: .bold)).lineLimit(2).minimumScaleFactor(0.8)
                    .contentTransition(.opacity).animation(.easeInOut, value: state.teacherArea)
                if let h = state.hint, state.current == nil {
                    Label("A képernyőn látott projekt: \(h)", systemImage: "questionmark.folder").font(.system(size: 11.5)).foregroundStyle(Theme.warn)
                }
                HStack(spacing: 8) {
                    if state.agent.active { ProgressView().controlSize(.small) } else { Image(systemName: "moon.zzz.fill").foregroundStyle(Theme.dim).font(.system(size: 11)) }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(state.agent.active ? state.agent.title : "Az ügynök tétlen").font(.system(size: 12.5, weight: .semibold)).lineLimit(1)
                        Text(state.agent.step).font(Theme.mono).foregroundStyle(Theme.dim).lineLimit(1).truncationMode(.middle)
                    }
                }
                .padding(9).frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 9, style: .continuous))

                if !state.agent.files.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(state.agent.files, id: \.self) { f in
                                Text(f).font(Theme.mono).padding(.horizontal, 7).padding(.vertical, 3)
                                    .background((f == state.agent.area ? Theme.accent : Color.white).opacity(0.12), in: Capsule())
                            }
                        }
                    }
                }
                if let q = state.queued {
                    HStack {
                        Label("Sorban: \(q.title)", systemImage: "clock").font(.system(size: 11.5)).foregroundStyle(Theme.dim).lineLimit(1)
                        Spacer()
                        if !state.agent.active { Button("Futtatás") { state.runQueued() }.buttonStyle(.plain).font(.system(size: 11.5, weight: .semibold)).foregroundStyle(Theme.accent) }
                    }
                }
                Spacer(minLength: 0)
                HStack(spacing: 8) {
                    TextField("Saját utasítás, pl. „valósítsd meg, ami most a képernyőn van”", text: $manual)
                        .textFieldStyle(.plain).font(.system(size: 12.5))
                        .onSubmit { state.submitManual(manual); manual = "" }
                    Button { state.submitManual(manual); manual = "" } label: { Image(systemName: "arrow.up.circle.fill").font(.system(size: 18)) }
                        .buttonStyle(.plain).foregroundStyle(manual.isEmpty ? Theme.dim : Theme.accent)
                }
                .padding(.horizontal, 10).padding(.vertical, 7)
                .background(Color.black.opacity(0.3), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).strokeBorder(Theme.stroke))
            }
        }
    }
}

// MARK: Change log

struct ChangeLogCard: View {
    @EnvironmentObject var state: AppState
    @State private var expanded: UUID?

    var body: some View {
        Card(title: "Változásnapló", icon: "list.bullet.rectangle.fill", tint: Theme.ai) {
            Text("\(state.changes.count) módosítás").font(.system(size: 11)).foregroundStyle(Theme.dim)
        } content: {
            if state.changes.isEmpty {
                VStack(spacing: 10) {
                    Spacer()
                    Image(systemName: "wand.and.stars").font(.system(size: 26)).foregroundStyle(Theme.dim)
                    Text("Itt jelennek meg a módosítások, MI által írt címekkel.").font(.system(size: 12.5)).foregroundStyle(Theme.dim)
                    if let f = state.feed.first { Text(f.text).font(.system(size: 11.5)).foregroundStyle(Theme.dim.opacity(0.8)).lineLimit(2).multilineTextAlignment(.center) }
                    Spacer()
                }.frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        ForEach(state.changes) { c in
                            ChangeRow(entry: c, expanded: expanded == c.id) {
                                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { expanded = expanded == c.id ? nil : c.id }
                            }
                            .transition(.move(edge: .top).combined(with: .opacity))
                        }
                    }
                    .animation(.spring(response: 0.45, dampingFraction: 0.8), value: state.changes.count)
                }
            }
        }
    }
}

struct ChangeRow: View {
    @EnvironmentObject var state: AppState
    let entry: ChangeEntry
    let expanded: Bool
    let toggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Image(systemName: "sparkle").font(.system(size: 10)).foregroundStyle(Theme.ai)
                Text(entry.header).font(.system(size: 14, weight: .semibold)).strikethrough(entry.undone).foregroundStyle(entry.undone ? Theme.dim : .white)
                Spacer()
                Text(entry.date, style: .time).font(.system(size: 11)).foregroundStyle(Theme.dim)
            }
            HStack(spacing: 8) {
                Text(entry.project).font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.accent)
                Text("\(entry.files.count) fájl").font(.system(size: 11)).foregroundStyle(Theme.dim)
                Text("+\(entry.files.reduce(0) { $0 + $1.added })").font(Theme.mono).foregroundStyle(Theme.add)
                Text("−\(entry.files.reduce(0) { $0 + $1.removed })").font(Theme.mono).foregroundStyle(Theme.del)
                Spacer()
                if entry.undone { Text("visszavonva").font(.system(size: 11)).foregroundStyle(Theme.warn) }
                else { Button("Visszavonás") { Task { await state.undo(entry) } }.buttonStyle(.plain).font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.dim) }
                Image(systemName: "chevron.down").font(.system(size: 10, weight: .bold)).foregroundStyle(Theme.dim).rotationEffect(.degrees(expanded ? 180 : 0))
            }
            if expanded {
                if !entry.summary.isEmpty { Text(entry.summary).font(.system(size: 12)).foregroundStyle(.white.opacity(0.75)) }
                ForEach(entry.files) { f in
                    HStack { Text(f.path).font(Theme.mono); Spacer(); Text("+\(f.added)").font(Theme.mono).foregroundStyle(Theme.add); Text("−\(f.removed)").font(Theme.mono).foregroundStyle(Theme.del) }
                }
                DiffView(diff: entry.diff)
            }
        }
        .padding(11)
        .background(Color.white.opacity(expanded ? 0.06 : 0.035), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .contentShape(Rectangle())
        .onTapGesture(perform: toggle)
    }
}

struct DiffView: View {
    let diff: String
    var body: some View {
        let lines = diff.split(separator: "\n", omittingEmptySubsequences: false).prefix(400).map(String.init)
        ScrollView(.horizontal, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(lines.enumerated()), id: \.offset) { _, l in
                    Text(l.isEmpty ? " " : l).font(Theme.mono)
                        .foregroundStyle(color(l)).frame(maxWidth: .infinity, alignment: .leading)
                        .background(l.hasPrefix("+") && !l.hasPrefix("+++") ? Theme.add.opacity(0.08) : (l.hasPrefix("-") && !l.hasPrefix("---") ? Theme.del.opacity(0.08) : .clear))
                }
            }.padding(8)
        }
        .background(Color.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .textSelection(.enabled)
    }
    private func color(_ l: String) -> Color {
        if l.hasPrefix("+++") || l.hasPrefix("---") || l.hasPrefix("diff ") || l.hasPrefix("index ") { return Theme.dim }
        if l.hasPrefix("@@") { return Theme.ai }
        if l.hasPrefix("+") { return Theme.add }
        if l.hasPrefix("-") { return Theme.del }
        return .white.opacity(0.75)
    }
}

// MARK: Dev server

struct WebPreview: NSViewRepresentable {
    let url: URL?
    let token: Int
    final class Coordinator { var url: URL?; var token = 0 }
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeNSView(context: Context) -> WKWebView { WKWebView() }
    func updateNSView(_ v: WKWebView, context: Context) {
        let c = context.coordinator
        if c.url != url { c.url = url; if let url { v.load(URLRequest(url: url)) } }
        else if c.token != token { v.reload() }
        c.token = token
    }
}

struct DevCard: View {
    @EnvironmentObject var state: AppState
    @ObservedObject var dev = AppState.shared.dev
    @State private var tab = 0

    var body: some View {
        Card(title: "Fejlesztői szerver", icon: "server.rack", tint: dev.running ? Theme.accent : Theme.dim) {
            HStack(spacing: 10) {
                PulseDot(color: Theme.accent, active: dev.running)
                Text(dev.url?.absoluteString ?? dev.status).font(Theme.mono).foregroundStyle(Theme.dim)
                Picker("", selection: $tab) { Text("Előnézet").tag(0); Text("Kimenet").tag(1) }
                    .pickerStyle(.segmented).labelsHidden().frame(width: 150).controlSize(.small)
                if let p = state.current {
                    Button(dev.running ? "Leállítás" : "Indítás") { dev.running ? dev.stop() : dev.start(p) }
                        .buttonStyle(.plain).font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.accent)
                }
            }
        } content: {
            if tab == 0 {
                if dev.url != nil {
                    WebPreview(url: dev.url, token: dev.reloadToken).clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                } else {
                    VStack(spacing: 8) {
                        Spacer()
                        Image(systemName: "globe").font(.system(size: 24)).foregroundStyle(Theme.dim)
                        Text(state.current == nil ? "A szerver a projekt felismerése után indul." : dev.status).font(.system(size: 12.5)).foregroundStyle(Theme.dim)
                        Spacer()
                    }.frame(maxWidth: .infinity)
                }
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 1) {
                            ForEach(Array(dev.lines.enumerated()), id: \.offset) { i, l in
                                Text(l.isEmpty ? " " : l).font(Theme.mono).foregroundStyle(.white.opacity(0.78)).frame(maxWidth: .infinity, alignment: .leading).id(i)
                            }
                        }.padding(8).textSelection(.enabled)
                    }
                    .background(Color.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .onChange(of: dev.lines.count) { _, n in proxy.scrollTo(n - 1, anchor: .bottom) }
                }
            }
        }
    }
}

// MARK: Notes

struct NotesCard: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        let lines = state.notes.split(separator: "\n", omittingEmptySubsequences: false).suffix(200).map(String.init)
        Card(title: "Jegyzetek", icon: "note.text", tint: Theme.warn) {
            Button { NSWorkspace.shared.selectFile(state.notesFile, inFileViewerRootedAtPath: "") } label: { Image(systemName: "arrow.up.forward.square") }
                .buttonStyle(.plain).foregroundStyle(Theme.dim).help("Megnyitás a Finderben")
        } content: {
            Text(state.notesFile.replacingOccurrences(of: NSHomeDirectory(), with: "~")).font(Theme.mono).foregroundStyle(Theme.dim).lineLimit(1).truncationMode(.head)
            if state.notes.isEmpty {
                VStack { Spacer(); Text("A jegyzetek itt frissülnek, ahogy a tanár képernyője változik.").font(.system(size: 12.5)).foregroundStyle(Theme.dim).multilineTextAlignment(.center); Spacer() }.frame(maxWidth: .infinity)
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(Array(lines.enumerated()), id: \.offset) { i, l in noteLine(l).id(i) }
                        }.frame(maxWidth: .infinity, alignment: .leading).textSelection(.enabled)
                    }
                    .onChange(of: state.notes) { _, _ in withAnimation { proxy.scrollTo(lines.count - 1, anchor: .bottom) } }
                }
            }
        }
    }

    @ViewBuilder private func noteLine(_ l: String) -> some View {
        if l.hasPrefix("### ") { Text(l.dropFirst(4)).font(.system(size: 10.5, weight: .bold)).foregroundStyle(Theme.warn).padding(.top, 6) }
        else if l.hasPrefix("#") { Text(l.drop { $0 == "#" || $0 == " " }).font(.system(size: 14, weight: .bold)) }
        else if l.hasPrefix("```") { EmptyView() }
        else if l.hasPrefix("    ") || l.hasPrefix("\t") { Text(l).font(Theme.mono).foregroundStyle(Theme.accent.opacity(0.9)) }
        else { Text((try? AttributedString(markdown: l, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))) ?? AttributedString(l)).font(.system(size: 12.5)).foregroundStyle(.white.opacity(0.85)) }
    }
}

// MARK: Status bar

struct StatusBar: View {
    @EnvironmentObject var state: AppState
    var body: some View {
        HStack(spacing: 14) {
            HStack(spacing: 6) { PulseDot(color: Theme.accent, active: state.running); Text(state.running ? "Figyelés aktív" : "Leállítva") }
            Text("Sonnet 5.5 · közepes").padding(.horizontal, 8).padding(.vertical, 2).background(Theme.ai.opacity(0.18), in: Capsule()).foregroundStyle(Theme.ai)
            if let p = state.current { Text(p.stackLabel) }
            if let f = state.feed.first { Label(f.text, systemImage: f.icon).lineLimit(1).truncationMode(.tail) }
            Spacer()
            Text(String(format: "Költség: $%.2f / $%.0f", state.cost, state.settings.costCap)).foregroundStyle(state.capped ? Theme.del : Theme.dim)
        }
        .font(.system(size: 11)).foregroundStyle(Theme.dim)
        .padding(.horizontal, 4)
    }
}

// MARK: Settings

struct SettingsSheet: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var groups = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Beállítások").font(.system(size: 18, weight: .bold))
            field("T: meghajtó helye", text: $state.settings.tPath, hint: "A megosztott tanári meghajtó csatolási pontja.")
            VStack(alignment: .leading, spacing: 4) {
                Text("Csoportnevek a T: meghajtón").font(.system(size: 12, weight: .semibold))
                TextField("pl. 13A, 13ab, 11A_Web", text: $groups).textFieldStyle(.roundedBorder)
                    .onChange(of: groups) { _, v in
                        state.settings.groups = v.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                    }
                Text("Vesszővel elválasztva. A tanár mappájában ezeket a mappaneveket keresem.").font(.system(size: 11)).foregroundStyle(.secondary)
            }
            field("Projektek mappája", text: $state.settings.projectsRoot, hint: "Ide kerülnek a letöltött projektek és a napi jegyzetek.")
            Toggle("Önálló kódolás (jóváhagyás nélkül)", isOn: $state.settings.autoRun)
            Toggle("Projektfájlok automatikus letöltése, ha a projekt nincs meg", isOn: $state.settings.autoGrab)
            HStack {
                Text("Elemzés gyakorisága").font(.system(size: 12, weight: .semibold))
                Slider(value: $state.settings.intervalSec, in: 15...180, step: 15)
                Text("\(Int(state.settings.intervalSec)) mp").monospacedDigit().frame(width: 54, alignment: .trailing)
            }
            HStack {
                Text("Költségkeret alkalmanként").font(.system(size: 12, weight: .semibold))
                Slider(value: $state.settings.costCap, in: 1...30, step: 1)
                Text(String(format: "$%.0f", state.settings.costCap)).monospacedDigit().frame(width: 54, alignment: .trailing)
            }
            HStack { Spacer(); Button("Kész") { state.bootstrap(); dismiss() }.keyboardShortcut(.defaultAction) }
        }
        .padding(22).frame(width: 520)
        .onAppear { groups = state.settings.groups.joined(separator: ", ") }
    }

    private func field(_ title: String, text: Binding<String>, hint: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 12, weight: .semibold))
            TextField("", text: text).textFieldStyle(.roundedBorder)
            Text(hint).font(.system(size: 11)).foregroundStyle(.secondary)
        }
    }
}
