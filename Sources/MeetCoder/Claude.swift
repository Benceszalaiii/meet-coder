import Foundation

struct ModelResult {
    var structured: [String: Any]?
    var text = ""
    var cost = 0.0
    var error: String?

    var accessUnavailable: Bool {
        guard let error else { return false }
        let message = error.lowercased()
        return ["not logged in", "not authenticated", "authentication required", "authentication_error",
                "invalid token", "invalid_grant", "token has expired", "unauthorized", "403 forbidden", "429 too many requests",
                "usage limit", "usage_limit", "usage cap", "rate_limit", "rate limit", "out of extra usage",
                "hit your limit", "hit your session limit", "not available on your plan", "not supported when using codex",
                "subscription required", "does not have access to", "do not have access", "model_not_found",
                "failed to log in", "please run /login", "please run codex login"].contains { message.contains($0) }
    }
}

enum Claude {
    private static func base(model: String) -> [String] {
        ["-p", "--model", model, "--effort", "medium", "--safe-mode", "--strict-mcp-config", "--no-session-persistence"]
    }

    /// One-shot structured question. Read is the only tool (for the screenshot).
    static func ask(model: String, system: String, prompt: String, schema: String, readDirs: [String] = []) async -> ModelResult {
        var args = base(model: model) + [
            "--output-format", "json", "--tools", "Read", "--allowedTools", "Read",
            "--permission-prompts", "none", "--system-prompt", system, "--json-schema", schema,
        ]
        for d in readDirs { args += ["--add-dir", d] }
        let r = await Shell.run("claude", args, cwd: Paths.support, stdin: prompt)
        var res = ModelResult()
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
        if r.code != 0 || (o["is_error"] as? Bool) == true {
            res.error = (res.text.isEmpty ? r.err : res.text).head(300)
            res.structured = nil
        }
        return res
    }

    /// Autonomous coding run inside a project folder. Events stream back as parsed JSON.
    static func agent(model: String, proc: StreamProc, cwd: String, prompt: String, system: String, allowCommands: Bool,
                      readDirs: [String], budget: Double, onEvent: @escaping ([String: Any]) -> Void) async -> ModelResult {
        var args = ["claude"] + base(model: model) + [
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
        var res = ModelResult()
        let lock = NSLock()
        var diagnostic = ""
        let code = await proc.run(args, cwd: cwd, stdin: prompt) { line in
            guard let o = jsonObject(line) else {
                if !line.isEmpty { diagnostic = line.head(300) }
                return
            }
            if (o["type"] as? String) == "result" {
                lock.lock()
                res.cost = o["total_cost_usd"] as? Double ?? 0
                res.text = o["result"] as? String ?? ""
                if (o["is_error"] as? Bool) == true { res.error = res.text.head(300) }
                lock.unlock()
            }
            onEvent(o)
        }
        if code != 0 && res.error == nil {
            res.error = res.text.isEmpty ? (diagnostic.isEmpty ? "Claude Code (\(code))" : diagnostic) : res.text.head(300)
        }
        return res
    }
}
