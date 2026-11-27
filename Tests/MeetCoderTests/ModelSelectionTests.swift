import XCTest
@testable import MeetCoder

final class ModelSelectionTests: XCTestCase {
    func testSubscriptionPriorityAndMissingPreference() {
        let claude = ModelChoice(provider: .claude, model: "sonnet", name: "Claude Sonnet")
        let codex = ModelChoice(provider: .codex, model: "test", name: "Test", isDefault: true)
        let fallback = ModelChoice(provider: .opencode, model: "default", name: "OpenCode")
        let catalog = ModelCatalog(choices: [fallback, codex, claude])
        XCTAssertEqual(catalog.resolve("auto"), claude)
        XCTAssertEqual(catalog.resolve(codex.id), codex)
        XCTAssertEqual(catalog.resolve("codex:retired"), fallback)
        XCTAssertEqual(ModelCatalog(choices: [fallback, codex]).resolve("auto"), codex)
        XCTAssertNil(ModelCatalog().resolve("auto"))
    }

    func testLegacySettingsPreserveProjectsRoot() throws {
        var old = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(Settings())) as? [String: Any])
        old.removeValue(forKey: "modelSelection")
        old["projectsRoot"] = "/tmp/old-projects"
        let restored = try JSONDecoder().decode(Settings.self, from: JSONSerialization.data(withJSONObject: old))
        XCTAssertNil(restored.modelSelection)
        XCTAssertEqual(restored.projectsRoot, "/tmp/old-projects")
    }

    func testScopedProjectReader() throws {
        let fm = FileManager.default
        let root = fm.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try fm.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? fm.removeItem(at: root) }
        try "let x = 1".write(to: root.appendingPathComponent("app.ts"), atomically: true, encoding: .utf8)
        try fm.createSymbolicLink(at: root.appendingPathComponent("linked.ts"), withDestinationURL: root.appendingPathComponent("app.ts"))
        XCTAssertEqual(try ProjectReader.read("list_directory", path: ".", root: root), "app.ts")
        XCTAssertEqual(try ProjectReader.read("read_file", path: "app.ts", root: root), "let x = 1")
        for path in ["linked.ts", "../app.ts", "/etc/hosts", ".env", "node_modules/pkg/index.js"] {
            XCTAssertThrowsError(try ProjectReader.read("read_file", path: path, root: root))
        }
    }
}
