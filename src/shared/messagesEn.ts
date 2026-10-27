/**
 * Messages du cœur en anglais : l'assembleur, le simulateur (exceptions, TOS, Kickstart, puces de
 * l'Amiga) et les vérifications écrivent en français, et ce français reste la référence (les
 * tests le vérifient). Au moment de l'affichage, chaque ligne est reconnue par un motif et
 * réécrite en anglais en gardant les valeurs (noms, nombres, adresses). Une ligne inconnue reste
 * en français : rien ne se perd si un message nouveau n'a pas encore son motif.
 */
import type { Langue } from './traduction'

/** Groupes du motif (le texte entier en 0), et la traduction d'un morceau de phrase. */
type Rendu = string | ((g: string[], t: (s: string) => string) => string)

export interface Motif {
  fr: RegExp
  /** `{1}` : le groupe tel quel ; `{t1}` : le groupe traduit (morceau de phrase ou message). */
  en: Rendu
  /** Un vrai message reconnu par ce motif (vérifié par les tests). */
  exemple: string
}

const A = "['’]" // apostrophe droite ou typographique

// --- Morceaux de phrase insérés dans les messages -------------------------------------

const MORCEAUX: Record<string, string> = {
  // Modes d'adressage refusés (encodeur)
  'un registre de données': 'a data register',
  "un registre d'adresse": 'an address register',
  'une adresse absolue': 'an absolute address',
  'une valeur immédiate #': 'an immediate value #',
  'une liste de registres': 'a register list',
  // Valeurs hors limites
  'Déplacement (8 bits)': 'Displacement (8 bits)',
  'Déplacement (16 bits)': 'Displacement (16 bits)',
  'Déplacement relatif au PC (16 bits)': 'PC-relative displacement (16 bits)',
  'Valeur immédiate (.B)': 'Immediate value (.B)',
  'Valeur immédiate (.W)': 'Immediate value (.W)',
  'Valeur immédiate': 'Immediate value',
  'Masque de registres': 'Register mask',
  'Déplacement de LINK': 'LINK displacement',
  'Numéro de TRAP': 'TRAP number',
  'Numéro de bit': 'Bit number',
  'Nombre de décalages': 'Shift count',
  // Valeurs à connaître dès la première passe
  'Le nombre de répétitions': 'The repeat count',
  'La condition': 'The condition',
  'La taille de RS': 'The size of RS',
  'La valeur de RSSET': 'The value of RSSET',
  "L'adresse de ORG": 'The address of ORG',
  'Le décalage de CNOP': 'The CNOP offset',
  "L'alignement de CNOP": 'The CNOP alignment',
  'La taille de DS': 'The size of DS',
  'Le nombre de DCB': 'The DCB count',
  // Nombre d'opérandes
  "pas d'opérande": 'no operand',
  'un opérande': 'one operand',
  // Exceptions du 68000
  'Erreur de bus': 'Bus error',
  "Erreur d'adresse": 'Address error',
  'Instruction illégale': 'Illegal instruction',
  'Division par zéro': 'Division by zero',
  'Instruction CHK (valeur hors limites)': 'CHK instruction (value out of bounds)',
  'TRAPV (débordement)': 'TRAPV (overflow)',
  'Violation de privilège': 'Privilege violation',
  'Ligne A ($Axxx)': 'Line A ($Axxx)',
  'Ligne F ($Fxxx)': 'Line F ($Fxxx)',
  'Interruption parasite': 'Spurious interrupt'
}

const MORCEAUX_MOTIFS: [RegExp, (g: string[]) => string][] = [
  [/^Valeur de (\S+)$/, (g) => `${g[1]} value`],
  [/^(\d+) opérandes$/, (g) => `${g[1]} operands`],
  [/^(\S+) sur un registre$/, (g) => `${g[1]} on a register`],
  [/^(\S+) en mémoire$/, (g) => `${g[1]} in memory`],
  [/^(\S+) vers (\S+)$/, (g) => `${g[1]} to ${g[2]}`],
  [/^Interruption de niveau (\d+)$/, (g) => `Level ${g[1]} interrupt`],
  [/^Exception \(vecteur (\d+)\)$/, (g) => `Exception (vector ${g[1]})`]
]

// --- Messages complets ------------------------------------------------------------------

export const MOTIFS: Motif[] = [
  // Préfixes : fichier inclus, macro, numéro de ligne, export
  {
    fr: /^Dans la macro (\S+) : (.*)$/,
    en: 'In macro {1}: {t2}',
    exemple: 'Dans la macro AFFICHE : Opérande manquant.'
  },
  {
    fr: /^Ligne (\d+) : (.*)$/,
    en: 'Line {1}: {t2}',
    exemple: 'Ligne 12 : Valeur manquante.'
  },
  {
    fr: /^(.+), ligne (\d+) : (.*)$/,
    en: '{1}, line {2}: {t3}',
    exemple: 'macros.i, ligne 3 : Expression incomplète.'
  },
  {
    fr: /^Export impossible : (.*)$/,
    en: 'Export failed: {t1}',
    exemple: 'Export impossible : Valeur manquante.'
  },

  // --- Assembleur : symboles et étiquettes ---
  {
    fr: new RegExp(`^« (.+?) » n${A}existe pas : les registres vont de D0 à D7 et de A0 à A7\\.$`),
    en: '“{1}” does not exist: registers go from D0 to D7 and from A0 to A7.',
    exemple: "« D8 » n'existe pas : les registres vont de D0 à D7 et de A0 à A7."
  },
  {
    fr: /^« (.+?) » : tu as tapé la lettre « (.) » au lieu du chiffre (zéro|un)\. Le registre s'écrit (\S+)\.$/,
    en: (g) => `“${g[1]}”: you typed the letter “${g[2]}” instead of the digit ${g[3] === 'zéro' ? 'zero' : 'one'}. The register is written ${g[4]}.`,
    exemple: "« DO » : tu as tapé la lettre « O » au lieu du chiffre zéro. Le registre s'écrit D0."
  },
  {
    fr: new RegExp(`^Le nom « (.+?) » n${A}est défini nulle part : l${A}étiquette s${A}écrit « (.+?) » \\(les majuscules et minuscules comptent dans les étiquettes, comme sous Devpac\\)\\.$`),
    en: 'The name “{1}” is not defined anywhere: the label is written “{2}” (case matters in labels, as in Devpac).',
    exemple: "Le nom « boucle » n'est défini nulle part : l'étiquette s'écrit « Boucle » (les majuscules et minuscules comptent dans les étiquettes, comme sous Devpac)."
  },
  {
    fr: new RegExp(`^Le nom « (.+?) » n${A}est défini nulle part : vouliez-vous dire « (.+?) » \\?$`),
    en: 'The name “{1}” is not defined anywhere: did you mean “{2}”?',
    exemple: "Le nom « bocle » n'est défini nulle part : vouliez-vous dire « boucle » ?"
  },
  {
    fr: new RegExp(`^Le nom « (.+?) » n${A}est défini nulle part : étiquette mal orthographiée ou oubliée \\?$`),
    en: 'The name “{1}” is not defined anywhere: is the label misspelled or missing?',
    exemple: "Le nom « fin » n'est défini nulle part : étiquette mal orthographiée ou oubliée ?"
  },
  {
    fr: new RegExp(`^(.+) doit pouvoir se calculer à cet endroit : n${A}utilise que des noms définis plus haut\\.$`),
    en: '{t1} must be computable at this point: only use names defined above.',
    exemple: "La taille de DS doit pouvoir se calculer à cet endroit : n'utilise que des noms définis plus haut."
  },
  {
    fr: new RegExp(`^« (.+?) » n${A}est pas un nom d${A}étiquette valide\\.$`),
    en: '“{1}” is not a valid label name.',
    exemple: "« 2x » n'est pas un nom d'étiquette valide."
  },
  {
    fr: new RegExp(`^L${A}étiquette « (.+?) » porte le nom d${A}une instruction : c${A}est permis, mais source de confusion\\.$`),
    en: 'The label “{1}” has the name of an instruction: this is allowed, but confusing.',
    exemple: "L'étiquette « NOP » porte le nom d'une instruction : c'est permis, mais source de confusion."
  },
  {
    fr: new RegExp(`^L${A}étiquette « (.+?) » est définie deux fois : chaque étiquette doit être unique\\.$`),
    en: 'The label “{1}” is defined twice: each label must be unique.',
    exemple: "L'étiquette « fin » est définie deux fois : chaque étiquette doit être unique."
  },
  {
    fr: new RegExp(
      `^L${A}étiquette « (.+?) » \\(ligne (\\d+)\\) est restée à l${A}adresse impaire (\\$[0-9A-F]+), alors que ce qui suit a été aligné : ` +
        `un accès \\.W ou \\.L par cette étiquette provoquera une erreur d${A}adresse\\. Ajoute EVEN avant l${A}étiquette\\.$`
    ),
    en: 'The label “{1}” (line {2}) stayed at the odd address {3}, while what follows was aligned: a .W or .L access through this label will cause an address error. Add EVEN before the label.',
    exemple:
      "L'étiquette « VALEUR » (ligne 4) est restée à l'adresse impaire $1001, alors que ce qui suit a été aligné : un accès .W ou .L par cette étiquette provoquera une erreur d'adresse. Ajoute EVEN avant l'étiquette."
  },

  // --- Assembleur : structure du source ---
  {
    fr: /^La section BSS ne contient que des réservations \(DS\) : pas de code ni de DC\.$/,
    en: 'The BSS section only holds reservations (DS): no code and no DC.',
    exemple: 'La section BSS ne contient que des réservations (DS) : pas de code ni de DC.'
  },
  {
    fr: /^(\S+) sans (\S+) correspondant\.$/,
    en: '{1} without a matching {2}.',
    exemple: 'ENDM sans MACRO correspondant.'
  },
  {
    fr: /^Une macro doit avoir un nom \(en première colonne, devant MACRO\)\.$/,
    en: 'A macro must have a name (in the first column, before MACRO).',
    exemple: 'Une macro doit avoir un nom (en première colonne, devant MACRO).'
  },
  {
    fr: new RegExp(`^Un IF n${A}a pas de ENDC correspondant\\.$`),
    en: 'An IF has no matching ENDC.',
    exemple: 'Un IF n’a pas de ENDC correspondant.'
  },
  {
    fr: /^« (.+?) » n'est pas une instruction du 68000 : vouliez-vous dire « (.+?) » \?$/,
    en: '“{1}” is not a 68000 instruction: did you mean “{2}”?',
    exemple: "« MOVEE » n'est pas une instruction du 68000 : vouliez-vous dire « MOVE » ?"
  },
  {
    fr: /^« (.+?) » n'est pas une instruction du 68000\. Faute de frappe \?$/,
    en: '“{1}” is not a 68000 instruction. A typo?',
    exemple: "« XYZZY » n'est pas une instruction du 68000. Faute de frappe ?"
  },
  {
    fr: /^Instruction alignée sur une adresse paire \(un octet nul ajouté\)\. Pense à EVEN après un texte en DC\.B\.$/,
    en: 'Instruction aligned on an even address (a zero byte was added). Remember EVEN after a text in DC.B.',
    exemple: 'Instruction alignée sur une adresse paire (un octet nul ajouté). Pense à EVEN après un texte en DC.B.'
  },
  {
    fr: /^Donnée alignée sur une adresse paire \(un octet nul ajouté\)\.$/,
    en: 'Data aligned on an even address (a zero byte was added).',
    exemple: 'Donnée alignée sur une adresse paire (un octet nul ajouté).'
  },
  {
    fr: new RegExp(`^(\\S+) a besoin d${A}un nom en première colonne \\(par exemple : LARGEUR (\\S+) 320\\)\\.$`),
    en: '{1} needs a name in the first column (for example: WIDTH {2} 320).',
    exemple: "EQU a besoin d'un nom en première colonne (par exemple : LARGEUR EQU 320)."
  },
  {
    fr: /^La valeur de (.+) ne peut pas être calculée\.$/,
    en: 'The value of {1} cannot be computed.',
    exemple: 'La valeur de LARGEUR ne peut pas être calculée.'
  },
  {
    fr: /^Section « (.+?) » inconnue : les sections sont TEXT, DATA et BSS \(Atari\), ou SECTION nom,CODE\|DATA\|BSS \(Amiga, avec _C pour la Chip RAM\)\.$/,
    en: 'Unknown section “{1}”: the sections are TEXT, DATA and BSS (Atari), or SECTION name,CODE|DATA|BSS (Amiga, with _C for Chip RAM).',
    exemple: 'Section « TOTO » inconnue : les sections sont TEXT, DATA et BSS (Atari), ou SECTION nom,CODE|DATA|BSS (Amiga, avec _C pour la Chip RAM).'
  },
  {
    fr: new RegExp(`^L${A}alignement de CNOP doit être positif\\.$`),
    en: 'The CNOP alignment must be positive.',
    exemple: "L'alignement de CNOP doit être positif."
  },
  {
    fr: /^DS ne peut pas réserver une taille négative\.$/,
    en: 'DS cannot reserve a negative size.',
    exemple: 'DS ne peut pas réserver une taille négative.'
  },
  {
    fr: /^Fichier « (.+?) » introuvable pour (INCLUDE|INCBIN)\.$/,
    en: 'File “{1}” not found for {2}.',
    exemple: 'Fichier « macros.i » introuvable pour INCLUDE.'
  },
  {
    fr: new RegExp(`^Trop de INCLUDE imbriqués \\(un fichier s${A}inclut-il lui-même \\?\\)\\.$`),
    en: 'Too many nested INCLUDEs (does a file include itself?).',
    exemple: 'Trop de INCLUDE imbriqués (un fichier s’inclut-il lui-même ?).'
  },
  {
    fr: /^FAIL : (.*)$/,
    en: 'FAIL: {1}',
    exemple: 'FAIL : taille trop grande'
  },
  {
    fr: /^FAIL rencontré\.$/,
    en: 'FAIL reached.',
    exemple: 'FAIL rencontré.'
  },
  {
    fr: /^Directive « (.+?) » non prise en charge\.$/,
    en: 'Directive “{1}” is not supported.',
    exemple: 'Directive « LIST » non prise en charge.'
  },
  {
    fr: /^Valeur hors limites pour (DC\.[BW]) : (-?\d+) \(permis : (-?\d+) à (-?\d+)\)\.$/,
    en: 'Value out of range for {1}: {2} (allowed: {3} to {4}).',
    exemple: 'Valeur hors limites pour DC.B : 300 (permis : -128 à 255).'
  },
  {
    fr: /^Une adresse du programme ne tient pas dans un DC\.W relogeable : utilise DC\.L\.$/,
    en: 'A program address does not fit in a relocatable DC.W: use DC.L.',
    exemple: 'Une adresse du programme ne tient pas dans un DC.W relogeable : utilise DC.L.'
  },

  // --- Assembleur : instructions et opérandes ---
  {
    fr: /^(\S+) n'accepte pas (.+) à cet endroit\.$/,
    en: '{1} does not accept {t2} here.',
    exemple: "MOVEQ n'accepte pas un registre d'adresse à cet endroit."
  },
  {
    fr: /^(.+) hors limites : (-?\d+) \(permis : (-?\d+) à (-?\d+)\)\.$/,
    en: '{t1} out of range: {2} (allowed: {3} to {4}).',
    exemple: 'Numéro de TRAP hors limites : 16 (permis : 0 à 15).'
  },
  {
    fr: /^Une adresse du programme ne tient pas sur 16 bits dans un \.PRG relogeable : utilise un mode relatif au PC ou une adresse \.L\.$/,
    en: 'A program address does not fit in 16 bits in a relocatable .PRG: use a PC-relative mode or a .L address.',
    exemple: 'Une adresse du programme ne tient pas sur 16 bits dans un .PRG relogeable : utilise un mode relatif au PC ou une adresse .L.'
  },
  {
    fr: /^Adresse courte \(\.W\) hors limites : (\$[0-9A-F]+) \(permis : \$0000-\$7FFF et \$FFFF8000-\$FFFFFFFF\)\.$/,
    en: 'Short address (.W) out of range: {1} (allowed: $0000-$7FFF and $FFFF8000-$FFFFFFFF).',
    exemple: 'Adresse courte (.W) hors limites : $8000 (permis : $0000-$7FFF et $FFFF8000-$FFFFFFFF).'
  },
  {
    fr: /^(\S+) attend une étiquette \(la destination du saut\)\.$/,
    en: '{1} expects a label (the branch target).',
    exemple: 'BRA attend une étiquette (la destination du saut).'
  },
  {
    fr: /^La taille \.(\S+) n'existe pas pour (.+)\.$/,
    en: 'Size .{1} does not exist for {t2}.',
    exemple: "La taille .W n'existe pas pour BTST sur un registre."
  },
  {
    fr: /^MOVEM attend une liste de registres \(par exemple D0-D3\/A0\)\.$/,
    en: 'MOVEM expects a register list (for example D0-D3/A0).',
    exemple: 'MOVEM attend une liste de registres (par exemple D0-D3/A0).'
  },
  {
    fr: /^MOVEP attend un opérande de la forme d\(An\)\.$/,
    en: 'MOVEP expects an operand of the form d(An).',
    exemple: 'MOVEP attend un opérande de la forme d(An).'
  },
  {
    fr: /^(\S+) attend une expression\.$/,
    en: '{1} expects an expression.',
    exemple: 'IFEQ attend une expression.'
  },
  {
    fr: /^(\S+) attend une valeur\.$/,
    en: '{1} expects a value.',
    exemple: 'DC attend une valeur.'
  },
  {
    fr: /^(\S+) attend (pas d'opérande|un opérande|\d+ opérandes)\.$/,
    en: '{1} expects {t2}.',
    exemple: 'MOVE attend 2 opérandes.'
  },
  {
    fr: /^Un (\S+)\.S ne peut pas sauter à l'instruction juste après lui \(déplacement nul\) : enlève le \.S\.$/,
    en: 'A {1}.S cannot branch to the instruction right after it (zero displacement): remove the .S.',
    exemple: "Un BRA.S ne peut pas sauter à l'instruction juste après lui (déplacement nul) : enlève le .S."
  },
  {
    fr: /^Saut trop long pour la forme courte \.S \((-?\d+) octets, permis : -128 à \+127\) : enlève le \.S\.$/,
    en: 'Branch too far for the short .S form ({1} bytes, allowed: -128 to +127): remove the .S.',
    exemple: 'Saut trop long pour la forme courte .S (300 octets, permis : -128 à +127) : enlève le .S.'
  },
  {
    fr: /^Saut trop long \((-?\d+) octets, permis : ±32 Ko\)\.$/,
    en: 'Branch too far ({1} bytes, allowed: ±32 KB).',
    exemple: 'Saut trop long (40000 octets, permis : ±32 Ko).'
  },
  {
    fr: /^Saut trop long pour DBcc\.$/,
    en: 'Branch too far for DBcc.',
    exemple: 'Saut trop long pour DBcc.'
  },
  {
    fr: /^Sans « # », (\S+) est une adresse mémoire : (\S+) va lire ce qui se trouve à l'adresse (\S+)\. Pour la valeur elle-même, écris #(\S+)\.$/,
    en: 'Without “#”, {1} is a memory address: {2} will read what is at address {3}. For the value itself, write #{4}.',
    exemple: "Sans « # », 5 est une adresse mémoire : MOVE va lire ce qui se trouve à l'adresse 5. Pour la valeur elle-même, écris #5."
  },
  {
    fr: /^MOVEA n'écrit que dans un registre d'adresse : assemblé comme un MOVE\.$/,
    en: 'MOVEA only writes to an address register: assembled as a MOVE.',
    exemple: "MOVEA n'écrit que dans un registre d'adresse : assemblé comme un MOVE."
  },
  {
    fr: /^MOVEQ prend une valeur signée : (-?\d+) sera chargé comme (-?\d+)\.$/,
    en: 'MOVEQ takes a signed value: {1} will be loaded as {2}.',
    exemple: 'MOVEQ prend une valeur signée : 200 sera chargé comme -56.'
  },
  {
    fr: /^(\S+) s'écrit Dy,Dx ou -\(Ay\),-\(Ax\)\.$/,
    en: '{1} is written Dy,Dx or -(Ay),-(Ax).',
    exemple: "ADDX s'écrit Dy,Dx ou -(Ay),-(Ax)."
  },
  {
    fr: new RegExp(`^CMPM s${A}écrit \\(Ay\\)\\+,\\(Ax\\)\\+\\.$`),
    en: 'CMPM is written (Ay)+,(Ax)+.',
    exemple: 'CMPM s’écrit (Ay)+,(Ax)+.'
  },
  {
    fr: /^(\S+)\.B est impossible sur un registre d'adresse\.$/,
    en: '{1}.B is not possible on an address register.',
    exemple: "ADDQ.B est impossible sur un registre d'adresse."
  },
  {
    fr: /^« (.+?) » n'est pas une instruction connue\.$/,
    en: '“{1}” is not a known instruction.',
    exemple: "« BT » n'est pas une instruction connue."
  },
  {
    fr: /^Ce suffixe de taille n'est pas permis ici : \.B est interdit avec un registre d'adresse \(A0-A7\)\.$/,
    en: 'This size suffix is not allowed here: .B is forbidden with an address register (A0-A7).',
    exemple: "Ce suffixe de taille n'est pas permis ici : .B est interdit avec un registre d'adresse (A0-A7)."
  },
  {
    fr: /^(\S+)\.B n'existe pas : un registre d'adresse se manipule en \.W ou \.L\.$/,
    en: '{1}.B does not exist: an address register is handled in .W or .L.',
    exemple: "ADDA.B n'existe pas : un registre d'adresse se manipule en .W ou .L."
  },
  {
    fr: /^(\S+) n'existe pas\.$/,
    en: '{1} does not exist.',
    exemple: "ADDI n'existe pas."
  },
  {
    fr: /^Caractère inattendu « (.+?) » dans l'expression\.$/,
    en: 'Unexpected character “{1}” in the expression.',
    exemple: "Caractère inattendu « ? » dans l'expression."
  },
  {
    fr: /^Caractère inattendu « (.+?) » en début de ligne\.$/,
    en: 'Unexpected character “{1}” at the start of the line.',
    exemple: 'Caractère inattendu « ! » en début de ligne.'
  },
  {
    fr: /^Guillemet fermant manquant\.$/,
    en: 'Missing closing quote.',
    exemple: 'Guillemet fermant manquant.'
  },
  {
    fr: /^Une constante caractère contient au plus 4 caractères\.$/,
    en: 'A character constant holds at most 4 characters.',
    exemple: 'Une constante caractère contient au plus 4 caractères.'
  },
  {
    fr: /^Valeur manquante\.$/,
    en: 'Missing value.',
    exemple: 'Valeur manquante.'
  },
  {
    fr: /^Expression incomplète\.$/,
    en: 'Incomplete expression.',
    exemple: 'Expression incomplète.'
  },
  {
    fr: /^Parenthèse fermante « \) » manquante\.$/,
    en: 'Missing closing parenthesis “)”.',
    exemple: 'Parenthèse fermante « ) » manquante.'
  },
  {
    fr: /^« (.+?) » inattendu : il manque une valeur\.$/,
    en: 'Unexpected “{1}”: a value is missing.',
    exemple: '« * » inattendu : il manque une valeur.'
  },
  {
    fr: new RegExp(`^Texte inattendu dans l${A}expression\\.$`),
    en: 'Unexpected text in the expression.',
    exemple: 'Texte inattendu dans l’expression.'
  },
  {
    fr: /^Division par zéro dans une expression\.$/,
    en: 'Division by zero in an expression.',
    exemple: 'Division par zéro dans une expression.'
  },
  {
    fr: /^Opérateur « (.+?) » inconnu\.$/,
    en: 'Unknown operator “{1}”.',
    exemple: 'Opérateur « ** » inconnu.'
  },
  {
    fr: /^Registre d'index « (.+?) » invalide \(attendu : D0-D7 ou A0-A7, avec \.W ou \.L\)\.$/,
    en: 'Invalid index register “{1}” (expected: D0-D7 or A0-A7, with .W or .L).',
    exemple: "Registre d'index « D9 » invalide (attendu : D0-D7 ou A0-A7, avec .W ou .L)."
  },
  {
    fr: /^Opérande manquant\.$/,
    en: 'Missing operand.',
    exemple: 'Opérande manquant.'
  },
  {
    fr: new RegExp(`^Le mode (-\\(…\\)|\\(…\\)\\+) demande un registre d${A}adresse\\.$`),
    en: 'The {1} mode needs an address register.',
    exemple: 'Le mode -(…) demande un registre d’adresse.'
  },
  {
    fr: /^Trop de registres entre parenthèses\.$/,
    en: 'Too many registers in parentheses.',
    exemple: 'Trop de registres entre parenthèses.'
  },
  {
    fr: new RegExp(`^Entre parenthèses, il faut un registre d${A}adresse \\(A0-A7\\) ou PC, pas un registre de données\\.$`),
    en: 'Inside parentheses you need an address register (A0-A7) or PC, not a data register.',
    exemple: 'Entre parenthèses, il faut un registre d’adresse (A0-A7) ou PC, pas un registre de données.'
  },

  // --- Export (.PRG, exécutable AmigaDOS) ---
  {
    fr: new RegExp(`^Le programme contient des erreurs : corrige-les avant de l${A}exporter\\.$`),
    en: 'The program has errors: fix them before exporting it.',
    exemple: 'Le programme contient des erreurs : corrige-les avant de l’exporter.'
  },
  {
    fr: new RegExp(`^Un \\.PRG doit pouvoir être chargé n${A}importe où en mémoire : retire le ORG du programme\\.$`),
    en: 'A .PRG must be loadable anywhere in memory: remove the ORG from the program.',
    exemple: 'Un .PRG doit pouvoir être chargé n’importe où en mémoire : retire le ORG du programme.'
  },
  {
    fr: /^AmigaDOS charge un programme où il veut en mémoire : retire le ORG du programme\.$/,
    en: 'AmigaDOS loads a program wherever it wants in memory: remove the ORG from the program.',
    exemple: 'AmigaDOS charge un programme où il veut en mémoire : retire le ORG du programme.'
  },

  // --- Simulateur : exceptions du 68000 (bombes de l'Atari, Guru Meditation de l'Amiga) ---
  {
    fr: /^(.+?) à l'adresse (\$[0-9A-F]+)(?: \(accès à (\$[0-9A-F]+)\))?(?: — sur Atari ST : (\d+) bombes?| — sur Amiga : « Software Failure », Guru Meditation #([0-9A-F]+))?\.(?: (.*))?$/,
    en: (g, t) => {
      const acces = g[3] ? ` (access to ${g[3]})` : ''
      const bombes = g[4] ? ` — on Atari ST: ${g[4]} bomb${g[4] === '1' ? '' : 's'}` : ''
      const guru = g[5] ? ` — on Amiga: “Software Failure”, Guru Meditation #${g[5]}` : ''
      return `${t(g[1])} at address ${g[2]}${acces}${bombes}${guru}.${g[6] ? ' ' + t(g[6]) : ''}`
    },
    exemple:
      "Erreur d'adresse à l'adresse $1004 (accès à $2001) — sur Atari ST : 3 bombes. Un accès en .W ou en .L s'est fait à une adresse IMPAIRE. Sur 68000, les mots et les longs doivent être à une adresse paire (pense à EVEN après des DC.B)."
  },
  {
    fr: /^Le programme a accédé à une adresse interdite \(en mode utilisateur, le matériel et le bas de la mémoire sont protégés : passe en superviseur, par exemple avec Supexec\)\.$/,
    en: 'The program accessed a forbidden address (in user mode, the hardware and the bottom of memory are protected: switch to supervisor mode, for example with Supexec).',
    exemple:
      'Le programme a accédé à une adresse interdite (en mode utilisateur, le matériel et le bas de la mémoire sont protégés : passe en superviseur, par exemple avec Supexec).'
  },
  {
    fr: /^Un accès en \.W ou en \.L s'est fait à une adresse IMPAIRE\. Sur 68000, les mots et les longs doivent être à une adresse paire \(pense à EVEN après des DC\.B\)\.$/,
    en: 'A .W or .L access was made at an ODD address. On the 68000, words and long words must be at an even address (remember EVEN after DC.B).',
    exemple:
      "Un accès en .W ou en .L s'est fait à une adresse IMPAIRE. Sur 68000, les mots et les longs doivent être à une adresse paire (pense à EVEN après des DC.B)."
  },
  {
    fr: /^Le processeur est tombé sur un code qui n'est pas une instruction : le PC est sans doute parti dans des données \(RTS oublié, pile mal nettoyée \?\)\.$/,
    en: 'The processor ran into a code that is not an instruction: the PC has probably wandered into data (a missing RTS, a stack not cleaned up?).',
    exemple:
      "Le processeur est tombé sur un code qui n'est pas une instruction : le PC est sans doute parti dans des données (RTS oublié, pile mal nettoyée ?)."
  },
  {
    fr: /^Le diviseur de DIVU\/DIVS vaut 0\. Teste-le avant de diviser\.$/,
    en: 'The DIVU/DIVS divisor is 0. Test it before dividing.',
    exemple: 'Le diviseur de DIVU/DIVS vaut 0. Teste-le avant de diviser.'
  },
  {
    fr: /^Cette instruction est réservée au mode superviseur \(bit S de SR à 1\)\. En mode utilisateur, elle déclenche une violation de privilège\.$/,
    en: 'This instruction is reserved for supervisor mode (S bit of SR set to 1). In user mode, it triggers a privilege violation.',
    exemple:
      'Cette instruction est réservée au mode superviseur (bit S de SR à 1). En mode utilisateur, elle déclenche une violation de privilège.'
  },
  {
    fr: /^Écriture d'un octet dans un registre d'adresse \(An\) invalide$/,
    en: 'Invalid byte write to an address register (An)',
    exemple: "Écriture d'un octet dans un registre d'adresse (An) invalide"
  },
  {
    fr: /^Instruction non reconnue ou non simulée \(code (\$[0-9A-F]+)\)\. Les instructions BCD \(ABCD, SBCD, NBCD\) ne sont pas encore simulées\.$/,
    en: 'Unrecognized or unsimulated instruction (code {1}). The BCD instructions (ABCD, SBCD, NBCD) are not simulated yet.',
    exemple: 'Instruction non reconnue ou non simulée (code $4AFB). Les instructions BCD (ABCD, SBCD, NBCD) ne sont pas encore simulées.'
  },
  {
    fr: /^Instruction (\S+) non simulée \(calcul BCD\)\.$/,
    en: '{1} instruction not simulated (BCD arithmetic).',
    exemple: 'Instruction SBCD non simulée (calcul BCD).'
  },
  {
    fr: /^Tâche TRAP #15 non supportée: D0=(\d+)$/,
    en: 'TRAP #15 task not supported: D0={1}',
    exemple: 'Tâche TRAP #15 non supportée: D0=7'
  },

  // --- Simulateur : TOS, GEM et Ligne A de l'Atari ---
  {
    fr: new RegExp(`^Le programme attend une touche, mais aucune touche n${A}a été prévue pour cet exercice\\.$`),
    en: 'The program waits for a key, but no key was planned for this exercise.',
    exemple: "Le programme attend une touche, mais aucune touche n'a été prévue pour cet exercice."
  },
  {
    fr: /^Fonction GEMDOS (\d+) \((\$?[0-9a-fA-F]+)\) non simulée\.$/,
    en: 'GEMDOS function {1} ({2}) is not simulated.',
    exemple: 'Fonction GEMDOS 61 ($3d) non simulée.'
  },
  {
    fr: /^Fonction (BIOS|XBIOS) (\d+) non simulée\.$/,
    en: '{1} function {2} is not simulated.',
    exemple: 'Fonction XBIOS 64 non simulée.'
  },
  {
    fr: /^Retour de Supexec inattendu\.$/,
    en: 'Unexpected return from Supexec.',
    exemple: 'Retour de Supexec inattendu.'
  },
  {
    fr: /^Le VDI du GEM n'est pas simulé par 68k Trainer : essaie ton programme dans Hatari\.$/,
    en: 'The GEM VDI is not simulated by 68k Trainer: try your program in Hatari.',
    exemple: "Le VDI du GEM n'est pas simulé par 68k Trainer : essaie ton programme dans Hatari."
  },
  {
    fr: /^form_alert : le texte « (.*) » ne suit pas le format \[icône\]\[lignes\]\[boutons\]\.$/,
    en: 'form_alert: the text “{1}” does not follow the [icon][lines][buttons] format.',
    exemple: 'form_alert : le texte « [1][Coucou] » ne suit pas le format [icône][lignes][boutons].'
  },
  {
    fr: /^La fonction AES n° (\d+) n'est pas simulée par 68k Trainer \(seulement appl_init, appl_exit, form_alert, graf_handle et graf_mouse\) : essaie ton programme dans Hatari\.$/,
    en: 'AES function no. {1} is not simulated by 68k Trainer (only appl_init, appl_exit, form_alert, graf_handle and graf_mouse): try your program in Hatari.',
    exemple:
      "La fonction AES n° 51 n'est pas simulée par 68k Trainer (seulement appl_init, appl_exit, form_alert, graf_handle et graf_mouse) : essaie ton programme dans Hatari."
  },
  {
    fr: /^La fonction Ligne A (\$[0-9A-F]+) n'est pas simulée par 68k Trainer \(seulement \$A000 à \$A003, \$A009 et \$A00A\) : essaie ton programme dans Hatari\.$/,
    en: 'The Line A function {1} is not simulated by 68k Trainer (only $A000 to $A003, $A009 and $A00A): try your program in Hatari.',
    exemple: "La fonction Ligne A $A004 n'est pas simulée par 68k Trainer (seulement $A000 à $A003, $A009 et $A00A) : essaie ton programme dans Hatari."
  },

  // --- Simulateur : Kickstart de l'Amiga ---
  {
    fr: new RegExp(
      `^FreeMem\\((\\$[0-9A-F]+)\\) : ce bloc n${A}a pas été alloué par AllocMem \\(ou il a déjà été libéré\\)\\. ` +
        'Sur un vrai Amiga : Software Failure, Guru Meditation #81000009 \\(mémoire libérée deux fois\\)\\.$'
    ),
    en: 'FreeMem({1}): this block was not allocated by AllocMem (or it has already been freed). On a real Amiga: Software Failure, Guru Meditation #81000009 (memory freed twice).',
    exemple:
      "FreeMem($20000) : ce bloc n'a pas été alloué par AllocMem (ou il a déjà été libéré). Sur un vrai Amiga : Software Failure, Guru Meditation #81000009 (mémoire libérée deux fois)."
  },
  {
    fr: /^FreeMem : le bloc fait (\d+) octets mais tu en libères (\d+)\. Il faut donner exactement la taille passée à AllocMem\.$/,
    en: 'FreeMem: the block is {1} bytes but you are freeing {2}. You must give exactly the size passed to AllocMem.',
    exemple: 'FreeMem : le bloc fait 1024 octets mais tu en libères 512. Il faut donner exactement la taille passée à AllocMem.'
  },
  {
    fr: new RegExp(`^Le programme attend une ligne tapée au clavier \\(Read\\), mais rien n${A}a été prévu pour cet exercice\\.$`),
    en: 'The program waits for a line typed on the keyboard (Read), but nothing was planned for this exercise.',
    exemple: "Le programme attend une ligne tapée au clavier (Read), mais rien n'a été prévu pour cet exercice."
  },
  {
    fr: /^RawDoFmt : seule la routine classique « MOVE\.B D0,\(A3\)\+ \/ RTS » est simulée pour A2\.$/,
    en: 'RawDoFmt: only the classic “MOVE.B D0,(A3)+ / RTS” routine is simulated for A2.',
    exemple: 'RawDoFmt : seule la routine classique « MOVE.B D0,(A3)+ / RTS » est simulée pour A2.'
  },
  {
    fr: /^(\w+) : seul le numéro 5 \(INTB_VERTB, la VBL\) est simulé\.$/,
    en: '{1}: only number 5 (INTB_VERTB, the VBL) is simulated.',
    exemple: 'AddIntServer : seul le numéro 5 (INTB_VERTB, la VBL) est simulé.'
  },
  {
    fr: /^Wait\(\) attend un signal \(Ctrl\+C…\) qui ne viendra jamais dans cet exercice\.$/,
    en: 'Wait() waits for a signal (Ctrl+C…) that will never come in this exercise.',
    exemple: 'Wait() attend un signal (Ctrl+C…) qui ne viendra jamais dans cet exercice.'
  },
  {
    fr: /^Write\(\) avec une poignée nulle \(D1 = 0\) : as-tu bien appelé Output\(\) et rangé D0 dans D1 \?$/,
    en: 'Write() with a null handle (D1 = 0): did you call Output() and put D0 into D1?',
    exemple: 'Write() avec une poignée nulle (D1 = 0) : as-tu bien appelé Output() et rangé D0 dans D1 ?'
  },
  {
    fr: /^LoadView : seules la vue du système \(gb_ActiView\) et 0 sont simulées\.$/,
    en: 'LoadView: only the system view (gb_ActiView) and 0 are simulated.',
    exemple: 'LoadView : seules la vue du système (gb_ActiView) et 0 sont simulées.'
  },
  {
    fr: /^(\S+), fonction (-?\d+)(?: \((\w+)\))? : non simulée dans 68k Trainer\.( Vérifie le décalage et la bibliothèque dans A6\.)?$/,
    en: (g) => `${g[1]}, function ${g[2]}${g[3] ? ` (${g[3]})` : ''}: not simulated in 68k Trainer.${g[4] ? ' Check the offset and the library in A6.' : ''}`,
    exemple: 'exec.library, fonction -198 (AllocMem) : non simulée dans 68k Trainer. Vérifie le décalage et la bibliothèque dans A6.'
  },
  // Système rendu (bilan de fin de programme)
  {
    fr: /^Forbid\(\) appelé (\d+) fois de plus que Permit\(\) : le multitâche reste bloqué\.$/,
    en: 'Forbid() called {1} more time(s) than Permit(): multitasking stays blocked.',
    exemple: 'Forbid() appelé 1 fois de plus que Permit() : le multitâche reste bloqué.'
  },
  {
    fr: /^Permit\(\) appelé plus souvent que Forbid\(\)\.$/,
    en: 'Permit() called more often than Forbid().',
    exemple: 'Permit() appelé plus souvent que Forbid().'
  },
  {
    fr: /^Disable\(\) sans Enable\(\) : les interruptions restent coupées\.$/,
    en: 'Disable() without Enable(): interrupts stay disabled.',
    exemple: 'Disable() sans Enable() : les interruptions restent coupées.'
  },
  {
    fr: /^Enable\(\) appelé plus souvent que Disable\(\)\.$/,
    en: 'Enable() called more often than Disable().',
    exemple: 'Enable() appelé plus souvent que Disable().'
  },
  {
    fr: new RegExp(`^(\\d+) octets alloués par AllocMem n${A}ont pas été rendus par FreeMem\\.$`),
    en: '{1} bytes allocated by AllocMem were not given back by FreeMem.',
    exemple: "1024 octets alloués par AllocMem n'ont pas été rendus par FreeMem."
  },
  {
    fr: new RegExp(`^Le DMA du système n${A}a pas été rétabli \\(DMACON : DMAEN, COPEN, BPLEN\\) : l${A}écran du Workbench reste éteint\\.$`),
    en: 'The system DMA was not restored (DMACON: DMAEN, COPEN, BPLEN): the Workbench screen stays off.',
    exemple: "Le DMA du système n'a pas été rétabli (DMACON : DMAEN, COPEN, BPLEN) : l'écran du Workbench reste éteint."
  },
  {
    fr: new RegExp(`^Les interruptions du système n${A}ont pas été rétablies \\(INTENA\\) : clavier et souris restent figés\\.$`),
    en: 'The system interrupts were not restored (INTENA): keyboard and mouse stay frozen.',
    exemple: "Les interruptions du système n'ont pas été rétablies (INTENA) : clavier et souris restent figés."
  },
  {
    fr: new RegExp(`^La liste Copper du système n${A}a pas été remise dans COP1LC \\(gb_copinit, décalage 38 de GfxBase\\)\\.$`),
    en: 'The system copper list was not put back in COP1LC (gb_copinit, offset 38 of GfxBase).',
    exemple: "La liste Copper du système n'a pas été remise dans COP1LC (gb_copinit, décalage 38 de GfxBase)."
  },
  {
    fr: new RegExp(`^Le vecteur de l${A}interruption de niveau 3 \\(\\$6C\\) n${A}a pas été rendu au système\\.$`),
    en: 'The level 3 interrupt vector ($6C) was not given back to the system.',
    exemple: "Le vecteur de l'interruption de niveau 3 ($6C) n'a pas été rendu au système."
  },
  {
    fr: new RegExp(`^La vue du système n${A}a pas été rechargée \\(LoadView de l${A}ancienne gb_ActiView\\)\\.$`),
    en: 'The system view was not reloaded (LoadView of the old gb_ActiView).',
    exemple: "La vue du système n'a pas été rechargée (LoadView de l'ancienne gb_ActiView)."
  },
  // Remarques des puces de l'Amiga (alertes)
  {
    fr: new RegExp(`^Le Copper s${A}est arrêté : un MOVE vers (\\S+) \\((\\$DFF[0-9A-F]{3})\\) lui est interdit\\.$`),
    en: 'The Copper stopped: a MOVE to {1} ({2}) is forbidden to it.',
    exemple: "Le Copper s'est arrêté : un MOVE vers DMACON ($DFF096) lui est interdit."
  },
  {
    fr: new RegExp(`^Un registre du Blitter a été modifié pendant qu${A}il travaillait : attends sa fin \\(bit 14 de DMACONR, ou WaitBlit\\) avant de préparer le blit suivant\\.$`),
    en: 'A Blitter register was changed while it was working: wait for it to finish (bit 14 of DMACONR, or WaitBlit) before setting up the next blit.',
    exemple:
      'Un registre du Blitter a été modifié pendant qu’il travaillait : attends sa fin (bit 14 de DMACONR, ou WaitBlit) avant de préparer le blit suivant.'
  },
  {
    fr: new RegExp(`^Un blit a été lancé alors que le précédent n${A}était pas fini : il faut attendre le Blitter \\(WaitBlit\\) entre deux blits\\.$`),
    en: 'A blit was started while the previous one was not finished: you must wait for the Blitter (WaitBlit) between two blits.',
    exemple: 'Un blit a été lancé alors que le précédent n’était pas fini : il faut attendre le Blitter (WaitBlit) entre deux blits.'
  },
  {
    fr: /^BLTSIZE écrit alors que le DMA du Blitter est coupé \(DMACON : bits BLTEN et DMAEN\) : le Blitter ne fait rien\.$/,
    en: 'BLTSIZE written while the Blitter DMA is off (DMACON: BLTEN and DMAEN bits): the Blitter does nothing.',
    exemple: 'BLTSIZE écrit alors que le DMA du Blitter est coupé (DMACON : bits BLTEN et DMAEN) : le Blitter ne fait rien.'
  },
  {
    fr: /^Écriture dans la ROM du Kickstart ignorée \(la ROM ne peut pas être modifiée\)\.$/,
    en: 'Write to the Kickstart ROM ignored (the ROM cannot be modified).',
    exemple: 'Écriture dans la ROM du Kickstart ignorée (la ROM ne peut pas être modifiée).'
  },

  // --- Vérification des exercices ---
  {
    fr: /^Le résultat semble bon ici, mais sur un vrai Amiga il serait faux :$/,
    en: 'The result looks right here, but on a real Amiga it would be wrong:',
    exemple: 'Le résultat semble bon ici, mais sur un vrai Amiga il serait faux :'
  },
  {
    fr: /^Le programme doit se terminer par RTS en rendant la main au système\.$/,
    en: 'The program must end with RTS, handing control back to the system.',
    exemple: 'Le programme doit se terminer par RTS en rendant la main au système.'
  },
  {
    fr: new RegExp(`^Le résultat est bon, mais le système n${A}a pas été rendu proprement :$`),
    en: 'The result is right, but the system was not handed back cleanly:',
    exemple: 'Le résultat est bon, mais le système n’a pas été rendu proprement :'
  },
  {
    fr: /^(.+) Et le système a été rendu proprement\.$/,
    en: '{t1} And the system was handed back cleanly.',
    exemple: 'Bravo, les puces sont réglées comme prévu ! Et le système a été rendu proprement.'
  },
  {
    fr: new RegExp(
      `^Le programme ne s${A}est pas terminé : il tournait encore après (\\d+) instructions\\. As-tu oublié la fin \\(Pterm0\\) \\? La pile est-elle équilibrée avant RTS \\?$`
    ),
    en: 'The program did not end: it was still running after {1} instructions. Did you forget the ending (Pterm0)? Is the stack balanced before RTS?',
    exemple:
      "Le programme ne s'est pas terminé : il tournait encore après 5000 instructions. As-tu oublié la fin (Pterm0) ? La pile est-elle équilibrée avant RTS ?"
  },
  {
    fr: /^Sortie attendue : (.*)$/,
    en: 'Expected output: {1}',
    exemple: 'Sortie attendue : "Bonjour"'
  },
  {
    fr: /^Sortie obtenue : (.*)$/,
    en: 'Output you got: {1}',
    exemple: 'Sortie obtenue : "Bonjou"'
  },
  {
    fr: /^Pixel \((\d+), (\d+)\) : couleur (\d+) attendue, couleur (\d+) obtenue$/,
    en: 'Pixel ({1}, {2}): color {3} expected, got color {4}',
    exemple: 'Pixel (10, 20) : couleur 3 attendue, couleur 0 obtenue'
  },
  {
    fr: /^Point \((\d+), (\d+)\) : couleur (\$[0-9A-F]+) attendue, (\$[0-9A-F]+) affichée$/,
    en: 'Point ({1}, {2}): color {3} expected, {4} displayed',
    exemple: 'Point (5, 7) : couleur $0F00 attendue, $0000 affichée'
  },
  {
    fr: /^Voie (\d+) : devrait jouer$/,
    en: 'Channel {1}: should be playing',
    exemple: 'Voie 2 : devrait jouer'
  },
  {
    fr: /^Voie (\d+) : devrait être arrêtée$/,
    en: 'Channel {1}: should be stopped',
    exemple: 'Voie 0 : devrait être arrêtée'
  },
  {
    fr: /^Registre (\d+) du YM2149 : (\S+) attendu, (\$[0-9A-F]+) obtenu$/,
    en: 'YM2149 register {1}: {2} expected, got {3}',
    exemple: 'Registre 7 du YM2149 : $3E attendu, $3F obtenu'
  },
  {
    fr: /^Flag ([XNZVC]) attendu à (\d), obtenu (\d)$/,
    en: 'Flag {1} expected to be {2}, got {3}',
    exemple: 'Flag Z attendu à 1, obtenu 0'
  },
  {
    fr: /^(\S+) : (\$[0-9A-F]+) attendu, (\$[0-9A-F]+) obtenu$/,
    en: '{1}: {2} expected, got {3}',
    exemple: 'COLOR00 : $0F00 attendu, $0000 obtenu'
  },
  {
    fr: /^(\S+) attendu (\S+), obtenu (\$[0-9A-F]+)$/,
    en: '{1} expected {2}, got {3}',
    exemple: 'D0 attendu $0000002A, obtenu $00000029'
  },
  { fr: /^Bravo, la sortie correspond !$/, en: 'Well done, the output matches.', exemple: 'Bravo, la sortie correspond !' },
  {
    fr: /^Bravo, l['’]écran est exactement comme prévu !$/,
    en: 'Well done, the screen is exactly as expected.',
    exemple: 'Bravo, l’écran est exactement comme prévu !'
  },
  {
    fr: /^Bravo, les puces sont réglées comme prévu !$/,
    en: 'Well done, the chips are set up as expected.',
    exemple: 'Bravo, les puces sont réglées comme prévu !'
  },
  { fr: /^Bravo, Paula joue comme prévu !$/, en: 'Well done, Paula plays as expected.', exemple: 'Bravo, Paula joue comme prévu !' },
  {
    fr: /^Bravo, la puce sonore est réglée comme prévu !$/,
    en: 'Well done, the sound chip is set up as expected.',
    exemple: 'Bravo, la puce sonore est réglée comme prévu !'
  },
  { fr: /^Bravo, la mémoire correspond !$/, en: 'Well done, the memory matches.', exemple: 'Bravo, la mémoire correspond !' },
  {
    fr: /^Bravo, tous les registres correspondent !$/,
    en: 'Well done, all the registers match.',
    exemple: 'Bravo, tous les registres correspondent !'
  }
]

function rendre(rendu: Rendu, g: string[], t: (s: string) => string): string {
  if (typeof rendu === 'function') return rendu(g, t)
  return rendu.replace(/\{(t?)(\d)\}/g, (tout: string, signe: string, n: string) => {
    const valeur = g[Number(n)]
    if (valeur === undefined) return tout
    return signe === 't' ? t(valeur) : valeur
  })
}

/** Un morceau de phrase (mode d'adressage, nom d'une valeur…) ou, à défaut, un message entier. */
function morceau(s: string): string {
  if (s in MORCEAUX) return MORCEAUX[s]
  for (const [motif, rendu] of MORCEAUX_MOTIFS) {
    const m = motif.exec(s)
    if (m) return rendu([...m])
  }
  return ligneEnAnglais(s) ?? s
}

/** Une ligne en anglais, ou null si aucun motif ne la reconnaît. */
export function ligneEnAnglais(ligne: string): string | null {
  if (ligne.startsWith('⚠ ')) {
    const suite = ligneEnAnglais(ligne.slice(2))
    return suite === null ? null : '⚠ ' + suite
  }
  if (ligne in MORCEAUX) return MORCEAUX[ligne]
  for (const motif of MOTIFS) {
    const m = motif.fr.exec(ligne)
    if (m) return rendre(motif.en, [...m], morceau)
  }
  return null
}

/**
 * Un message du cœur dans la langue voulue : chaque ligne reconnue est traduite, les autres
 * (sortie d'un programme, message encore sans motif) restent telles quelles.
 */
export function traduireMessage(message: string, langue: Langue): string
export function traduireMessage(message: string | undefined, langue: Langue): string | undefined
export function traduireMessage(message: string | undefined, langue: Langue): string | undefined {
  if (message === undefined || langue === 'fr' || message === '') return message
  return message
    .split('\n')
    .map((ligne) => ligneEnAnglais(ligne) ?? ligne)
    .join('\n')
}
