import Foundation

enum ModelRunner {
    static func ask(_ choice: ModelChoice, system: String, prompt: String, schema: String, image: String?) async -> ModelResult {
        if choice.provider == .claude {
            return await Claude.ask(model: choice.model, system: system, prompt: prompt, schema: schema, readDirs: image == nil ? [] : [Paths.frames])
        }
        return await run(choice, proc: StreamProc(), cwd: Paths.support, prompt: prompt, system: system, schema: schema,
                         image: image, allowCommands: false, onEvent: { _ in })
    }

    static func agent(_ choice: ModelChoice, proc: StreamProc, cwd: String, prompt: String, system: String,
                      image: String?, allowCommands: Bool, budget: Double,
                      onEvent: @escaping ([String: Any]) -> Void) async -> ModelResult {
        if choice.provider == .claude {
            return await Claude.agent(model: choice.model, proc: proc, cwd: cwd, prompt: prompt, system: system, allowCommands: allowCommands,
                                      readDirs: image == nil ? [] : [Paths.frames], budget: budget, onEvent: onEvent)
        }
        return await run(choice, proc: proc, cwd: cwd, prompt: prompt, system: system, schema: nil,
                         image: image, allowCommands: allowCommands, budget: budget, onEvent: onEvent)
    }

    private static func run(_ choice: ModelChoice, proc: StreamProc, cwd: String, prompt: String, system: String,
                            schema: String?, image: String?, allowCommands: Bool, budget: Double? = nil,
                            onEvent: @escaping ([String: Any]) -> Void) async -> ModelResult {
        var args: [String], environment: [String: String] = [:], schemaFile: URL?
        var input = prompt
        defer { if let schemaFile { try? FileManager.default.removeItem(at: schemaFile) } }
        let editing = schema == nil

        switch choice.provider {
        case .codex:
            let encoder = JSONEncoder()
            encoder.outputFormatting = .withoutEscapingSlashes
            guard let instructions = try? encoder.encode(system) else { return ModelResult(error: "Érvénytelen modellutasítás.") }
            args = ["codex", "exec", "--ignore-user-config", "--ephemeral", "--skip-git-repo-check", "--json",
                    "--model", choice.model, "--sandbox", editing ? "workspace-write" : "read-only",
                    "-c", "model_provider=\"openai\"", "-c", "forced_login_method=\"chatgpt\"", "-c", "approval_policy=\"never\"",
                    "-c", "developer_instructions=" + String(decoding: instructions, as: UTF8.self),
                    "-c", "web_search=\"disabled\"", "--disable", "shell_tool", "--disable", "unified_exec", "--disable", "multi_agent"]
            if editing {
                let exe = Bundle.main.executableURL?.path ?? CommandLine.arguments[0]
                do {
                    let command = try encoder.encode(exe)
                    let arguments = try encoder.encode(["--project-reader", cwd])
                    args += ["-c", "mcp_servers.meetcoder.command=" + String(decoding: command, as: UTF8.self),
                             "-c", "mcp_servers.meetcoder.args=" + String(decoding: arguments, as: UTF8.self)]
                } catch { return ModelResult(error: error.localizedDescription) }
                input += "\nUse the meetcoder tools to inspect project files and apply_patch for edits. Shell execution is disabled."
            }
            if let image, choice.supportsImages { args += ["--image", image] }
            if let schema {
                let file = FileManager.default.temporaryDirectory.appendingPathComponent("meetcoder-\(UUID()).json")
                do {
                    let object = try JSONSerialization.jsonObject(with: Data(schema.utf8))
                    try JSONSerialization.data(withJSONObject: strictSchema(object)).write(to: file, options: .atomic)
                } catch { return ModelResult(error: error.localizedDescription) }
                schemaFile = file
                args += ["--output-schema", file.path]
            }
            args += ["-"]
        case .opencode:
            let v2 = choice.openCodeMajor == 2
            args = ["opencode", "run", "--format", "json", "--agent", "meetcoder"]
            if v2 { args.append("--standalone") }
            // The configured OpenCode model may accept only text. The prompt includes the frame OCR.
            if let schema { input += "\n\nReturn only one JSON object matching this schema:\n\(schema)" }
            do {
                let key = v2 ? "agents" : "agent"
                var config: [String: Any] = [:]
                if let existing = Shell.env["OPENCODE_CONFIG_CONTENT"], !existing.isEmpty {
                    guard let parsed = jsonObject(existing) else { return ModelResult(error: "Érvénytelen OpenCode-konfiguráció.") }
                    config = parsed
                }
                var agents = config[key] as? [String: Any] ?? [:]
                agents["meetcoder"] = openCodeAgent(v2: v2, editing: editing, allowCommands: allowCommands, system: system)
                config[key] = agents
                environment["OPENCODE_CONFIG_CONTENT"] = String(decoding: try JSONSerialization.data(withJSONObject: config, options: [.sortedKeys]), as: UTF8.self)
            } catch { return ModelResult(error: error.localizedDescription) }
            environment["PWD"] = cwd
        case .claude:
            preconditionFailure("Claude uses its own CLI adapter")
        }

        var result = ModelResult(), diagnostic = ""
        let code = await proc.run(args, cwd: cwd, stdin: input, environment: environment) { line in
            guard let event = jsonObject(line) else {
                if !line.trimmingCharacters(in: .whitespaces).isEmpty { diagnostic = line.head(300) }
                return
            }
            if choice.provider == .codex { consumeCodex(event, into: &result, onEvent: onEvent) }
            else {
                consumeOpenCode(event, into: &result, onEvent: onEvent)
                if let budget, result.cost >= budget, result.error == nil,
                   event["type"] as? String == "step_finish",
                   (event["part"] as? [String: Any])?["reason"] as? String == "tool-calls" {
                    result.error = "Az OpenCode elérte a feladat költségkeretét."
                    proc.terminate()
                }
            }
        }
        if code != 0 || (result.text.isEmpty && result.error == nil) {
            result.error = result.error ?? (diagnostic.isEmpty ? "\(choice.name) · hibás vagy hiányzó válasz (\(code))." : diagnostic)
        }
        if let schema, result.error == nil {
            var text = result.text.trimmingCharacters(in: .whitespacesAndNewlines)
            if text.hasPrefix("```"), text.hasSuffix("```"), let newline = text.firstIndex(of: "\n") {
                text = String(text[text.index(after: newline)...].dropLast(3))
            }
            if let object = jsonObject(text), let spec = jsonObject(schema), matchesSchema(object, spec) {
                result.structured = object
            } else { result.error = "\(choice.name) nem a kért JSON-formátumban válaszolt." }
        }
        return result
    }

    private static func strictSchema(_ value: Any) -> Any {
        if let array = value as? [Any] { return array.map(strictSchema) }
        guard let object = value as? [String: Any] else { return value }
        var schema = object.mapValues(strictSchema)
        if object["properties"] != nil { schema["additionalProperties"] = false }
        return schema
    }

    private static func matchesSchema(_ value: Any, _ schema: [String: Any]) -> Bool {
        let types = schema["type"] as? [String] ?? [schema["type"] as? String ?? ""]
        if value is NSNull { return types.contains("null") }
        if let object = value as? [String: Any] {
            guard types.contains("object") else { return false }
            let properties = schema["properties"] as? [String: [String: Any]] ?? [:]
            return (schema["required"] as? [String] ?? []).allSatisfy { field in
                guard let value = object[field], let property = properties[field] else { return false }
                return matchesSchema(value, property)
            }
        }
        if let number = value as? NSNumber { return types.contains(CFGetTypeID(number) == CFBooleanGetTypeID() ? "boolean" : "number") }
        return value is String && types.contains("string")
    }

    private static func openCodeAgent(v2: Bool, editing: Bool, allowCommands: Bool, system: String) -> [String: Any] {
        let commands = ["npm *", "npx *", "php artisan *", "composer *", "ls *", "mkdir *"]
        var agent: [String: Any] = ["description": "MeetCoder", "mode": "primary", v2 ? "system" : "prompt": system]
        if v2 {
            var rules = [["action": "*", "resource": "*", "effect": "deny"]]
            if editing {
                rules += ["read", "glob", "grep", "edit"].map { ["action": $0, "resource": "*", "effect": "allow"] }
                if allowCommands { rules += commands.map { ["action": "shell", "resource": $0, "effect": "allow"] } }
            }
            agent["permissions"] = rules
            return agent
        }
        var rules: [String: Any] = ["*": "deny"]
        if editing {
            for tool in ["read", "glob", "grep", "edit"] { rules[tool] = "allow" }
            if allowCommands { rules["bash"] = Dictionary(uniqueKeysWithValues: commands.map { ($0, "allow") }) }
        }
        agent["permission"] = rules
        return agent
    }

    private static func emitTool(_ tool: String, input: [String: Any], onEvent: ([String: Any]) -> Void) {
        onEvent(["type": "assistant", "message": ["content": [["type": "tool_use", "name": tool, "input": input]]]])
    }

    private static func consumeCodex(_ event: [String: Any], into result: inout ModelResult, onEvent: ([String: Any]) -> Void) {
        switch event["type"] as? String {
        case "turn.failed", "error":
            let error = event["error"] as? [String: Any]
            result.error = (error?["message"] as? String ?? event["message"] as? String ?? "Codex-hiba").head(300)
        case "turn.completed":
            // The final turn is authoritative after a recoverable stream reconnect.
            result.error = nil
        case "item.completed", "item.started":
            guard let item = event["item"] as? [String: Any] else { return }
            switch item["type"] as? String {
            case "agent_message":
                if event["type"] as? String == "item.completed" { result.text = item["text"] as? String ?? result.text }
            case "file_change":
                for change in item["changes"] as? [[String: Any]] ?? [] {
                    if let path = change["path"] as? String { emitTool("Edit", input: ["file_path": path], onEvent: onEvent) }
                }
            case "command_execution": emitTool("Bash", input: ["command": item["command"] ?? ""], onEvent: onEvent)
            default: break
            }
        default: break
        }
    }

    private static func consumeOpenCode(_ event: [String: Any], into result: inout ModelResult, onEvent: ([String: Any]) -> Void) {
        let part = event["part"] as? [String: Any] ?? [:]
        switch event["type"] as? String {
        case "error":
            let error = event["error"] as? [String: Any], data = error?["data"] as? [String: Any]
            result.error = (data?["message"] as? String ?? error?["message"] as? String ?? error?["name"] as? String ?? "OpenCode-hiba").head(300)
        case "text":
            if let text = part["text"] as? String { result.text += text }
        case "step_finish": result.cost += part["cost"] as? Double ?? 0
        case "tool_use":
            guard let tool = part["tool"] as? String, let state = part["state"] as? [String: Any],
                  var input = state["input"] as? [String: Any] else { return }
            input["file_path"] = input["filePath"] ?? input["path"]
            let tools = ["read": "Read", "edit": "Edit", "write": "Write", "bash": "Bash", "shell": "Bash", "glob": "Glob", "grep": "Grep"]
            if let name = tools[tool] { emitTool(name, input: input, onEvent: onEvent) }
        default: break
        }
    }
}
