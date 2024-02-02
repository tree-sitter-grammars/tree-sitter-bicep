/**
 * @file Bicep grammar for tree-sitter
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 * @see {@link https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview|official syntax spec}
 */

// deno-lint-ignore-file ban-ts-comment
/* eslint-disable arrow-parens */
/* eslint-disable camelcase */
/* eslint-disable-next-line spaced-comment */
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check


const PREC = {
  CONDITIONAL: -2,
  ASSIGNMENT: -1,
  SUBSCRIPT: -1,
  TERNARY: 0,
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  INCLUSIVE_OR: 3,
  EQUAL: 6,
  RELATIONAL: 7,
  SIZEOF: 8,
  ADD: 10,
  MULTIPLY: 11,
  UNARY: 13,
  CALL: 14,
};

const primitive_types = [
  'array',
  'bool',
  'int',
  'object',
  'secureObject',
  'secureString',
  'string',
];


module.exports = grammar({
  name: 'bicep',

  extras: $ => [
    $.comment,
    $.diagnostic_comment,
    /\s/,
  ],

  inline: $ => [
    $.keyword_identifier,
  ],

  supertypes: $ => [
    $.statement,
    $.declaration,
    $.expression,
    $.primary_expression,
  ],

  conflicts: $ => [
    [$.arguments, $.parenthesized_expression],
    [$._binary_type_expression, $.primary_expression],
  ],

  word: $ => $.identifier,

  rules: {
    infrastructure: $ => repeat($.statement),

    statement: $ => choice(
      $.decorators,
      $.declaration,
      $.import_statement,
      $.import_with_statement,
      $.import_functionality,
      $.using_statement,
      $.target_scope_assignment,
    ),

    declaration: $ => choice(
      $.module_declaration,
      $.metadata_declaration,
      $.output_declaration,
      $.parameter_declaration,
      $.resource_declaration,
      $.type_declaration,
      $.variable_declaration,
      $.user_defined_function,
      $.test_block,
      $.assert_statement,
    ),

    module_declaration: $ => seq(
      'module',
      $.identifier,
      $.string,
      '=',
      choice($.if_statement, $.object, $.for_statement),
    ),

    import_statement: $ => seq(
      choice('import', 'provider'),
      $.import_string,
      optional(seq('as', $.identifier)),
    ),

    import_with_statement: $ => seq(
      choice('import', 'provider'),
      $.import_string,
      'with',
      $.expression,
      optional(seq('as', $.identifier)),
    ),

    import_functionality: $ => seq(
      'import',
      choice(
        seq('{', commaSep1(choice(seq($.identifier, 'as', $.identifier), $.identifier)), '}'),
        seq('*', 'as', $.identifier),
      ),
      'from',
      $.string,
    ),

    using_statement: $ => seq('using', $.string),

    target_scope_assignment: $ => seq('targetScope', '=', $.string),

    metadata_declaration: $ => seq(
      'metadata',
      $.identifier,
      '=',
      $.expression,
    ),

    output_declaration: $ => seq(
      'output',
      $.identifier,
      $.type,
      '=',
      $.expression,
    ),

    parameter_declaration: $ => seq(
      'param',
      $.identifier,
      $.type,
      optional(seq('=', $.expression)),
    ),

    resource_declaration: $ => seq(
      'resource',
      $.identifier,
      $.string,
      optional('existing'),
      '=',
      choice($.if_statement, $.object, $.for_statement),
    ),

    type_declaration: $ => seq(
      'type',
      $.identifier,
      '=',
      choice($.expression, $.builtin_type, $.array_type),
    ),

    variable_declaration: $ => seq(
      'var',
      $.identifier,
      '=',
      $.expression,
      optional('!'),
    ),

    user_defined_function: $ => seq(
      'func',
      field('name', $.identifier),
      $.parameters,
      field('returns', $.type),
      '=>',
      $.expression,
    ),

    test_block: $ => seq(
      'test',
      $.identifier,
      $.string,
      '=',
      $.object,
    ),

    assert_statement: $ => seq(
      'assert',
      field('name', $.identifier),
      '=',
      $.expression,
    ),

    parameters: $ => seq('(', commaSep($.parameter), ')'),

    parameter: $ => seq($.identifier, $.type),

    expression: $ => choice(
      $.primary_expression,
      $.assignment_expression,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      $.lambda_expression,
    ),

    primary_expression: $ => choice(
      $.subscript_expression,
      $.member_expression,
      $.resource_expression,
      $.identifier,
      $.keyword_identifier,
      $._literal,
      $.string,
      $.object,
      $.for_statement,
      $.array,
      $.parenthesized_expression,
      $.call_expression,
    ),

    call_expression: $ => prec.right(PREC.CALL, seq(
      field('function', $.expression),
      field('arguments', $.arguments),
      optional(alias('!', $.nullable_return_type)),
    )),

    lambda_expression: $ => prec.right(seq($.expression, '=>', $.expression)),

    arguments: $ => seq('(', commaSep($.expression), ')'),
    parenthesized_expression: $ => seq('(', commaSep($.expression), ')'),

    decorator: $ => prec(1, seq('@', $.call_expression)),
    decorators: $ => prec.right(repeat1($.decorator)),

    array: $ => seq(
      '[',
      optionalCommaSep(seq(
        optional($.decorators),
        $.expression,
      )),
      ']',
    ),
    object: $ => seq(
      '{',
      seq(
        optional($.decorators),
        optionalCommaSep($.object_property),
      ),
      '}',
    ),
    object_property: $ => choice(
      seq(
        choice($.identifier, $.keyword_identifier, $.compatible_identifier, $.string),
        ':',
        choice($.expression, $.builtin_type, $.array_type, $.nullable_type),
      ),
      $.resource_declaration,
    ),

    if_statement: $ => seq('if', $.parenthesized_expression, $.object),

    _lhs_expression: $ => prec(-1, choice(
      $.member_expression,
      $.subscript_expression,
      $.resource_expression,
      $.identifier,
    )),

    assignment_expression: $ => prec.right(PREC.ASSIGNMENT, seq(
      field('left', choice($.parenthesized_expression, $._lhs_expression)),
      '=',
      field('right', $.expression),
    )),

    for_statement: $ => seq(
      '[',
      'for',
      optional(choice(
        $.for_loop_parameters,
        field('initializer', $.identifier),
      )),
      'in',
      $.expression,
      ':',
      field('body', choice($.expression, $.if_statement)), ']',
    ),

    for_loop_parameters: $ => seq(
      '(',
      alias($.identifier, $.loop_variable),
      ',',
      alias($.identifier, $.loop_enumerator),
      ')',
    ),

    member_expression: $ => prec(PREC.SUBSCRIPT, seq(
      field('object', choice($.expression, $.primary_expression)),
      optional('!'),
      '.',
      field('property', alias($.identifier, $.property_identifier)),
    )),

    subscript_expression: $ => prec.right(PREC.SUBSCRIPT, seq(
      field('object', choice($.expression, $.primary_expression)),
      '[',
      field('index', $.expression), ']',
    )),

    resource_expression: $ => prec.right(PREC.SUBSCRIPT, seq(
      field('object', choice($.expression, $.primary_expression)),
      '::',
      field('resource', $.identifier),
    )),

    ternary_expression: $ => prec.right(PREC.TERNARY, seq(
      field('condition', $.expression),
      '?',
      field('consequence', $.expression),
      ':',
      field('alternative', $.expression),
    )),

    binary_expression: $ => {
      const table = [
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULTIPLY],
        ['/', PREC.MULTIPLY],
        ['%', PREC.MULTIPLY],
        ['||', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['|', PREC.INCLUSIVE_OR],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['=~', PREC.EQUAL],
        ['!~', PREC.EQUAL],
        ['>', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['??', PREC.TERNARY],
      ];

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field('left', $.expression),
          // @ts-ignore
          field('operator', operator),
          field('right', $.expression),
        ));
      }));
    },

    unary_expression: $ => prec.left(PREC.UNARY, seq(
      field('operator', choice('!', '-')),
      field('argument', $.expression),
    )),

    _literal: $ => choice($.number, $.boolean, $.null),

    number: _ => /-?[0-9]+/,

    boolean: _ => choice('true', 'false'),

    null: _ => 'null',

    string: $ => choice($._string_literal, $._multiline_string_literal),

    // import string: xx@1.0.0, regex for not @, then @, then regex for 1.0.0
    import_string: $ => seq(
      '\'',
      alias(/[^@]+/, $.import_name),
      '@',
      alias(/[0-9]+.[0-9]+.[0-9]+/, $.import_version),
      '\'',
    ),

    _string_literal: $ => seq(
      '\'',
      repeat(choice(
        $.interpolation,
        // workaround to interpolation and string_content conflicts without needing an external scanner
        alias('$', $.string_content),
        // workaround to conflict with diagnostic comments
        alias('#', $.string_content),
        $.string_content,
        $._escape_sequence,
      )),
      '\'',
    ),
    _multiline_string_literal: $ => seq(
      '\'\'\'',
      repeat(choice(
        alias($._multiline_string_content, $.multiline_string_content),
        $._escape_sequence,
        $.interpolation,
      )),
      '\'\'\'',
    ),

    string_content: _ => token(prec(-1, /[^'$\\]+/)),
    _multiline_string_content: _ => token(prec.right(-1,
      choice(
        /[^']+/,
        seq(/'[^']*/, repeat(/[^']+/)),
      ),
    )),

    _escape_sequence: $ =>
      choice(
        prec(2, token.immediate(seq('\\', /[^abfnrtvxu'\"\\\?]/))),
        prec(1, $.escape_sequence),
      ),
    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        /[^xu0-7]/,
        /[0-7]{1,3}/,
        /x[0-9a-fA-F]{2}/,
        /u[0-9a-fA-F]{4}/,
        /u{[0-9a-fA-F]+}/,
      ))),

    interpolation: $ => prec(1, seq('${', $.expression, '}')),

    identifier: _ => token(/[a-zA-Z_*][a-zA-Z0-9_]*/), // TODO: support unicode, namespaces
    keyword_identifier: $ => prec(-3, alias(
      choice(
        'module',
        'import',
        'provider',
        'metadata',
        'output',
        'param',
        'resource',
        'existing',
        'type',
        'var',
        ...primitive_types,
      ),
      $.identifier,
    )),
    compatible_identifier: $ => prec(1, seq(choice($.identifier, $.keyword_identifier), '?')),

    type: $ => choice(
      $.identifier,
      $.array_type,
      $.object,
      $.builtin_type,
      $._binary_type_expression,
      $.member_expression,
    ),

    _binary_type_expression: $ => {
      const table = [
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULTIPLY],
        ['/', PREC.MULTIPLY],
        ['%', PREC.MULTIPLY],
        ['||', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['|', PREC.INCLUSIVE_OR],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['=~', PREC.EQUAL],
        ['!~', PREC.EQUAL],
        ['>', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['??', PREC.TERNARY],
      ];

      const types = choice(
        $.identifier,
        $.array_type,
        $.object,
        $.builtin_type,
      );

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field('left', types),
          // @ts-ignore
          field('operator', operator),
          field('right', types),
        ));
      }));
    },

    builtin_type: $ => choice($.primitive_type, $._array_builtin_type),
    primitive_type: _ => choice(...primitive_types),
    _array_builtin_type: $ => seq($.primitive_type, repeat1(seq('[', ']'))),
    array_type: $ => seq($.expression, repeat1(seq('[', ']'))),
    nullable_type: $ => seq(
      choice(
        $.expression,
        $.builtin_type,
        $.array_type,
      ),
      '!',
    ),

    // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
    comment: _ => token(choice(
      seq('//', /(\\(.|\r?\n)|[^\\\n])*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    )),
    diagnostic_comment: _ => token(prec(-1, seq('#', /.*/))),
  },
});

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {ChoiceRule}
 *
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {SeqRule}
 *
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

/**
 * Creates a rule to match one or more of the rules optionally separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {SeqRule}
 *
 */
function optionalCommaSep1(rule) {
  return seq(rule, repeat(seq(optional(','), rule)), optional(','));
}

/**
 * Creates a rule to optionally match one or more of the rules optionally separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {ChoiceRule}
 *
 */
function optionalCommaSep(rule) {
  return optional(optionalCommaSep1(rule));
}
