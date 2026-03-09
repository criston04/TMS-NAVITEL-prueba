# Script: Eliminar emojis de ORDERS_SYSTEM_DESIGN2.md
# - En filas de tabla: reemplazar checks/crosses por Si/No
# - En todo el documento: eliminar emojis decorativos

$f = 'c:\Users\CRISTON\Desktop\TMS\TMS-NAVITEL\ORDERS_SYSTEM_DESIGN2.md'
$t = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

$checkmark = "$([char]0x2705)"   # check mark
$crossmark = "$([char]0x274C)"   # cross mark

# === FASE 1: Reemplazo contextual de checks/crosses ===
$lines = $t -split "`n"
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line.TrimStart().StartsWith('|') -or $line.Contains('Obligatorio')) {
        $lines[$i] = $line.Replace($checkmark, 'Si').Replace($crossmark, 'No')
    } else {
        $lines[$i] = $line.Replace("$checkmark ", '').Replace($checkmark, '').Replace("$crossmark ", '').Replace($crossmark, '')
    }
}
$t = $lines -join "`n"

# === FASE 2: Eliminar warning sign (U+26A0 +/- FE0F +/- espacio) ===
$t = [regex]::Replace($t, "\u26A0\uFE0F?\s?", '')

# === FASE 3: Numeros keycap (digito + FE0F? + 20E3) -> digito + punto ===
$t = [regex]::Replace($t, "(\d)\uFE0F?\u20E3", '$1.')

# === FASE 4: Eliminar variation selectors, ZWJ, keycap combiner ===
$t = $t.Replace("$([char]0xFE0F)", '')
$t = $t.Replace("$([char]0x200D)", '')
$t = $t.Replace("$([char]0x20E3)", '')

# === FASE 5: Eliminar emojis del plano suplementario (surrogate pairs D83C-D83E) ===
$t = [regex]::Replace($t, "[\uD83C-\uD83E][\uDC00-\uDFFF]", '')

# === FASE 6: Eliminar emojis BMP restantes (rangos 2300-23FF, 2600-27BF) ===
$t = [regex]::Replace($t, "[\u2300-\u23FF\u2600-\u27BF]", '')

# === FASE 7: Limpieza de artefactos ===
# Doble+ espacios tras un caracter no-blanco -> un solo espacio
$t = [regex]::Replace($t, '(?<=\S) {2,}', ' ')
# Espacio inicial dentro de bracket-quote en etiquetas Mermaid
$t = $t.Replace('[" ', '["')
# Patron (Si//No) que queda al eliminar warning entre barras
$t = $t.Replace('Si//No', 'Si/Advertencia/No')
$t = $t.Replace('(Si//', '(Si/Advertencia/')
# Lineas que quedaron con un solo espacio al inicio por emoji eliminado
$t = [regex]::Replace($t, '(?m)^ (?=[A-Za-z])', '')

# === ESCRIBIR ===
[System.IO.File]::WriteAllText($f, $t, (New-Object System.Text.UTF8Encoding $false))

# Contar cuantos emojis quedan (verificacion)
$remaining = [regex]::Matches($t, "[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2300-\u23FF\u2600-\u27BF]|\u26A0|\u2705|\u274C").Count
Write-Host "Proceso completado. Emojis restantes: $remaining"
Write-Host "Archivo actualizado: $f"
