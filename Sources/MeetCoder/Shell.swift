import Foundation

enum Shell {
    /// Environment with the user's real PATH (GUI apps start with a minimal one).
    static let env: [String: String] = {
        var e = ProcessInfo.processInfo.environment
        let home = NSHomeDirectory()
        var path = e["PATH"] ?? "/usr/bin:/bin"
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/zsh")
        p.arguments = ["-ilc", "printf '__P__%s__E__' \"$PATH\""]
        let out = Pipe()
        p.standardOutput = out
        p.standardError = Pipe()
        p.standardInput = FileHandle.nullDevice
        if (try? p.run()) != nil {
            let d = out.fileHandleForReading.readDataToEndOfFile()
            p.waitUntilExit()
            let s = String(decoding: d, as: UTF8.self)
            if let a = s.range(of: "__P__"), let b = s.range(of: "__E__"), a.upperBound <= b.lowerBound {
                path = String(s[a.upperBound..<b.lowerBound])
            }
        }
        let extra = ["/opt/homebrew/bin", "/usr/local/bin", "\(home)/.local/bin", "\(home)/.opencode/bin", "\(home)/.config/herd-lite/bin"]
        for x in extra where !path.contains(x) { path += ":" + x }
        e["PATH"] = path
        e["NO_COLOR"] = "1"
        e["FORCE_COLOR"] = "0"
        return e
    }()

    @discardableResult
    static func run(_ exe: String, _ args: [String], cwd: String? = nil, stdin: String? = nil, timeout: TimeInterval? = nil) async -> (code: Int32, out: String, err: String) {
        await withCheckedContinuation { cont in
            DispatchQueue.global().async {
                let p = Process()
                p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
                p.arguments = [exe] + args
                p.environment = env
                if let cwd { p.currentDirectoryURL = URL(fileURLWithPath: cwd) }
                let o = Pipe(), e = Pipe(), i = Pipe()
                p.standardOutput = o; p.standardError = e; p.standardInput = i
                do { try p.run() } catch {
                    cont.resume(returning: (-1, "", "\(error.localizedDescription)"))
                    return
                }
                let deadline = DispatchWorkItem { if p.isRunning { kill(p.processIdentifier, SIGKILL) } }
                if let timeout { DispatchQueue.global().asyncAfter(deadline: .now() + timeout, execute: deadline) }
                defer { deadline.cancel() }
                DispatchQueue.global().async {
                    if let stdin, let d = stdin.data(using: .utf8) { try? i.fileHandleForWriting.write(contentsOf: d) }
                    try? i.fileHandleForWriting.close()
                }
                var errData = Data()
                let g = DispatchGroup()
                g.enter()
                DispatchQueue.global().async { errData = e.fileHandleForReading.readDataToEndOfFile(); g.leave() }
                let outData = o.fileHandleForReading.readDataToEndOfFile()
                g.wait()
                p.waitUntilExit()
                cont.resume(returning: (p.terminationStatus, String(decoding: outData, as: UTF8.self), String(decoding: errData, as: UTF8.self)))
            }
        }
    }
}

/// A long-running child in its own process group, streaming output line by line.
final class StreamProc {
    private var process: Process?
    var isRunning: Bool { process?.isRunning ?? false }

    func run(_ argv: [String], cwd: String, stdin: String? = nil, environment: [String: String] = [:], onLine: @escaping (String) -> Void) async -> Int32 {
        await withCheckedContinuation { (cont: CheckedContinuation<Int32, Never>) in
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/usr/bin/perl")
            p.arguments = ["-e", "setpgrp(0,0); exec @ARGV or exit 127;"] + argv
            p.environment = Shell.env.merging(environment) { _, new in new }
            p.currentDirectoryURL = URL(fileURLWithPath: cwd)
            let pipe = Pipe(), inPipe = Pipe()
            p.standardOutput = pipe; p.standardError = pipe; p.standardInput = inPipe
            let eof = DispatchGroup()
            eof.enter()
            var buf = Data()
            pipe.fileHandleForReading.readabilityHandler = { h in
                let d = h.availableData
                if d.isEmpty {
                    h.readabilityHandler = nil
                    if !buf.isEmpty { onLine(String(decoding: buf, as: UTF8.self)); buf.removeAll() }
                    eof.leave()
                    return
                }
                buf.append(d)
                while let i = buf.firstIndex(of: 10) {
                    let line = String(decoding: buf[buf.startIndex..<i], as: UTF8.self)
                    buf.removeSubrange(buf.startIndex...i)
                    onLine(line)
                }
            }
            p.terminationHandler = { pr in
                DispatchQueue.global().async {
                    _ = eof.wait(timeout: .now() + 2)
                    cont.resume(returning: pr.terminationStatus)
                }
            }
            do { try p.run() } catch {
                pipe.fileHandleForReading.readabilityHandler = nil
                cont.resume(returning: -1)
                return
            }
            self.process = p
            DispatchQueue.global().async {
                if let stdin, let d = stdin.data(using: .utf8) { try? inPipe.fileHandleForWriting.write(contentsOf: d) }
                try? inPipe.fileHandleForWriting.close()
            }
        }
    }

    func terminate() {
        guard let p = process, p.isRunning else { return }
        kill(-p.processIdentifier, SIGTERM)
        let pid = p.processIdentifier
        DispatchQueue.global().asyncAfter(deadline: .now() + 3) { kill(-pid, SIGKILL) }
    }
}
