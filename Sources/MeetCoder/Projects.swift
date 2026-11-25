import Foundation

enum ProjectStore {
    static let fm = FileManager.default
    static let heavy: Set<String> = ["node_modules", "vendor", ".next", "obj", "dist", "build", ".git", ".vs", ".idea", "storage", ".meetcoder", "notes"]

    static func dirs(_ path: String) -> [String] {
        ((try? fm.contentsOfDirectory(atPath: path)) ?? []).filter { n in
            var isDir: ObjCBool = false
            return !n.hasPrefix(".") && fm.fileExists(atPath: path + "/" + n, isDirectory: &isDir) && isDir.boolValue
        }.sorted()
    }

    static func files(_ path: String) -> [String] {
        ((try? fm.contentsOfDirectory(atPath: path)) ?? []).filter { !$0.hasPrefix(".") }.sorted()
    }

    private static func kind(of dir: String) -> String? {
        let names = (try? fm.contentsOfDirectory(atPath: dir)) ?? []
        if names.contains(where: { $0.hasSuffix(".csproj") || $0.hasSuffix(".sln") }) { return "csharp" }
        if names.contains("artisan") { return "laravel" }
        if names.contains("package.json") {
            let txt = (try? String(contentsOfFile: dir + "/package.json", encoding: .utf8)) ?? ""
            return txt.contains("\"next\"") ? "next" : "node"
        }
        return nil
    }

    /// Looks at the project folder and one level below for known stacks.
    static func services(in path: String) -> [Service] {
        var out: [Service] = []
        if let k = kind(of: path) { out.append(Service(kind: k, dir: path)) }
        for d in dirs(path) where !heavy.contains(d) {
            let sub = path + "/" + d
            if let k = kind(of: sub) { out.append(Service(kind: k, dir: sub)) }
            else if out.isEmpty {
                for d2 in dirs(sub) where !heavy.contains(d2) {
                    if let k = kind(of: sub + "/" + d2) { out.append(Service(kind: k, dir: sub + "/" + d2)) }
                }
            }
        }
        return out
    }

    static func registryFile(_ root: String) -> String { root + "/.meetcoder/projects.json" }

    /// Scans the projects root and merges what it finds with the saved registry.
    static func scan(root: String) -> [Project] {
        try? fm.createDirectory(atPath: root + "/.meetcoder", withIntermediateDirectories: true)
        var saved: [String: Project] = [:]
        if let d = fm.contents(atPath: registryFile(root)), let list = try? JSONDecoder().decode([Project].self, from: d) {
            for p in list { saved[p.path] = p }
        }
        var out: [Project] = []
        for name in dirs(root) {
            let path = root + "/" + name
            var p = saved[path] ?? Project(name: name, path: path)
            p.services = services(in: path)
            p.topFiles = Array(files(path).filter { !heavy.contains($0) }.prefix(25))
            out.append(p)
        }
        save(out, root: root)
        return out
    }

    static func save(_ projects: [Project], root: String) {
        let enc = JSONEncoder()
        enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        if let d = try? enc.encode(projects) { try? d.write(to: URL(fileURLWithPath: registryFile(root))) }
    }

    // MARK: Notes

    static var today: String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; return f.string(from: Date())
    }

    static func notesFile(root: String, project: Project?) -> String {
        if let p = project {
            try? fm.createDirectory(atPath: p.path + "/notes", withIntermediateDirectories: true)
            return p.path + "/notes/\(today).md"
        }
        return root + "/\(today).md"
    }

    static func append(_ text: String, to file: String, title: String) {
        var body = (try? String(contentsOfFile: file, encoding: .utf8)) ?? "# \(title)\n"
        if !body.hasSuffix("\n") { body += "\n" }
        body += text + "\n"
        try? body.write(toFile: file, atomically: true, encoding: .utf8)
    }

    /// Once the project is known, notes taken in the root for today move into the project.
    static func moveRootNotes(root: String, into project: Project) {
        let src = notesFile(root: root, project: nil)
        guard let txt = try? String(contentsOfFile: src, encoding: .utf8) else { return }
        let lines = txt.split(separator: "\n", omittingEmptySubsequences: false).drop { $0.hasPrefix("# ") }
        append(lines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines),
               to: notesFile(root: root, project: project), title: "Jegyzetek — \(today)")
        try? fm.removeItem(atPath: src)
    }
}

/// A private history kept outside the project so every change can be shown and undone without branches.
enum Shadow {
    private static func gitDir(_ p: Project) -> String {
        Paths.shadow + "/" + p.path.replacingOccurrences(of: "/", with: "_") + ".git"
    }

    private static func git(_ p: Project, _ args: [String]) async -> (code: Int32, out: String, err: String) {
        await Shell.run("git", ["--git-dir", gitDir(p), "--work-tree", p.path,
                                "-c", "user.name=MeetCoder", "-c", "user.email=meetcoder@local",
                                "-c", "core.quotepath=false"] + args, cwd: p.path)
    }

    static func prepare(_ p: Project) async {
        let dir = gitDir(p)
        if !FileManager.default.fileExists(atPath: dir + "/HEAD") {
            _ = await git(p, ["init", "-q"])
            let exclude = ["node_modules/", "vendor/", ".next/", "bin/Debug/", "bin/Release/", "obj/", "dist/", "build/",
                           ".vs/", ".idea/", "storage/", "*.log", ".env", ".git/", ".DS_Store", "notes/"].joined(separator: "\n")
            try? FileManager.default.createDirectory(atPath: dir + "/info", withIntermediateDirectories: true)
            try? exclude.write(toFile: dir + "/info/exclude", atomically: true, encoding: .utf8)
        }
        _ = await git(p, ["add", "-A"])
        _ = await git(p, ["commit", "-q", "--allow-empty", "-m", "snapshot"])
    }

    /// Records whatever changed since `prepare`. Returns nil if nothing did.
    static func record(_ p: Project, message: String) async -> (files: [FileStat], diff: String, commit: String)? {
        _ = await git(p, ["add", "-A"])
        let stat = await git(p, ["diff", "--cached", "--numstat"])
        let files: [FileStat] = stat.out.split(separator: "\n").compactMap { line in
            let parts = line.split(separator: "\t", maxSplits: 2).map(String.init)
            guard parts.count == 3 else { return nil }
            return FileStat(path: parts[2], added: Int(parts[0]) ?? 0, removed: Int(parts[1]) ?? 0)
        }
        guard !files.isEmpty else { return nil }
        let diff = await git(p, ["diff", "--cached", "--no-color", "-U2"])
        _ = await git(p, ["commit", "-q", "-m", message])
        let head = await git(p, ["rev-parse", "HEAD"])
        return (files, diff.out.head(60_000), head.out.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    static func undo(_ p: Project, commit: String) async -> Bool {
        let r = await git(p, ["revert", "--no-edit", commit])
        if r.code != 0 { _ = await git(p, ["revert", "--abort"]) }
        return r.code == 0
    }
}
