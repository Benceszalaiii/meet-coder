import Foundation

/// File inspection for Codex while its shell is disabled. Project paths arrive over MCP stdio.
enum ProjectReader {
    private static let ignored: Set<String> = ["node_modules", "vendor", "bin", "obj", "dist", "build", "coverage"]
    private static let extensions = Set("js jsx mjs cjs ts tsx mts cts cs csproj sln slnx razor cshtml php html htm css scss sass less vue svelte json md txt xml yaml yml toml sql prisma graphql resx props targets".split(separator: " ").map(String.init))
    private static let fm = FileManager.default
    private static func visible(_ name: String) -> Bool { !name.hasPrefix(".") && !ignored.contains(name.lowercased()) }

    static func read(_ name: String, path: String, root: URL) throws -> String {
        let parts = path.split(separator: "/").map(String.init).filter { $0 != "." }
        guard !path.hasPrefix("/"), parts.allSatisfy(visible) else { throw CocoaError(.fileReadNoPermission) }
        var url = root
        for part in parts {
            url.appendPathComponent(part)
            let values = try url.resourceValues(forKeys: [.isSymbolicLinkKey])
            guard values.isSymbolicLink != true else { throw CocoaError(.fileReadNoPermission) }
        }
        if name == "list_directory" {
            let entries = try fm.contentsOfDirectory(at: url, includingPropertiesForKeys: [.isDirectoryKey, .isSymbolicLinkKey], options: [.skipsHiddenFiles])
            return entries.compactMap { child -> String? in
                guard visible(child.lastPathComponent), let info = try? child.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey]), info.isSymbolicLink != true else { return nil }
                if info.isDirectory == true { return child.lastPathComponent + "/" }
                return extensions.contains(child.pathExtension.lowercased()) ? child.lastPathComponent : nil
            }.sorted().prefix(500).joined(separator: "\n")
        }
        let info = try url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
        guard name == "read_file", extensions.contains(url.pathExtension.lowercased()), info.isRegularFile == true,
              let size = info.fileSize, size <= 256 * 1024 else { throw CocoaError(.fileReadNoPermission) }
        let contents = try String(contentsOf: url, encoding: .utf8)
        guard !contents.contains("\0") else { throw CocoaError(.fileReadCorruptFile) }
        return contents
    }

    static func serve(root: String) {
        let dir = URL(fileURLWithPath: root, isDirectory: true).resolvingSymlinksInPath()
        let tools = ["list_directory": "List project source files and directories.", "read_file": "Read one project source file."].map { name, description -> [String: Any] in
            ["name": name, "description": description, "inputSchema": ["type": "object", "properties": ["path": ["type": "string"]], "required": ["path"]]]
        }
        while let line = readLine() {
            guard let msg = jsonObject(line), let id = msg["id"] else { continue }
            let params = msg["params"] as? [String: Any] ?? [:]
            var response: [String: Any] = ["jsonrpc": "2.0", "id": id]
            switch msg["method"] as? String {
            case "initialize":
                response["result"] = ["protocolVersion": params["protocolVersion"] ?? "2024-11-05", "capabilities": ["tools": [:]], "serverInfo": ["name": "MeetCoder", "version": "1.0"]]
            case "ping": response["result"] = [String: Any]()
            case "tools/list": response["result"] = ["tools": tools]
            case "tools/call":
                let args = params["arguments"] as? [String: Any]
                let output = try? read(params["name"] as? String ?? "", path: args?["path"] as? String ?? "/", root: dir)
                response["result"] = ["isError": output == nil, "content": [["type": "text", "text": output ?? "Select a project-relative source file or directory."]]]
            default: response["error"] = ["code": -32601, "message": "Unknown method"]
            }
            if var data = try? JSONSerialization.data(withJSONObject: response) {
                data.append(10)
                FileHandle.standardOutput.write(data)
            }
        }
    }
}
