import XCTest
import SwiftTreeSitter
import TreeSitterBicep

final class TreeSitterBicepTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_bicep())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Bicep grammar")
    }
}
