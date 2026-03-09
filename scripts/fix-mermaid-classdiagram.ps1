# fix-mermaid-classdiagram.ps1
# Corrige errores de sintaxis en diagramas classDiagram de Mermaid v11
# Afecta: §3.8.1 (Modelo de Dominio) y §3.8.2 (Relaciones Externas)

$f = 'c:\Users\CRISTON\Desktop\TMS\TMS-NAVITEL\ORDERS_SYSTEM_DESIGN2.md'
$t = [IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# ============================================================
# FASE 1: Reemplazar ~~FK~~ por (FK) — 10 ocurrencias
# El doble tilde causa conflicto con strikethrough de Mermaid
# ============================================================
$t = $t.Replace(' ~~FK~~', '')
Write-Host "Fase 1: Eliminado ~~FK~~ de atributos"

# ============================================================
# FASE 2: Corregir tipos con multiplicidad en corchetes
# [2..*], [1..*], [0..*], [0..1] → eliminados (multiplicity ya está en relaciones)
# ============================================================
$t = $t.Replace('OrderMilestone[2..*]', 'OrderMilestone[]')
$t = $t.Replace('StatusHistoryEntry[1..*]', 'StatusHistoryEntry[]')
$t = $t.Replace('OrderIncidentRecord[0..*]', 'OrderIncidentRecord[]')
$t = $t.Replace('DeviationReason[0..*]', 'DeviationReason[]')
$t = $t.Replace('OrderCargo[0..1]', 'OrderCargo')
$t = $t.Replace('OrderClosureData[0..1]', 'OrderClosureData')
$t = $t.Replace('ManualEntryData[0..1]', 'ManualEntryData')
Write-Host "Fase 2: Corregido tipos con multiplicidad"

# ============================================================
# FASE 3: Corregir etiquetas de relaciones con \n◆
# \n◆ composición → solo el nombre del campo
# ============================================================
$t = $t.Replace(' : milestones\n◆ composición', ' : milestones')
$t = $t.Replace(' : cargo\n◆ composición', ' : cargo')
$t = $t.Replace(' : closureData\n◆ composición', ' : closureData')
$t = $t.Replace(' : statusHistory\n◆ composición', ' : statusHistory')
$t = $t.Replace(' : incidents\n◆ composición', ' : incidents')
$t = $t.Replace(' : deviationReasons\n◆ composición', ' : deviationReasons')
$t = $t.Replace(' : manualEntryData\n◆ composición', ' : manualEntryData')
Write-Host "Fase 3: Simplificado etiquetas de relaciones"

# ============================================================
# FASE 4: Simplificar stereotypes con caracteres acentuados
# <<entity - Módulo Órdenes>> → <<entity - Ordenes>>
# ============================================================
$t = $t.Replace('<<entity - Módulo Órdenes>>', '<<entity - Ordenes>>')
$t = $t.Replace('<<entity - Módulo Maestro>>', '<<entity - Maestro>>')
$t = $t.Replace('<<entity - Módulo Workflows>>', '<<entity - Workflows>>')
Write-Host "Fase 4: Simplificado stereotypes"

# ============================================================
# ESCRIBIR
# ============================================================
[IO.File]::WriteAllText($f, $t, (New-Object System.Text.UTF8Encoding $false))

# ============================================================
# VERIFICACIÓN
# ============================================================
$verify = [IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

$tildeCount = ([regex]::Matches($verify, '~~FK~~')).Count
Write-Host "`n--- Verificacion ---"
Write-Host "~~FK~~ residuales: $tildeCount"

$bracketMult = ([regex]::Matches($verify, '\[\d\.\.')).Count
Write-Host "Multiplicidad en corchetes [N..]: $bracketMult"

$nlDiamond = ([regex]::Matches($verify, '\\n◆')).Count
Write-Host "Etiquetas con \n◆: $nlDiamond"

$moduloAccent = ([regex]::Matches($verify, 'Módulo')).Count
Write-Host "'Módulo' con acento en stereotypes mermaid: checking..."

# Contar solo dentro de bloques classDiagram
$inClassDiagram = $false
$moduloInMermaid = 0
foreach ($line in $verify.Split("`n")) {
    if ($line.Trim() -eq '```mermaid') { $inClassDiagram = $false }
    if ($line.Trim() -eq 'classDiagram') { $inClassDiagram = $true }
    if ($line.Trim() -eq '```' -and $inClassDiagram) { $inClassDiagram = $false }
    if ($inClassDiagram -and $line -match 'Módulo') { $moduloInMermaid++ }
}
Write-Host "'Módulo' dentro de classDiagram: $moduloInMermaid"

Write-Host "`nScript completado."
