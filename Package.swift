// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MeetCoder",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(name: "MeetCoder", path: "Sources/MeetCoder")
    ]
)
