import AppKit
import CoreImage
import ScreenCaptureKit
import Vision

final class CaptureEngine: NSObject, ObservableObject, SCStreamOutput, SCStreamDelegate {
    @Published var preview: CGImage?
    @Published var windows: [SCWindow] = []
    @Published var active = false
    @Published var error: String?
    @Published var windowTitle = ""

    private var stream: SCStream?
    private let queue = DispatchQueue(label: "meetcoder.capture")
    private let ci = CIContext()
    private let lock = NSLock()
    private var latest: CGImage?

    static var hasPermission: Bool { CGPreflightScreenCaptureAccess() }
    static func requestPermission() { CGRequestScreenCaptureAccess() }

    private func score(_ w: SCWindow) -> Int {
        let bundle = w.owningApplication?.bundleIdentifier ?? ""
        let title = (w.title ?? "").lowercased()
        var s = 0
        if bundle == "com.google.Chrome" { s += 2 }
        if bundle.contains("Safari") || bundle.contains("firefox") || bundle.contains("edgemac") || bundle.contains("arc") { s += 1 }
        if title.contains("meet") || title.contains("screentask") { s += 4 }
        return s
    }

    @MainActor
    func refreshWindows() async {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
            windows = content.windows.filter { w in
                guard let app = w.owningApplication, w.windowLayer == 0,
                      w.frame.width > 300, w.frame.height > 200, !(w.title ?? "").isEmpty else { return false }
                return app.bundleIdentifier != Bundle.main.bundleIdentifier
            }.sorted { score($0) > score($1) }
            error = nil
        } catch {
            self.error = "Screen recording permission is needed (System Settings → Privacy & Security → Screen & System Audio Recording)."
        }
    }

    var bestWindow: SCWindow? { windows.first.flatMap { score($0) > 0 ? $0 : nil } }

    @MainActor
    func start(window: SCWindow) async {
        await stop()
        let cfg = SCStreamConfiguration()
        let scale = min(2.0, 1680 / max(window.frame.width, 1))
        cfg.width = Int(window.frame.width * scale)
        cfg.height = Int(window.frame.height * scale)
        cfg.minimumFrameInterval = CMTime(value: 1, timescale: 3)
        cfg.pixelFormat = kCVPixelFormatType_32BGRA
        cfg.showsCursor = false
        cfg.queueDepth = 3
        let s = SCStream(filter: SCContentFilter(desktopIndependentWindow: window), configuration: cfg, delegate: self)
        do {
            try s.addStreamOutput(self, type: .screen, sampleHandlerQueue: queue)
            try await s.startCapture()
            stream = s
            active = true
            error = nil
            windowTitle = "\(window.owningApplication?.applicationName ?? "") — \(window.title ?? "")"
        } catch {
            self.error = "Could not start capture: \(error.localizedDescription)"
            active = false
        }
    }

    @MainActor
    func stop() async {
        if let s = stream { try? await s.stopCapture() }
        stream = nil
        active = false
    }

    func snapshot() -> CGImage? {
        lock.lock(); defer { lock.unlock() }
        return latest
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sb: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen, sb.isValid, let pb = sb.imageBuffer else { return }
        if let arr = CMSampleBufferGetSampleAttachmentsArray(sb, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
           let raw = arr.first?[.status] as? Int, let st = SCFrameStatus(rawValue: raw), st != .complete { return }
        let img = CIImage(cvPixelBuffer: pb)
        guard let cg = ci.createCGImage(img, from: img.extent) else { return }
        lock.lock(); latest = cg; lock.unlock()
        DispatchQueue.main.async { self.preview = cg }
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        DispatchQueue.main.async {
            self.active = false
            self.error = "Capture stopped: \(error.localizedDescription)"
        }
    }
}

enum Frames {
    /// Tiny grayscale thumbnail used as a cheap "did anything change" check.
    static func signature(_ image: CGImage) -> [UInt8] {
        let w = 64, h = 36
        var buf = [UInt8](repeating: 0, count: w * h)
        buf.withUnsafeMutableBytes { p in
            guard let ctx = CGContext(data: p.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                                      space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return }
            ctx.interpolationQuality = .low
            ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        }
        return buf
    }

    static func differs(_ a: [UInt8], _ b: [UInt8]) -> Bool {
        guard a.count == b.count else { return true }
        var changed = 0
        for i in 0..<a.count where abs(Int(a[i]) - Int(b[i])) > 5 { changed += 1 }
        return changed >= 1
    }

    static func ocr(_ image: CGImage) -> String {
        let req = VNRecognizeTextRequest()
        req.recognitionLevel = .accurate
        req.usesLanguageCorrection = false
        req.automaticallyDetectsLanguage = true
        try? VNImageRequestHandler(cgImage: image, options: [:]).perform([req])
        let lines = (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }
        return lines.joined(separator: "\n")
    }

    /// True when enough text lines changed to be worth sending to the model.
    static func textChanged(old: Set<String>, new: Set<String>) -> Bool {
        if old.isEmpty { return !new.isEmpty }
        return old.symmetricDifference(new).count >= 2
    }

    static func saveJPEG(_ image: CGImage, index: Int) -> String? {
        let rep = NSBitmapImageRep(cgImage: image)
        guard let d = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.6]) else { return nil }
        let path = Paths.frames + "/frame-\(index % 6).jpg"
        do { try d.write(to: URL(fileURLWithPath: path)); return path } catch { return nil }
    }
}
