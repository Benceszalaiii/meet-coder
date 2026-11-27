import Foundation

enum Paths {
    static let support: String = {
        let p = NSHomeDirectory() + "/Library/Application Support/MeetCoder"
        try? FileManager.default.createDirectory(atPath: p, withIntermediateDirectories: true)
        return p
    }()
    static let frames: String = {
        let p = support + "/frames"
        try? FileManager.default.createDirectory(atPath: p, withIntermediateDirectories: true)
        return p
    }()
    static let shadow: String = {
        let p = support + "/shadow"
        try? FileManager.default.createDirectory(atPath: p, withIntermediateDirectories: true)
        return p
    }()
    static func expand(_ p: String) -> String { (p as NSString).expandingTildeInPath }
}

struct Settings: Codable, Equatable {
    var tPath = "/Volumes/Diák közös informatika"
    var groups: [String] = []
    var projectsRoot = "~/school/projects"
    // Optional so existing settings files decode with automatic model selection.
    var modelSelection: String?
    var autoRun = true
    var autoGrab = true
    var intervalSec: Double = 45
    var costCap: Double = 5
    var teacherFolders: [String: String] = [:]   // presenter name -> folder on T:

    static let file = Paths.support + "/settings.json"
    static func load() -> Settings {
        guard let d = FileManager.default.contents(atPath: file),
              let s = try? JSONDecoder().decode(Settings.self, from: d) else { return Settings() }
        return s
    }
    func save() {
        if let d = try? JSONEncoder().encode(self) { try? d.write(to: URL(fileURLWithPath: Settings.file)) }
    }
    var root: String { Paths.expand(projectsRoot) }
}

struct Service: Codable, Equatable {
    var kind: String   // next, node, laravel, csharp
    var dir: String    // absolute
}

struct Project: Codable, Identifiable, Equatable {
    var id: String { path }
    var name: String
    var path: String
    var services: [Service] = []
    var teacher: String?
    var group: String?
    var lastActive: Date?
    var topFiles: [String] = []

    var stacks: [String] { Array(Set(services.map(\.kind))).sorted() }
    var hasCSharp: Bool { stacks.contains("csharp") }
    var stackLabel: String {
        stacks.isEmpty ? "unknown stack" : stacks.map {
            ["next": "Next.js", "node": "Express / Node", "laravel": "Laravel", "csharp": "C#"][$0] ?? $0
        }.joined(separator: " + ")
    }
}

struct FileStat: Identifiable, Equatable {
    var id: String { path }
    var path: String
    var added: Int
    var removed: Int
}

struct ChangeEntry: Identifiable, Equatable {
    let id = UUID()
    var date = Date()
    var header: String
    var summary: String
    var project: String
    var projectPath: String
    var files: [FileStat]
    var diff: String
    var commit: String
    var undone = false
}

struct CodingTask: Equatable {
    var title: String
    var instructions: String
    var framePath: String?
    var ocr: String
}

struct AgentStatus: Equatable {
    var active = false
    var title = ""
    var step = "Idle"
    var area = ""
    var files: [String] = []
    var startedAt: Date?
}

struct FeedItem: Identifiable, Equatable {
    let id = UUID()
    var date = Date()
    var icon: String
    var text: String
}

extension String {
    var folded: String { folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil).precomposedStringWithCanonicalMapping }
    func tail(_ n: Int) -> String { count > n ? String(suffix(n)) : self }
    func head(_ n: Int) -> String { count > n ? String(prefix(n)) : self }
}
