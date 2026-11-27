import CoreText
import Foundation

/// TeX Gyre Heros (GUST Font License), the Nievau face, registered for this process only.
/// Looked up next to the executable or in the app's Resources, so both `swift run` and the built .app find it.
enum Typeface {
    static let regular = "TeXGyreHeros-Regular"
    static let bold = "TeXGyreHeros-Bold"

    static func register() {
        var dirs: [URL] = []
        let bundleName = "MeetCoder_MeetCoder.bundle"
        if let r = Bundle.main.resourceURL {
            dirs += [r.appendingPathComponent("Fonts"),
                     r.appendingPathComponent("\(bundleName)/Fonts"),
                     r.appendingPathComponent("\(bundleName)/Contents/Resources/Fonts")]
        }
        if let exe = Bundle.main.executableURL?.deletingLastPathComponent() {
            dirs += [exe.appendingPathComponent("\(bundleName)/Fonts"),
                     exe.appendingPathComponent("\(bundleName)/Contents/Resources/Fonts")]
        }
        for name in ["tex-gyre-heros-regular", "tex-gyre-heros-bold"] {
            for dir in dirs {
                let url = dir.appendingPathComponent("\(name).woff2")
                if FileManager.default.fileExists(atPath: url.path) {
                    CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
                    break
                }
            }
        }
    }
}
