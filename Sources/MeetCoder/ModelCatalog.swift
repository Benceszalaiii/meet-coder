import Foundation

struct ModelChoice: Identifiable, Equatable {
    enum Provider: String { case claude, codex, opencode }
    let provider: Provider
    let model: String
    let name: String
    var isDefault = false
    var supportsImages = true
    var openCodeMajor: Int?
    var id: String { "\(provider.rawValue):\(model)" }
}

struct ModelCatalog {
    var choices: [ModelChoice] = []

    func resolve(_ preference: String) -> ModelChoice? {
        if let chosen = choices.first(where: { $0.id == preference }) { return chosen }
        if preference == "auto" {
            if let sonnet = choices.first(where: { $0.id == "claude:sonnet" }) { return sonnet }
            let codex = choices.filter { $0.provider == .codex }
            if let model = codex.first(where: \.isDefault) ?? codex.first { return model }
        }
        return choices.first { $0.provider == .opencode }
    }

    static func discover() async -> ModelCatalog {
        async let claude = claudeChoices()
        async let codex = Task.detached(priority: .utility) { codexChoices() }.value
        async let openCode = openCodeChoices()
        return await ModelCatalog(choices: claude + codex + openCode)
    }

    private static func claudeChoices() async -> [ModelChoice] {
        let status = await Shell.run("claude", ["auth", "status", "--json"], cwd: Paths.support, timeout: 8)
        guard status.code == 0, let account = jsonObject(status.out),
              account["loggedIn"] as? Bool == true, account["authMethod"] as? String == "claude.ai",
              let tier = account["subscriptionType"] as? String,
              ["pro", "max", "ultra", "team", "enterprise"].contains(tier.lowercased()) else { return [] }
        return ["Sonnet", "Opus", "Haiku"].map { ModelChoice(provider: .claude, model: $0.lowercased(), name: "Claude \($0)") }
    }

    private static func openCodeChoices() async -> [ModelChoice] {
        let result = await Shell.run("opencode", ["--version"], cwd: Paths.support, timeout: 8)
        guard result.code == 0,
              let version = result.out.split(separator: "\n").last?.trimmingCharacters(in: .whitespacesAndNewlines),
              let first = version.drop(while: { $0 == "v" }).split(separator: ".").first,
              let major = Int(first), [1, 2].contains(major) else { return [] }
        return [ModelChoice(provider: .opencode, model: "default", name: "OpenCode", openCodeMajor: major)]
    }

    // The app-server is a short-lived stdio child. Only the plan and public model metadata
    // leave this function. Neither the account email nor authentication files are needed.
    private static func codexChoices() -> [ModelChoice] {
        let process = Process(), input = Pipe(), output = Pipe()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["codex", "app-server", "-c", "model_provider=\"openai\""]
        process.currentDirectoryURL = URL(fileURLWithPath: Paths.support)
        process.environment = Shell.env
        process.standardInput = input; process.standardOutput = output; process.standardError = FileHandle.nullDevice
        do { try process.run() } catch { return [] }
        let timeout = DispatchWorkItem { if process.isRunning { kill(process.processIdentifier, SIGKILL) } }
        DispatchQueue.global().asyncAfter(deadline: .now() + 10, execute: timeout)
        defer {
            try? input.fileHandleForWriting.close()
            if process.isRunning { process.terminate() }
            process.waitUntilExit()
            timeout.cancel()
        }

        var buffer = Data()
        func send(_ packet: [String: Any]) throws {
            var data = try JSONSerialization.data(withJSONObject: packet)
            data.append(10)
            try input.fileHandleForWriting.write(contentsOf: data)
        }
        func request(_ id: Int, _ method: String, _ params: [String: Any]) throws -> [String: Any]? {
            try send(["id": id, "method": method, "params": params])
            while true {
                if let newline = buffer.firstIndex(of: 10) {
                    let line = Data(buffer[..<newline])
                    buffer.removeSubrange(...newline)
                    guard let event = try? JSONSerialization.jsonObject(with: line) as? [String: Any], event["id"] as? Int == id else { continue }
                    return event["result"] as? [String: Any]
                }
                let chunk = output.fileHandleForReading.availableData
                guard !chunk.isEmpty else { return nil }
                buffer.append(chunk)
            }
        }

        do {
            guard try request(1, "initialize", ["clientInfo": ["name": "meetcoder", "version": "1.0"]]) != nil else { return [] }
            try send(["method": "initialized"])
            let response = try request(2, "account/read", ["refreshToken": false])
            guard let account = response?["account"] as? [String: Any], account["type"] as? String == "chatgpt",
                  let plan = account["planType"] as? String, !["", "free", "unknown"].contains(plan.lowercased()) else { return [] }

            var options: [ModelChoice] = [], params: [String: Any] = ["includeHidden": false, "modelProvider": "openai", "limit": 100]
            var page = 3
            repeat {
                guard let response = try request(page, "model/list", params), let rows = response["data"] as? [[String: Any]] else { break }
                for row in rows where row["hidden"] as? Bool != true {
                    guard let slug = row["model"] as? String, !slug.isEmpty, !options.contains(where: { $0.model == slug }) else { continue }
                    let modalities = row["inputModalities"] as? [String]
                    options.append(ModelChoice(provider: .codex, model: slug, name: "Codex · \(row["displayName"] as? String ?? slug)",
                                               isDefault: row["isDefault"] as? Bool == true, supportsImages: modalities?.contains("image") ?? true))
                }
                guard let cursor = response["nextCursor"] as? String, !cursor.isEmpty, cursor != params["cursor"] as? String else { break }
                params["cursor"] = cursor
                page += 1
            } while true
            return options
        } catch { return [] }
    }
}

func jsonObject(_ text: String) -> [String: Any]? {
    try? JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any]
}
