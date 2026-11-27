import SwiftUI
import WebKit

// MeetCoder in Nievau (design-portfolio/DESIGN.md): a Royal field under tinted glass,
// Acid Lime as the one counter hue. Lime means "live / now": focus, the live dot (the one
// glow, after Hajsza), the open state and the "what is being coded" field.
// Ink always comes from the hue it sits on; colours match windows/src/renderer/styles.css.

enum Theme {
    static let night = Color(red: 0.028, green: 0.028, blue: 0.164)
    static let deep = Color(red: 0.055, green: 0.055, blue: 0.270)
    static let royal = Color(red: 0.098, green: 0.097, blue: 0.440)
    static let royalLift = Color(red: 0.169, green: 0.196, blue: 0.698)
    static let royalGlow = Color(red: 0.290, green: 0.357, blue: 0.999)
    static let royalInk = Color(red: 0.851, green: 0.859, blue: 0.948)
    static let royalInkSoft = Color(red: 0.706, green: 0.722, blue: 0.901)
    static let nitroDeep = Color(red: 0.579, green: 0.803, blue: 0.169)
    static let nitro = Color(red: 0.759, green: 0.956, blue: 0.198)
    static let nitroLift = Color(red: 0.881, green: 0.986, blue: 0.318)
    static let nitroInk = Color(red: 0.083, green: 0.143, blue: 0.024)
    static let nitroInkSoft = Color(red: 0.187, green: 0.269, blue: 0.088)
    /// Removal and failure only.
    static let raspberry = Color(red: 0.970, green: 0.551, blue: 0.608)

    static let mono = Font.system(size: 11.5, design: .monospaced)
    /// TeX Gyre Heros at 400 or 700 only.
    static func font(_ size: CGFloat, bold: Bool = false) -> Font {
        .custom(bold ? Typeface.bold : Typeface.regular, size: size)
    }
    static let spring = Animation.spring(response: 0.35, dampingFraction: 1)
    static let outExpo = Animation.timingCurve(0.16, 1, 0.3, 1, duration: 0.7)
}

/// A surface declares its hue once; ink, soft ink, ring, shade and diff colours follow.
struct Hue {
    var tint, lift, ink, inkSoft, ring, counterInk, shade, add, del: Color

    static let royal = Hue(tint: Theme.royal, lift: Theme.royalLift, ink: Theme.royalInk, inkSoft: Theme.royalInkSoft,
                           ring: Theme.nitro, counterInk: Theme.nitroInk, shade: Theme.night.opacity(0.78),
                           add: Theme.nitro, del: Theme.raspberry)
    static let nitro = Hue(tint: Theme.nitro, lift: Theme.nitroLift, ink: Theme.nitroInk, inkSoft: Theme.nitroInkSoft,
                           ring: Theme.royal, counterInk: Theme.royalInk, shade: Color(red: 0.31, green: 0.437, blue: 0.084).opacity(0.55),
                           add: Theme.nitroInk, del: Color(red: 0.617, green: 0.067, blue: 0.209))
}

private struct HueKey: EnvironmentKey { static let defaultValue = Hue.royal }
extension EnvironmentValues {
    var hue: Hue {
        get { self[HueKey.self] }
        set { self[HueKey.self] = newValue }
    }
}

/// Tinted glass: the hue lifted toward the light, a bright top edge, a long drop in the hue's own shade.
struct GlassBackground: View {
    var hue: Hue
    var radius: CGFloat = 24
    var field = false

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        ZStack {
            if field {
                shape.fill(LinearGradient(colors: [Theme.nitroLift, Theme.nitro, Theme.nitro], startPoint: .topLeading, endPoint: .bottomTrailing))
                shape.fill(RadialGradient(colors: [Theme.nitroLift.opacity(0.8), .clear], center: UnitPoint(x: 0.12, y: 0), startRadius: 0, endRadius: 320))
            } else {
                shape.fill(LinearGradient(stops: [.init(color: hue.lift.opacity(0.58), location: 0), .init(color: hue.tint.opacity(0.88), location: 0.62)],
                                          startPoint: UnitPoint(x: 0.2, y: 0), endPoint: UnitPoint(x: 0.8, y: 1)))
            }
            shape.strokeBorder(hue.ink.opacity(field ? 0.14 : 0.16))
            shape.strokeBorder(LinearGradient(stops: [.init(color: .white.opacity(field ? 0.45 : 0.2), location: 0), .init(color: .clear, location: 0.08)],
                                              startPoint: .top, endPoint: .bottom), lineWidth: 1)
        }
        .shadow(color: field ? Theme.night.opacity(0.9) : hue.shade, radius: 36, y: 26)
    }
}

/// Text links: bold ink, underlined on hover.
struct LinkButton: View {
    let title: String
    var soft = false
    let action: () -> Void
    @Environment(\.hue) private var hue
    @State private var hover = false
    var body: some View {
        Button(action: action) {
            Text(title).font(Theme.font(12.5, bold: true)).underline(hover)
                .foregroundStyle(soft ? hue.inkSoft : hue.ink)
        }
        .buttonStyle(.plain).onHover { hover = $0 }
    }
}

struct Card<Content: View, Trailing: View>: View {
    let title: String
    let icon: String
    var hue: Hue = .royal
    var field = false
    @ViewBuilder var trailing: () -> Trailing
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 12, weight: .semibold)).foregroundStyle(hue.inkSoft)
                Text(title).font(Theme.font(15, bold: true)).tracking(-0.1)
                Spacer()
                trailing()
            }
            .frame(minHeight: 28)
            content()
        }
        .padding(.horizontal, 18).padding(.top, 16).padding(.bottom, 18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .foregroundStyle(hue.ink)
        .tint(hue.ring)
        .environment(\.hue, hue)
        .background(GlassBackground(hue: hue, field: field))
        .animation(Theme.outExpo, value: field)
    }
}

/// Need chips: labels and menu triggers. A dashed edge marks something still undecided.
struct Chip: View {
    let icon: String
    let text: String
    var known = false
    var open = false
    @Environment(\.hue) private var hue
    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: icon).font(.system(size: 11, weight: .semibold)).foregroundStyle(known ? hue.ring : hue.inkSoft)
            Text(text).font(Theme.font(13)).lineLimit(1).foregroundStyle(open ? hue.inkSoft : hue.ink)
        }
        .padding(.leading, 12).padding(.trailing, 14).frame(height: 34)
        .overlay(Capsule().strokeBorder(hue.ink.opacity(0.28), style: StrokeStyle(lineWidth: 1, dash: open ? [3, 3] : [])))
        .contentShape(Capsule())
    }
}

struct PressScale: ButtonStyle {
    var amount: CGFloat = 0.97
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? amount : 1)
            .animation(configuration.isPressed ? .easeOut(duration: 0.09) : Theme.spring, value: configuration.isPressed)
    }
}

/// The pill: clear glass, bold label, the action waiting in a counter-hue chip at the end.
struct Pill: View {
    let title: String
    var icon: String? = nil
    var chipIcon: String? = nil
    var inverted = false
    var busy = false
    let action: () -> Void
    @Environment(\.hue) private var hue
    @Environment(\.isEnabled) private var enabled
    @State private var hover = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: chipIcon == nil ? 8 : 12) {
                if busy { ProgressView().controlSize(.small) }
                else if let icon { Image(systemName: icon).font(.system(size: 12, weight: .medium)).foregroundStyle(hue.inkSoft) }
                Text(title).font(Theme.font(13.5, bold: chipIcon != nil))
                if let chipIcon {
                    Image(systemName: chipIcon).font(.system(size: 10, weight: .bold))
                        .foregroundStyle(inverted ? hue.tint : hue.counterInk)
                        .frame(width: 32, height: 32)
                        .background(Circle().fill(inverted ? hue.ink : hue.ring))
                        .scaleEffect(hover ? 1.06 : 1).offset(x: hover ? 2 : 0, y: hover ? -1 : 0)
                }
            }
            .padding(.leading, 16).padding(.trailing, chipIcon == nil ? 16 : 4).frame(height: 40)
            .foregroundStyle(hue.ink)
            .background(
                Capsule().fill(hue.tint.opacity(0.5))
                    .overlay(Capsule().fill(LinearGradient(colors: [.white.opacity(0.16), .white.opacity(0.04)], startPoint: .top, endPoint: .bottom)))
                    .shadow(color: hue.shade, radius: 16, y: 12)
            )
            .overlay(Capsule().strokeBorder(hue.ink.opacity(hover ? 0.62 : 0.34)))
            .contentShape(Capsule())
            .opacity(enabled ? 1 : 0.55)
        }
        .buttonStyle(PressScale())
        .onHover { h in withAnimation(Theme.spring) { hover = h && enabled } }
    }
}

struct PulseDot: View {
    var active: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.hue) private var hue
    @State private var on = false
    var body: some View {
        Circle().fill(active ? Theme.nitro : hue.ink.opacity(0.35)).frame(width: 8, height: 8)
            .background(
                Circle().fill(Theme.nitro.opacity(active ? (on ? 0 : 0.55) : 0))
                    .scaleEffect(on && !reduceMotion ? 2.4 : 1.5)
            )
            .shadow(color: Theme.nitro.opacity(active ? 0.5 : 0), radius: on ? 6 : 2)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeOut(duration: 2.4).repeatForever(autoreverses: false)) { on = true }
            }
    }
}

/// Inset wells for the stream, logs and diffs.
struct Well: ViewModifier {
    var radius: CGFloat = 14
    func body(content: Content) -> some View {
        content.background(Theme.night.opacity(0.72), in: RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
}
extension View { func well(_ radius: CGFloat = 14) -> some View { modifier(Well(radius: radius)) } }

/// What is being coded condenses out of the blur it was made of.
struct Condense: ViewModifier {
    var amount: Double
    func body(content: Content) -> some View {
        content.blur(radius: 10 * amount).opacity(1 - 0.75 * amount).scaleEffect(1 - 0.025 * amount, anchor: .leading)
    }
}

// MARK: Dashboard

struct Dashboard: View {
    @EnvironmentObject var state: AppState
    @AppStorage("compact") private var compact = false
    @State private var showSettings = false

    var body: some View {
        VStack(spacing: 14) {
            TopBar(compact: $compact, showSettings: $showSettings)
            if compact {
                StreamCard().frame(height: 230)
                NowCodingCard()
            } else {
                HStack(spacing: 14) {
                    VStack(spacing: 14) {
                        StreamCard().frame(minHeight: 250)
                        NowCodingCard().fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(minWidth: 380, idealWidth: 430, maxWidth: 480)
                    VStack(spacing: 14) {
                        ChangeLogCard()
                        DevCard().frame(minHeight: 260, idealHeight: 320, maxHeight: 360)
                    }
                    NotesCard().frame(minWidth: 280, idealWidth: 330, maxWidth: 380)
                }
            }
            StatusBar()
        }
        .padding(.horizontal, 16).padding(.bottom, 14).padding(.top, 4)
        .foregroundStyle(Theme.royalInk)
        .tint(Theme.nitro)
        .environment(\.hue, .royal)
        .frame(minWidth: compact ? 400 : 1120, minHeight: compact ? 560 : 700)
        .background(
            ZStack {
                LinearGradient(colors: [Theme.deep, Theme.night], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.7))
                RadialGradient(colors: [Theme.royalLift.opacity(0.62), .clear], center: UnitPoint(x: 0.08, y: -0.08), startRadius: 0, endRadius: 780)
                RadialGradient(colors: [Theme.royalGlow.opacity(0.2), .clear], center: UnitPoint(x: 0.96, y: 1.08), startRadius: 0, endRadius: 640)
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
        .animation(.spring(response: 0.4, dampingFraction: 1), value: compact)
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
            Text("MeetCoder").font(Theme.font(19, bold: true)).tracking(-0.66).padding(.trailing, 8)
            Pill(title: state.running ? "Leállítás" : "Indítás", chipIcon: state.running ? "stop.fill" : "play.fill", inverted: state.running) {
                Task { if state.running { await state.stop() } else { await state.start() } }
            }

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
                .menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden).fixedSize()

                Chip(icon: "person.fill", text: state.presenter ?? "Nincs megosztó", known: state.presenter != nil, open: state.presenter == nil)
            }

            Menu {
                ForEach(state.projects) { p in
                    Button("\(p.name) — \(p.stackLabel)") { state.setCurrent(p) }
                }
                if state.projects.isEmpty { Text("Nincs projekt a mappában") }
                Divider()
                Button("Projektek újraolvasása") { state.rescan() }
            } label: {
                Chip(icon: state.current == nil ? "questionmark.folder" : "folder.fill",
                     text: state.current?.name ?? "Projekt: még nem dőlt el", known: state.current != nil, open: state.current == nil)
            }
            .menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden).fixedSize()

            Spacer()

            if !compact {
                Pill(title: "Projektfájlok letöltése (T:)", icon: "externaldrive.fill.badge.plus", busy: state.grabbing) {
                    Task { await state.grab() }
                }
                .disabled(state.grabbing)
            }
            IconButton(icon: compact ? "arrow.up.left.and.arrow.down.right" : "pip", help: compact ? "Teljes nézet" : "Kompakt nézet") { compact.toggle() }
            IconButton(icon: "gearshape.fill", help: "Beállítások") { showSettings = true }
        }
        .frame(height: 52)
    }
}

struct IconButton: View {
    let icon: String
    let help: String
    let action: () -> Void
    @Environment(\.hue) private var hue
    @State private var hover = false
    var body: some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 13, weight: .medium))
                .frame(width: 36, height: 36)
                .background(Circle().fill(hue.ink.opacity(hover ? 0.1 : 0)))
                .overlay(Circle().strokeBorder(hue.ink.opacity(hover ? 0.6 : 0.26)))
                .contentShape(Circle())
        }
        .buttonStyle(PressScale(amount: 0.94)).help(help).accessibilityLabel(help)
        .onHover { h in withAnimation(.easeOut(duration: 0.2)) { hover = h } }
    }
}

// MARK: Stream

struct StreamCard: View {
    @EnvironmentObject var state: AppState
    @ObservedObject var capture = AppState.shared.capture
    @State private var flash = false

    var body: some View {
        Card(title: "Élő közvetítés", icon: "dot.radiowaves.left.and.right") {
            HStack(spacing: 7) {
                PulseDot(active: capture.active)
                Text(capture.active ? "Élő" : "Szünetel").font(Theme.font(12.5, bold: capture.active))
                    .foregroundStyle(capture.active ? Theme.nitro : Theme.royalInkSoft)
            }
        } content: {
            ZStack {
                Color.clear.well()
                if capture.active {
                    LivePreview(feed: capture.feed)
                } else {
                    VStack(spacing: 10) {
                        Image(systemName: "rectangle.dashed.badge.record").font(.system(size: 28)).foregroundStyle(Theme.royalInk.opacity(0.45))
                        Text(capture.error ?? "Nyomd meg az Indítás gombot a Meet ablak figyeléséhez.")
                            .font(Theme.font(13)).foregroundStyle(capture.error == nil ? Theme.royalInkSoft : Theme.raspberry)
                            .multilineTextAlignment(.center).frame(maxWidth: 280).padding(.horizontal, 28)
                    }
                }
                if state.analysing {
                    VStack { Spacer(); HStack { Spacer()
                        HStack(spacing: 7) { ProgressView().controlSize(.mini); Text("\(state.analysingModel) elemez…").font(Theme.font(12)) }
                            .padding(.horizontal, 12).frame(height: 28)
                            .background(.ultraThinMaterial, in: Capsule())
                            .background(Theme.royal.opacity(0.6), in: Capsule())
                            .overlay(Capsule().strokeBorder(Theme.royalInk.opacity(0.22)))
                            .padding(10)
                    } }
                }
            }
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.nitro.opacity(flash ? 1 : 0), lineWidth: 2))
            .onChange(of: state.lastKeptAt) { _, _ in
                flash = true
                withAnimation(.timingCurve(0.16, 1, 0.3, 1, duration: 1.1)) { flash = false }
            }
            HStack(spacing: 12) {
                (Text("\(state.framesKept)").font(Theme.font(12.5, bold: true)).foregroundColor(Theme.royalInk) + Text(" változás észlelve"))
                (Text("\(state.framesAnalysed)").font(Theme.font(12.5, bold: true)).foregroundColor(Theme.royalInk) + Text(" elemezve"))
                Spacer()
                LinkButton(title: "Elemzés most") { state.analyseNow() }
                    .disabled(!state.running || state.analysing)
            }
            .font(Theme.font(12.5)).monospacedDigit().foregroundStyle(Theme.royalInkSoft)
        }
    }
}

/// Redraws at the capture rate on its own, so the rest of the stream card does not.
struct LivePreview: View {
    @ObservedObject var feed: PreviewFeed

    var body: some View {
        if let img = feed.image {
            Image(decorative: img, scale: 1).resizable().interpolation(.medium).aspectRatio(contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                .padding(4)
        }
    }
}

// MARK: Now coding

struct NowCodingCard: View {
    @EnvironmentObject var state: AppState
    @State private var manual = ""
    @FocusState private var focused: Bool

    var body: some View {
        let live = state.agent.active || !state.teacherArea.isEmpty
        let hue: Hue = live ? .nitro : .royal
        Card(title: "Most ezen dolgozunk", icon: "hammer.fill", hue: hue, field: live) {
            if state.agent.active {
                LinkButton(title: "Megszakítás") { state.stopAgent() }
            }
        } content: {
            VStack(alignment: .leading, spacing: 12) {
                ZStack(alignment: .leading) {
                    Text(state.teacherArea.isEmpty ? (state.current == nil ? "A projekt még nem dőlt el — csak jegyzetelek" : "Várakozás a tanár képernyőjére…") : state.teacherArea)
                        .font(Theme.font(state.teacherArea.isEmpty ? 20 : 26, bold: true))
                        .tracking(state.teacherArea.isEmpty ? -0.4 : -0.73)
                        .lineSpacing(-2)
                        .foregroundStyle(state.teacherArea.isEmpty ? hue.inkSoft : hue.ink)
                        .lineLimit(2).minimumScaleFactor(0.8)
                        .fixedSize(horizontal: false, vertical: true)
                        .id(state.teacherArea)
                        .transition(.asymmetric(insertion: .modifier(active: Condense(amount: 1), identity: Condense(amount: 0)), removal: .opacity))
                }
                .animation(Theme.outExpo, value: state.teacherArea)

                if let h = state.hint, state.current == nil {
                    Label("A képernyőn látott projekt: \(h)", systemImage: "questionmark.folder").font(Theme.font(12.5)).foregroundStyle(hue.inkSoft)
                }
                HStack(spacing: 10) {
                    if state.agent.active { ProgressView().controlSize(.small).tint(hue.ink) } else { Image(systemName: "moon.zzz.fill").foregroundStyle(hue.inkSoft).font(.system(size: 12)) }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(state.agent.active ? state.agent.title : "Az ügynök tétlen").font(Theme.font(13.5, bold: true)).lineLimit(1)
                        if !state.agent.step.isEmpty {
                            Text(state.agent.step).font(Theme.mono).foregroundStyle(hue.inkSoft).lineLimit(1).truncationMode(.middle)
                        }
                    }
                }
                .padding(.vertical, 10).frame(maxWidth: .infinity, alignment: .leading)
                .overlay(alignment: .top) { hue.ink.opacity(0.18).frame(height: 1) }
                .overlay(alignment: .bottom) { hue.ink.opacity(0.18).frame(height: 1) }

                if !state.agent.files.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(state.agent.files, id: \.self) { f in
                                let area = f == state.agent.area
                                Text(f).font(Theme.mono).padding(.horizontal, 10).frame(height: 24)
                                    .foregroundStyle(area ? hue.tint : hue.ink)
                                    .background(Capsule().fill(area ? hue.ink : .clear))
                                    .overlay(Capsule().strokeBorder(hue.ink.opacity(area ? 1 : 0.26)))
                            }
                        }
                    }
                }
                if let q = state.queued {
                    HStack {
                        Label("Sorban: \(q.title)", systemImage: "clock").font(Theme.font(12.5)).foregroundStyle(hue.inkSoft).lineLimit(1)
                        Spacer()
                        if !state.agent.active { LinkButton(title: "Futtatás") { state.runQueued() } }
                    }
                }
                Spacer(minLength: 0)
                HStack(spacing: 8) {
                    TextField("", text: $manual, prompt: Text("Saját utasítás, pl. „valósítsd meg, ami most a képernyőn van”").foregroundColor(hue.inkSoft))
                        .textFieldStyle(.plain).font(Theme.font(13)).focused($focused)
                        .onSubmit { send() }
                    Button(action: send) {
                        Image(systemName: "arrow.up").font(.system(size: 13, weight: .bold))
                            .foregroundStyle(hue.counterInk)
                            .frame(width: 36, height: 36).background(Circle().fill(hue.ring))
                    }
                    .buttonStyle(PressScale(amount: 0.92))
                    .disabled(manual.trimmingCharacters(in: .whitespaces).isEmpty)
                    .opacity(manual.trimmingCharacters(in: .whitespaces).isEmpty ? 0.3 : 1)
                    .accessibilityLabel("Utasítás küldése")
                }
                .padding(.leading, 16).padding(.trailing, 5).frame(height: 46)
                .background(Capsule().fill(hue.shade.opacity(focused ? 0.36 : 0.24)))
                .overlay(Capsule().strokeBorder(focused ? hue.ring : hue.ink.opacity(0.28)))
                .background(Capsule().stroke(hue.ring.opacity(focused ? 0.3 : 0), lineWidth: 8))
                .animation(.easeOut(duration: 0.2), value: focused)
            }
        }
    }

    private func send() {
        guard !manual.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        state.submitManual(manual); manual = ""
    }
}

// MARK: Change log

struct ChangeLogCard: View {
    @EnvironmentObject var state: AppState
    @State private var expanded: UUID?

    var body: some View {
        Card(title: "Változásnapló", icon: "list.bullet.rectangle.fill") {
            (Text("\(state.changes.count)").font(Theme.font(12.5, bold: true)).foregroundColor(Theme.royalInk) + Text(" módosítás"))
                .font(Theme.font(12.5)).monospacedDigit().foregroundStyle(Theme.royalInkSoft)
        } content: {
            if state.changes.isEmpty {
                VStack(spacing: 10) {
                    Spacer()
                    Image(systemName: "wand.and.stars").font(.system(size: 26)).foregroundStyle(Theme.royalInk.opacity(0.4))
                    Text("Itt jelennek meg a módosítások, MI által írt címekkel.").font(Theme.font(13)).foregroundStyle(Theme.royalInkSoft)
                        .multilineTextAlignment(.center).frame(maxWidth: 300)
                    if let f = state.feed.first { Text(f.text).font(Theme.font(12)).foregroundStyle(Theme.royalInkSoft).lineLimit(2).multilineTextAlignment(.center).frame(maxWidth: 360) }
                    Spacer()
                }.frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(state.changes.enumerated()), id: \.element.id) { i, c in
                            let open = expanded == c.id
                            let prevOpen = i > 0 && expanded == state.changes[i - 1].id
                            ChangeRow(entry: c, expanded: open, showRule: i > 0 && !open && !prevOpen) {
                                withAnimation(Theme.spring) { expanded = open ? nil : c.id }
                            }
                            .transition(.asymmetric(insertion: .modifier(active: Condense(amount: 1), identity: Condense(amount: 0)), removal: .opacity))
                        }
                    }
                    .animation(Theme.outExpo, value: state.changes.count)
                    .padding(.horizontal, 2)
                }
                .padding(.horizontal, -12)
            }
        }
    }
}

struct ChangeRow: View {
    @EnvironmentObject var state: AppState
    let entry: ChangeEntry
    let expanded: Bool
    var showRule = true
    let toggle: () -> Void
    @State private var hover = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(entry.header).font(Theme.font(15, bold: !entry.undone)).tracking(-0.12)
                    .strikethrough(entry.undone).foregroundStyle(entry.undone ? Theme.royalInkSoft : Theme.royalInk)
                Spacer()
                Text(entry.date, style: .time).font(Theme.font(12)).monospacedDigit().foregroundStyle(Theme.royalInkSoft)
            }
            HStack(spacing: 10) {
                Text(entry.project).font(Theme.font(12, bold: true)).foregroundStyle(Theme.royalInk)
                Text("\(entry.files.count) fájl").font(Theme.font(12)).monospacedDigit()
                Text("+\(entry.files.reduce(0) { $0 + $1.added })").font(Theme.mono).foregroundStyle(Hue.royal.add)
                Text("−\(entry.files.reduce(0) { $0 + $1.removed })").font(Theme.mono).foregroundStyle(Hue.royal.del)
                Spacer()
                if entry.undone { Text("Visszavonva").font(Theme.font(12)) }
                else { LinkButton(title: "Visszavonás", soft: true) { Task { await state.undo(entry) } } }
                Image(systemName: "chevron.down").font(.system(size: 10, weight: .bold)).rotationEffect(.degrees(expanded ? 180 : 0))
            }
            .foregroundStyle(Theme.royalInkSoft)
            if expanded {
                Group {
                    if !entry.summary.isEmpty {
                        Text(entry.summary).font(Theme.font(13)).foregroundStyle(Theme.royalInkSoft).frame(maxWidth: 560, alignment: .leading).padding(.top, 2)
                    }
                    ForEach(entry.files) { f in
                        HStack {
                            Text(f.path).font(Theme.mono).lineLimit(1).truncationMode(.middle)
                            Spacer()
                            Text("+\(f.added)").font(Theme.mono).foregroundStyle(Hue.royal.add)
                            Text("−\(f.removed)").font(Theme.mono).foregroundStyle(Hue.royal.del)
                        }
                    }
                    DiffView(diff: entry.diff).padding(.top, 4)
                }
                .transition(.modifier(active: Condense(amount: 1), identity: Condense(amount: 0)))
            }
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Theme.royalInk.opacity(expanded ? 0.08 : (hover ? 0.05 : 0))))
        .overlay(alignment: .top) { Theme.royalInk.opacity(showRule ? 0.14 : 0).frame(height: 1).padding(.horizontal, 12) }
        .contentShape(Rectangle())
        .onTapGesture(perform: toggle)
        .onHover { h in withAnimation(.easeOut(duration: 0.25)) { hover = h } }
    }
}

struct DiffView: View {
    let diff: String
    var body: some View {
        let lines = diff.split(separator: "\n", omittingEmptySubsequences: false).prefix(400).map(String.init)
        ScrollView(.horizontal, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(lines.enumerated()), id: \.offset) { _, l in
                    Text(l.isEmpty ? " " : l).font(Theme.mono).fontWeight(l.hasPrefix("@@") ? .bold : .regular)
                        .lineSpacing(2)
                        .foregroundStyle(color(l)).frame(maxWidth: .infinity, alignment: .leading)
                        .background(l.hasPrefix("+") && !l.hasPrefix("+++") ? Theme.nitro.opacity(0.09) : (l.hasPrefix("-") && !l.hasPrefix("---") ? Theme.raspberry.opacity(0.1) : .clear))
                }
            }.padding(.horizontal, 12).padding(.vertical, 10)
        }
        .well(12)
        .textSelection(.enabled)
    }
    private func color(_ l: String) -> Color {
        if l.hasPrefix("+++") || l.hasPrefix("---") || l.hasPrefix("diff ") || l.hasPrefix("index ") { return Theme.royalInk.opacity(0.5) }
        if l.hasPrefix("@@") { return Theme.royalInk }
        if l.hasPrefix("+") { return Hue.royal.add }
        if l.hasPrefix("-") { return Hue.royal.del }
        return Theme.royalInkSoft
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

/// Two-way switch: the chosen side fills with the ink.
struct Segmented: View {
    @Binding var selection: Int
    let labels: [String]
    var body: some View {
        HStack(spacing: 0) {
            ForEach(labels.indices, id: \.self) { i in
                let on = selection == i
                Button { withAnimation(Theme.spring) { selection = i } } label: {
                    Text(labels[i]).font(Theme.font(12, bold: on))
                        .foregroundStyle(on ? Theme.royal : Theme.royalInk)
                        .padding(.horizontal, 12).frame(minWidth: 74).frame(height: 26)
                        .background(Capsule().fill(on ? Theme.royalInk : .clear))
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
        .padding(3)
        .overlay(Capsule().strokeBorder(Theme.royalInk.opacity(0.24)))
    }
}

struct DevCard: View {
    @EnvironmentObject var state: AppState
    @ObservedObject var dev = AppState.shared.dev
    @State private var tab = 0

    var body: some View {
        Card(title: "Fejlesztői szerver", icon: "server.rack") {
            HStack(spacing: 12) {
                PulseDot(active: dev.running)
                Text(dev.url?.absoluteString ?? dev.status).font(Theme.mono).foregroundStyle(Theme.royalInkSoft).lineLimit(1).truncationMode(.middle)
                    .fixedSize(horizontal: dev.url == nil, vertical: false)
                Segmented(selection: $tab, labels: ["Előnézet", "Kimenet"])
                if let p = state.current {
                    LinkButton(title: dev.running ? "Leállítás" : "Indítás") { dev.running ? dev.stop() : dev.start(p) }
                }
            }
        } content: {
            if tab == 0 {
                if dev.url != nil {
                    WebPreview(url: dev.url, token: dev.reloadToken)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.royalInk.opacity(0.16)))
                } else {
                    VStack(spacing: 10) {
                        Spacer()
                        Image(systemName: "globe").font(.system(size: 24)).foregroundStyle(Theme.royalInk.opacity(0.4))
                        Text(state.current == nil ? "A szerver a projekt felismerése után indul." : dev.status).font(Theme.font(13)).foregroundStyle(Theme.royalInkSoft)
                        Spacer()
                    }.frame(maxWidth: .infinity)
                }
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ForEach(Array(dev.lines.enumerated()), id: \.offset) { i, l in
                                Text(l.isEmpty ? " " : l).font(Theme.mono).lineSpacing(2).foregroundStyle(Theme.royalInkSoft).frame(maxWidth: .infinity, alignment: .leading).id(i)
                            }
                        }.padding(.horizontal, 12).padding(.vertical, 10).textSelection(.enabled)
                    }
                    .well()
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
        Card(title: "Jegyzetek", icon: "note.text") {
            IconButton(icon: "arrow.up.forward.square", help: "Megnyitás a Finderben") {
                NSWorkspace.shared.selectFile(state.notesFile, inFileViewerRootedAtPath: "")
            }
        } content: {
            Text(state.notesFile.replacingOccurrences(of: NSHomeDirectory(), with: "~")).font(Theme.mono).foregroundStyle(Theme.royalInkSoft).lineLimit(1).truncationMode(.head)
                .padding(.bottom, 10).frame(maxWidth: .infinity, alignment: .leading)
                .overlay(alignment: .bottom) { Theme.royalInk.opacity(0.14).frame(height: 1) }
            if state.notes.isEmpty {
                VStack { Spacer(); Text("A jegyzetek itt frissülnek, ahogy a tanár képernyője változik.").font(Theme.font(13)).foregroundStyle(Theme.royalInkSoft).multilineTextAlignment(.center).frame(maxWidth: 260); Spacer() }.frame(maxWidth: .infinity)
            } else {
                NotesBody(notes: state.notes).equatable()
            }
        }
    }
}

/// The rendered notes. AppState publishes on every agent step and log line; this only
/// re-parses its Markdown when the notes text itself changes.
struct NotesBody: View, Equatable {
    let notes: String

    var body: some View {
        let lines = notes.split(separator: "\n", omittingEmptySubsequences: false).suffix(200).map(String.init)
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(Array(lines.enumerated()), id: \.offset) { i, l in noteLine(l).id(i) }
                }.frame(maxWidth: .infinity, alignment: .leading).textSelection(.enabled)
            }
            .onChange(of: notes) { _, _ in withAnimation { proxy.scrollTo(lines.count - 1, anchor: .bottom) } }
        }
    }

    @ViewBuilder private func noteLine(_ l: String) -> some View {
        if l.hasPrefix("### ") { Text(l.dropFirst(4)).font(Theme.font(13.5, bold: true)).padding(.top, 10) }
        else if l.hasPrefix("#") { Text(l.drop { $0 == "#" || $0 == " " }).font(Theme.font(17, bold: true)).tracking(-0.24).padding(.top, 10) }
        else if l.hasPrefix("```") { EmptyView() }
        else if l.hasPrefix("    ") || l.hasPrefix("\t") {
            Text(l).font(Theme.mono).foregroundStyle(Theme.royalInk).padding(.horizontal, 10).padding(.vertical, 1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.night.opacity(0.45), in: RoundedRectangle(cornerRadius: 6, style: .continuous))
        }
        else { Text((try? AttributedString(markdown: l, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))) ?? AttributedString(l)).font(Theme.font(13.5)).lineSpacing(3).foregroundStyle(Theme.royalInk) }
    }
}

// MARK: Status bar

struct StatusBar: View {
    @EnvironmentObject var state: AppState
    var body: some View {
        HStack(spacing: 18) {
            HStack(spacing: 7) {
                PulseDot(active: state.running)
                Text(state.running ? "Figyelés aktív" : "Leállítva").font(Theme.font(12, bold: state.running))
                    .foregroundStyle(state.running ? Theme.royalInk : Theme.royalInkSoft)
            }
            Text(state.modelLabel).lineLimit(1).foregroundStyle(Theme.royalInk)
                .padding(.horizontal, 12).frame(height: 26)
                .overlay(Capsule().strokeBorder(Theme.royalInk.opacity(0.28)))
            if let p = state.current { Text(p.stackLabel) }
            if let f = state.feed.first { Label(f.text, systemImage: f.icon).lineLimit(1).truncationMode(.tail) }
            Spacer()
            (Text("Jelzett költség ") + Text(String(format: "$%.2f", state.cost)).font(Theme.font(12, bold: true)).foregroundColor(state.capped ? Theme.raspberry : Theme.royalInk)
             + Text(String(format: " / $%.0f", state.settings.costCap)))
                .monospacedDigit()
                .foregroundStyle(state.capped ? Theme.raspberry : Theme.royalInkSoft)
        }
        .font(Theme.font(12)).foregroundStyle(Theme.royalInkSoft)
        .padding(.horizontal, 4).frame(minHeight: 26)
    }
}

// MARK: Settings

/// Fields in the brief: a well of the shade, an ink border, the counter hue when in use.
struct WellFieldStyle: TextFieldStyle {
    @FocusState private var focused: Bool
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .textFieldStyle(.plain).font(Theme.font(13.5)).focused($focused)
            .padding(.horizontal, 16).frame(height: 44)
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Theme.night.opacity(focused ? 0.5 : 0.36)))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(focused ? Theme.nitro : Theme.royalInk.opacity(0.28)))
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Theme.nitro.opacity(focused ? 0.3 : 0), lineWidth: 8))
            .animation(.easeOut(duration: 0.2), value: focused)
    }
}

struct SettingsSheet: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var groups = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Beállítások").font(Theme.font(26, bold: true)).tracking(-0.73)
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Modell").font(Theme.font(13.5, bold: true))
                    Spacer()
                    Button { Task { await state.refreshModels(force: true) } } label: {
                        Label("Modellek frissítése", systemImage: "arrow.clockwise").font(Theme.font(12.5, bold: true)).foregroundStyle(Theme.royalInkSoft)
                    }
                    .buttonStyle(.plain)
                    .help("Modellek és előfizetések frissítése")
                    .disabled(state.discoveringModels)
                }
                Picker("Modell", selection: Binding(get: { state.modelPreference }, set: { state.settings.modelSelection = $0 })) {
                    Text("Automatikus").tag("auto")
                    ForEach(state.catalog.choices) { choice in Text(choice.name).tag(choice.id) }
                    if state.modelPreference != "auto", !state.catalog.choices.contains(where: { $0.id == state.modelPreference }) {
                        Text("\(state.modelPreference) (nem elérhető)").tag(state.modelPreference)
                    }
                }
                .labelsHidden().pickerStyle(.menu).controlSize(.large)
                if state.effectiveModel == nil && !state.discoveringModels {
                    Text(AppState.noModel).font(Theme.font(12)).foregroundStyle(Theme.royalInkSoft)
                } else {
                    Text("Aktív: \(state.modelLabel)").font(Theme.font(12)).foregroundStyle(Theme.royalInkSoft)
                    if state.effectiveModel?.provider == .opencode {
                        Text("Az OpenCode a saját beállított modelljét és annak díjszabását használja.").font(Theme.font(12)).foregroundStyle(Theme.royalInkSoft)
                    }
                }
            }
            field("T: meghajtó helye", text: $state.settings.tPath, hint: "A megosztott tanári meghajtó csatolási pontja.")
            VStack(alignment: .leading, spacing: 6) {
                Text("Csoportnevek a T: meghajtón").font(Theme.font(13.5, bold: true))
                TextField("", text: $groups, prompt: Text("pl. 13A, 13ab, 11A_Web").foregroundColor(Theme.royalInkSoft)).textFieldStyle(WellFieldStyle())
                    .onChange(of: groups) { _, v in
                        state.settings.groups = v.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                    }
                Text("Vesszővel elválasztva. A tanár mappájában ezeket a mappaneveket keresem.").font(Theme.font(12)).foregroundStyle(Theme.royalInkSoft)
            }
            field("Projektek mappája", text: $state.settings.projectsRoot, hint: "Ide kerülnek a letöltött projektek és a napi jegyzetek.")
            VStack(spacing: 0) {
                Toggle("Önálló kódolás (jóváhagyás nélkül)", isOn: $state.settings.autoRun).frame(minHeight: 46)
                Theme.royalInk.opacity(0.16).frame(height: 1)
                Toggle("Projektfájlok automatikus letöltése, ha a projekt nincs meg", isOn: $state.settings.autoGrab).frame(minHeight: 46)
            }
            .toggleStyle(.switch).font(Theme.font(13.5))
            .overlay(alignment: .top) { Theme.royalInk.opacity(0.16).frame(height: 1) }
            .overlay(alignment: .bottom) { Theme.royalInk.opacity(0.16).frame(height: 1) }
            HStack(spacing: 14) {
                Text("Elemzés gyakorisága").font(Theme.font(13.5, bold: true)).frame(width: 190, alignment: .leading)
                Slider(value: $state.settings.intervalSec, in: 15...180, step: 15)
                Text("\(Int(state.settings.intervalSec)) mp").font(Theme.font(15, bold: true)).monospacedDigit().frame(width: 54, alignment: .trailing)
            }
            HStack(spacing: 14) {
                Text("Költségkeret alkalmanként").font(Theme.font(13.5, bold: true)).frame(width: 190, alignment: .leading)
                Slider(value: $state.settings.costCap, in: 1...30, step: 1)
                Text(String(format: "$%.0f", state.settings.costCap)).font(Theme.font(15, bold: true)).monospacedDigit().frame(width: 54, alignment: .trailing)
            }
            HStack {
                Spacer()
                Pill(title: "Kész", chipIcon: "checkmark") { state.bootstrap(); dismiss() }
                    .keyboardShortcut(.defaultAction)
            }
        }
        .padding(.horizontal, 30).padding(.top, 28).padding(.bottom, 26)
        .frame(minWidth: 420, idealWidth: 540, maxWidth: 580)
        .foregroundStyle(Theme.royalInk)
        .tint(Theme.nitro)
        .environment(\.hue, .royal)
        .background(
            ZStack {
                LinearGradient(colors: [Theme.royalLift.opacity(0.85), Theme.royal], startPoint: .topLeading, endPoint: UnitPoint(x: 0.6, y: 0.6))
                RadialGradient(colors: [Theme.royalLift.opacity(0.6), .clear], center: UnitPoint(x: 0.2, y: 0), startRadius: 0, endRadius: 420)
            }
            .ignoresSafeArea()
        )
        .onAppear { groups = state.settings.groups.joined(separator: ", ") }
        .task { await state.refreshModels(force: true) }
    }

    private func field(_ title: String, text: Binding<String>, hint: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(Theme.font(13.5, bold: true))
            TextField("", text: text).textFieldStyle(WellFieldStyle())
            Text(hint).font(Theme.font(12)).foregroundStyle(Theme.royalInkSoft)
        }
    }
}
