const fs = require('fs');
const path = require('path');

// Crear archivo Excel con formato adecuado
const excelData = [
  ['Nombre', 'Latitud', 'Longitud', 'Dirección', 'Ruta', 'TiempoEspera'],
  ['Supermercado Wong Miraflores', -12.120533, -77.029442, 'Av. Larco 1301 - Miraflores', 'Norte', 30],
  ['Farmacia InkaFarma San Isidro', -12.096503, -77.035156, 'Av. Javier Prado Este 2875 - San Isidro', 'Norte', 15],
  ['Minimarket Metro Surco', -12.147889, -77.011111, 'Av. Benavides 3720 - Surco', 'Sur', 20],
  ['', '', '', '', '', ''],
  ['', '', '', '', '', ''],
  ['', '', '', '', '', ''],
  ['', '', '', '', '', ''],
  ['', '', '', '', '', ''],
  ['', '', '', '', '', ''],
  ['', '', '', '', '', ''],
  ['', '', '', '', '', ''],
  ['', '', '', '', '', ''],
  ['', '', '', '', '', ''],
];

// Convertir a formato CSV con codificación UTF-8 BOM para mejor compatibilidad con Excel
const csvContent = '\uFEFF' + excelData.map(row => 
  row.map(cell => {
    // Si el campo contiene comas, comillas o saltos de línea, envolverlo en comillas
    const cellStr = String(cell);
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
      return '"' + cellStr.replace(/"/g, '""') + '"';
    }
    return cellStr;
  }).join(',')
).join('\n');

const outputPath = path.join(__dirname, '../public/puntos-entrega-ejemplo.csv');
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log('✅ Archivo CSV de ejemplo creado exitosamente en:', outputPath);
console.log('📋 El archivo incluye:');
console.log('   - Encabezados claros');
console.log('   - 3 ejemplos de datos');
console.log('   - 10 filas vacías para que el cliente las complete');
console.log('   - Formato UTF-8 con BOM para compatibilidad con Excel');
