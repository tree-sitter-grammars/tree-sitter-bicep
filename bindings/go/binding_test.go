package tree_sitter_bicep_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_bicep "github.com/tree-sitter-grammars/tree-sitter-bicep/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_bicep.Language())
	if language == nil {
		t.Errorf("Error loading Bicep grammar")
	}
}
