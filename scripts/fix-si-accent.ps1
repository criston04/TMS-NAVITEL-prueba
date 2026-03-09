# fix-si-accent.ps1
# Corrige "Si" → "Sí" (afirmativo) en columnas de tablas Obligatorio y CU matrix,
# sin afectar "Si" condicional (= "if" en español).
# También corrige espacios residuales en nodos Mermaid.

$f = 'c:\Users\CRISTON\Desktop\TMS\TMS-NAVITEL\ORDERS_SYSTEM_DESIGN2.md'
$t = [IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

$accent = "S$([char]0xED)"  # "Sí" construido programáticamente

# ============================================================
# FASE 1: "Si" → "Sí" en celdas de tabla (columna Obligatorio, CU matrix, API params)
# Usa lookbehind/lookahead para no consumir delimitadores y evitar overlaps
# ============================================================

# 1a. Celda standalone: "| Si |" → "| Sí |"
#     Aplica a: Obligatorio columns (~80), CU matrix cells, API params
$t = [regex]::Replace($t, '(?<=\| )Si(?= \|)', $accent)

# 1b. CU matrix con permiso: "| Si `orders:..." → "| Sí `orders:..."
$t = [regex]::Replace($t, '(?<=\| )Si(?= `(?:orders|milestones):)', $accent)

# 1c. Tabla de cardinalidad: "| Si (campo..." y "| Si (sub-..."
$t = [regex]::Replace($t, '(?<=\| )Si(?= \(campo)', $accent)
$t = [regex]::Replace($t, '(?<=\| )Si(?= \(sub-)', $accent)

# 1d. CU matrix: "| Si (automático)" → "| Sí (automático)"
$t = [regex]::Replace($t, '(?<=\| )Si(?= \(autom)', $accent)

# ============================================================
# FASE 2: Texto narrativo dentro de tablas
# ============================================================

# 2a. "muestra Si (éxito)" → "muestra Sí (éxito)"
$t = $t.Replace("muestra Si ($([char]0xE9)xito)", "muestra $accent ($([char]0xE9)xito)")

# 2b. "**verde** Si ," → "**verde** Sí,"
$t = $t.Replace("**verde** Si ,", "**verde** $accent,")

# 2c. "(Si/No)" → "(Sí/No)"
$t = $t.Replace('(Si/No)', "($accent/No)")

# 2d. "(Si/Advertencia/No)" → "(Sí/Advertencia/No)"
$t = $t.Replace('(Si/Advertencia/No)', "($accent/Advertencia/No)")

# ============================================================
# FASE 3: Nodos Mermaid con espacio extra por emojis eliminados
# ============================================================

# 3a. ((" Inicio")) → (("Inicio"))
$t = $t.Replace('((" Inicio"))', '(("Inicio"))')

# 3b. ((" Fin")) → (("Fin"))
$t = $t.Replace('((" Fin"))', '(("Fin"))')

# ============================================================
# ESCRIBIR
# ============================================================
[IO.File]::WriteAllText($f, $t, (New-Object System.Text.UTF8Encoding $false))

# ============================================================
# VERIFICACIÓN
# ============================================================
$verify = [IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# Contar "Sí" en celdas de tabla (afirmativo correcto)
$correctCount = ([regex]::Matches($verify, "(?<=\| )$accent(?= \|)")).Count
Write-Host "Celdas '| $accent |' encontradas: $correctCount"

# Contar "Si" residual en celdas de tabla (potenciales faltantes)
$residualStandalone = ([regex]::Matches($verify, '(?<=\| )Si(?= \|)')).Count
Write-Host "Celdas '| Si |' residuales: $residualStandalone"

# Verificar nodos Mermaid
$mermaidSpaces = ([regex]::Matches($verify, '\(\(" ')).Count
Write-Host "Nodos Mermaid con espacio extra: $mermaidSpaces"

# Verificar (Si/No) residual
$siNoResidual = ([regex]::Matches($verify, '\(Si/')).Count
Write-Host "Patrones (Si/...) residuales: $siNoResidual"

Write-Host "`nScript completado."
