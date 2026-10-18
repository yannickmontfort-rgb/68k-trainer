/**
 * Reformule les messages d'erreur de vasm (en anglais, techniques) pour un débutant.
 * Le message d'origine reste disponible pour ceux qui veulent le détail.
 */
export function explainVasmError(message: string): string {
  let m: RegExpMatchArray | null

  if ((m = message.match(/unknown mnemonic <(.+)>/i))) {
    return `« ${m[1]} » n'est pas une instruction du 68000. Faute de frappe ? (MOVE, ADD, CMP, BRA, DBRA…)`
  }
  if (/illegal opcode extension/i.test(message)) {
    return "Ce suffixe de taille n'est pas permis ici : par exemple .B est interdit avec un registre d'adresse (A0-A7), et seuls .B, .W, .L (ou .S pour un saut court) existent."
  }
  if ((m = message.match(/undefined symbol <(.+)>/i))) {
    const name = m[1]
    if (/^[DA][89]$/i.test(name)) return `« ${name} » n'existe pas : les registres vont de D0 à D7 et de A0 à A7.`
    return `Le nom « ${name} » n'est défini nulle part : étiquette mal orthographiée ou oubliée (une étiquette se définit en début de ligne, suivie de « : ») ?`
  }
  if ((m = message.match(/operand value out of range: (-?\d+) \(valid: (-?\d+)\.\.(-?\d+)\)/i))) {
    return `La valeur ${m[1]} est hors limites : ici seules les valeurs de ${m[2]} à ${m[3]} sont permises (MOVEQ : -128 à 127 ; ADDQ/SUBQ : 1 à 8).`
  }
  if (/immediate operand out of range/i.test(message)) {
    return 'Valeur immédiate trop grande pour la taille choisie : .B va jusqu\'à 255 ($FF), .W jusqu\'à 65535 ($FFFF).'
  }
  if (/instruction not supported on selected architecture/i.test(message)) {
    return "Cette instruction n'accepte pas ces opérandes sur 68000 : mode d'adressage interdit (une destination immédiate #…, par exemple), ou opérande manquant."
  }
  if (/\) expected|missing closing parenthes/i.test(message)) {
    return 'Il manque une parenthèse fermante « ) ».'
  }
  if ((m = message.match(/label <(.+)> redefined/i))) {
    return `L'étiquette « ${m[1]} » est définie deux fois : chaque étiquette doit être unique.`
  }
  if (/branch destination out of range/i.test(message)) {
    return "Le saut est trop long pour une forme courte (.S, ±128 octets) : enlève le .S."
  }
  if (/number or identifier expected|expression expected/i.test(message)) {
    return 'Il manque une valeur ou un nom à cet endroit (opérande vide, ou « # » sans nombre ?).'
  }
  if (/garbage at end of line/i.test(message)) {
    return "Texte inattendu en fin de ligne : un commentaire doit commencer par « ; »."
  }
  if (/odd|align/i.test(message)) {
    return 'Problème d\'alignement : les mots (.W) et longs (.L) doivent être à une adresse paire. Ajoute EVEN après des DC.B.'
  }
  return message
}
