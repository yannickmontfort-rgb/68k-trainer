import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

const MNEMONICS = [
  'move', 'movea', 'moveq', 'movem', 'lea', 'pea', 'clr', 'exg', 'swap',
  'add', 'adda', 'addq', 'addi', 'addx', 'sub', 'suba', 'subq', 'subi', 'subx',
  'neg', 'ext', 'muls', 'mulu', 'divs', 'divu',
  'and', 'or', 'eor', 'not', 'andi', 'ori', 'eori',
  'lsl', 'lsr', 'asl', 'asr', 'rol', 'ror', 'roxl', 'roxr',
  'cmp', 'cmpa', 'cmpi', 'tst', 'btst', 'bset', 'bclr', 'bchg',
  'bra', 'bsr', 'bhi', 'bls', 'bcc', 'bcs', 'bne', 'beq', 'bvc', 'bvs',
  'bpl', 'bmi', 'bge', 'blt', 'bgt', 'ble', 'bt', 'bf', 'dbra', 'dbf', 'dbt',
  'dbhi', 'dbls', 'dbcc', 'dbcs', 'dbne', 'dbeq', 'dbvc', 'dbvs', 'dbpl', 'dbmi', 'dbge', 'dblt', 'dbgt', 'dble',
  'jsr', 'jmp', 'rts', 'rte', 'rtr', 'trap', 'trapv', 'nop', 'stop', 'reset', 'illegal', 'link', 'unlk'
]

const DIRECTIVES = [
  'org', 'dc', 'ds', 'dcb', 'equ', 'even', 'section', 'text', 'data', 'bss',
  'end', 'include', 'if', 'endif', 'macro', 'endm', 'set', 'align', 'offset'
]

const REGISTERS = ['sp', 'pc', 'sr', 'ccr']

export function registerM68kLanguage(): void {
  monaco.languages.register({ id: 'm68k' })

  monaco.languages.setMonarchTokensProvider('m68k', {
    ignoreCase: true,
    mnemonics: MNEMONICS,
    directives: DIRECTIVES,
    registers: REGISTERS,
    tokenizer: {
      root: [
        [/^\s*[*;].*$/, 'comment'],
        [/;.*$/, 'comment'],
        [/^[a-zA-Z_.][\w.]*(?=:|\s)/, 'type.identifier'],
        [/\bd[0-7]\b/i, 'variable.predefined'],
        [/\ba[0-7]\b/i, 'variable.predefined'],
        [
          /[a-zA-Z_][\w.]*/,
          {
            cases: {
              '@mnemonics': 'keyword',
              '@directives': 'keyword.control',
              '@registers': 'variable.predefined',
              '@default': 'identifier'
            }
          }
        ],
        [/\$[0-9a-fA-F]+/, 'number.hex'],
        [/%[01]+/, 'number.binary'],
        [/@[0-7]+/, 'number.octal'],
        [/#-?\d+/, 'number'],
        [/#\$[0-9a-fA-F]+/, 'number.hex'],
        [/-?\d+/, 'number'],
        [/'[^']*'/, 'string'],
        [/"[^"]*"/, 'string'],
        [/[,()#]/, 'delimiter']
      ]
    }
  })

  monaco.languages.setLanguageConfiguration('m68k', {
    comments: { lineComment: ';' },
    brackets: [['(', ')']]
  })

  monaco.editor.defineTheme('m68k-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '4fc1ff', fontStyle: 'bold' },
      { token: 'keyword.control', foreground: 'c586c0' },
      { token: 'variable.predefined', foreground: 'b5cea8' },
      { token: 'type.identifier', foreground: 'dcdcaa' },
      { token: 'number.hex', foreground: 'ce9178' },
      { token: 'comment', foreground: '6a9955' }
    ],
    colors: {}
  })
}
