import Foundation

struct ClaudeResult {
    var structured: [String: Any]?
    var text = ""
    var cost = 0.0
    var error: String?
}

/// All model work goes through the locally installed Claude Code CLI, pinned to Sonnet 5.5 at medium effort.
enum Claude {
    static let model = "claude-sonnet-5-5"
    static let effort = "medium"

    private static let base = [
        "claude", "-p", "--model", model, "--effort", effort,
        "--safe-mode", "--strict-mcp-config", "--no-session-persistence",
    ]

    /// One-shot structured question. Read is the only tool (for the screenshot).
    static func ask(system: String, prompt: String, schema: String, readDirs: [String] = []) async -> ClaudeResult {
        var args = Array(base.dropFirst()) + [
            "--output-format", "json", "--tools", "Read", "--allowedTools", "Read",
            "--permission-prompts", "none", "--system-prompt", system, "--json-schema", schema,
        ]
        for d in readDirs { args += ["--add-dir", d] }
        let r = await Shell.run("claude", args, cwd: Paths.support, stdin: prompt)
        var res = ClaudeResult()
        guard let d = r.out.data(using: .utf8), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else {
            res.error = (r.err.isEmpty ? r.out : r.err).head(300)
            return res
        }
        res.cost = o["total_cost_usd"] as? Double ?? 0
        res.text = o["result"] as? String ?? ""
        res.structured = o["structured_output"] as? [String: Any]
        if res.structured == nil, let d2 = res.text.data(using: .utf8) {
            res.structured = try? JSONSerialization.jsonObject(with: d2) as? [String: Any]
        }
        if (o["is_error"] as? Bool) == true { res.error = res.text.head(300) }
        return res
    }

    /// Autonomous coding run inside a project folder. Events stream back as parsed JSON.
    static func agent(proc: StreamProc, cwd: String, prompt: String, system: String, allowCommands: Bool,
                      readDirs: [String], budget: Double, onEvent: @escaping ([String: Any]) -> Void) async -> ClaudeResult {
        var args = base + [
            "--output-format", "stream-json", "--verbose",
            "--permission-mode", "acceptEdits", "--permission-prompts", "none",
            "--append-system-prompt", system,
            "--max-budget-usd", String(format: "%.2f", max(0.2, budget)),
            "--disallowedTools", "WebFetch", "WebSearch", "Bash(dotnet *)", "Bash(git push *)", "Bash(rm -rf *)", "Bash(sudo *)", "Bash(curl *)",
        ]
        if allowCommands {
            args += ["--tools", "Read,Edit,Write,Glob,Grep,Bash",
                     "--allowedTools", "Read", "Edit", "Write", "Glob", "Grep",
                     "Bash(npm *)", "Bash(npx *)", "Bash(php artisan *)", "Bash(composer *)", "Bash(ls *)", "Bash(mkdir *)"]
        } else {
            args += ["--tools", "Read,Edit,Write,Glob,Grep", "--allowedTools", "Read", "Edit", "Write", "Glob", "Grep"]
        }
        for d in readDirs { args += ["--add-dir", d] }
        var res = ClaudeResult()
        let lock = NSLock()
        let code = await proc.run(args, cwd: cwd, stdin: prompt) { line in
            guard let d = line.data(using: .utf8), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return }
            if (o["type"] as? String) == "result" {
                lock.lock()
                res.cost = o["total_cost_usd"] as? Double ?? 0
                res.text = o["result"] as? String ?? ""
                if (o["is_error"] as? Bool) == true { res.error = res.text.head(300) }
                lock.unlock()
            }
            onEvent(o)
        }
        if code != 0 && res.text.isEmpty && res.error == nil { res.error = "agent exited with code \(code)" }
        return res
    }
}
