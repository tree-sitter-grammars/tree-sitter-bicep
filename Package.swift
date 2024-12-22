// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "TreeSitterBicep",
    products: [
        .library(name: "TreeSitterBicep", targets: ["TreeSitterBicep"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ChimeHQ/SwiftTreeSitter", from: "0.8.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterBicep",
            dependencies: [],
            path: ".",
            sources: [
                "src/parser.c",
                "src/scanner.c",
            ],
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterBicepTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterBicep",
            ],
            path: "bindings/swift/TreeSitterBicepTests"
        )
    ],
    cLanguageStandard: .c11
)
