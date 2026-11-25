import Foundation

/// Runs the project's dev servers and exposes their output. C# services are never run or built.
final class DevServer: ObservableObject {
    @Published var lines: [String] = []
    @Published var url: URL?
    @Published var status = "Nem fut"
    @Published var running = false
    @Published var reloadToken = 0

    private var procs: [StreamProc] = []
    private var projectPath: String?

    private func script(for s: Service) -> String? {
        switch s.kind {
        case "next", "node":
            let pkg = (try? String(contentsOfFile: s.dir + "/package.json", encoding: .utf8)) ?? ""
            let run: String
            if pkg.contains("\"dev\"") { run = "npm run dev" }
            else if pkg.contains("\"start\"") { run = "npm start" }
            else if let f = ["server.js", "index.js", "app.js", "src/index.js", "src/server.js"].first(where: { FileManager.default.fileExists(atPath: s.dir + "/" + $0) }) { run = "node --watch \(f)" }
            else { return nil }
            return "[ -d node_modules ] || npm install --no-audit --no-fund; exec \(run)"
        case "laravel":
            return """
            [ -d vendor ] || composer install --no-interaction --no-progress
            [ -f .env ] || { [ -f .env.example ] && cp .env.example .env && php artisan key:generate; }
            if [ -f package.json ]; then [ -d node_modules ] || npm install --no-audit --no-fund; (npm run dev 2>&1 | sed 's/^/[vite] /') & fi
            exec php artisan serve
            """
        default:
            return nil   // csharp: write code only
        }
    }

    private static let urlRegex = try! NSRegularExpression(pattern: #"https?://(localhost|127\.0\.0\.1|\[::1\]):\d+"#)
    private static let ansi = try! NSRegularExpression(pattern: "\u{1B}\\[[0-9;?]*[A-Za-z]")

    func start(_ project: Project) {
        if projectPath == project.path, running { return }
        stop()
        projectPath = project.path
        lines = []
        url = nil
        let runnable = project.services.compactMap { s in script(for: s).map { (s, $0) } }
        if runnable.isEmpty {
            status = project.hasCSharp ? "C# projekt — csak kódírás, nincs futtatás" : "Nincs indítható szerver"
            return
        }
        running = true
        status = "Indítás…"
        for (svc, sh) in runnable {
            let label = runnable.count > 1 ? "[\((svc.dir as NSString).lastPathComponent)] " : ""
            let proc = StreamProc()
            procs.append(proc)
            let path = project.path
            Task {
                let code = await proc.run(["/bin/zsh", "-c", sh], cwd: svc.dir) { [weak self] raw in
                    let ns = raw as NSString
                    let line = DevServer.ansi.stringByReplacingMatches(in: raw, range: NSRange(location: 0, length: ns.length), withTemplate: "")
                    DispatchQueue.main.async {
                        guard let self, self.projectPath == path else { return }
                        self.lines.append(label + line)
                        if self.lines.count > 400 { self.lines.removeFirst(self.lines.count - 400) }
                        guard !line.hasPrefix("[vite]"), self.url == nil || svc.kind == "next" || svc.kind == "laravel" else { return }
                        let r = NSRange(location: 0, length: (line as NSString).length)
                        if let m = DevServer.urlRegex.firstMatch(in: line, range: r), self.url == nil || line.contains("Server running") || line.contains("Local") {
                            self.url = URL(string: (line as NSString).substring(with: m.range))
                            self.status = "Fut"
                        }
                    }
                }
                await MainActor.run { [weak self] in
                    guard let self, self.projectPath == path else { return }
                    self.lines.append(label + "— leállt (kód: \(code))")
                    if !self.procs.contains(where: { $0.isRunning }) { self.running = false; self.status = "Leállt" }
                }
            }
        }
    }

    func stop() {
        procs.forEach { $0.terminate() }
        procs = []
        projectPath = nil
        running = false
        url = nil
        status = "Nem fut"
    }

    func reload() { reloadToken += 1 }
}
