/**
 * scripts/importar.js
 * Uso: node scripts/importar.js [ruta-al-excel]
 * Default: busca productos.xlsx en la raíz del proyecto
 *
 * COMPORTAMIENTO: borra todo el catálogo y reimporta desde el Excel.
 * El Excel es la fuente de verdad.
 */

const path     = require('path');
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const Producto = require('../models/Producto');

const ARCHIVO   = process.argv[2] || path.join(__dirname, '../productos.xlsx');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/catalogo';

async function importar() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB conectado');

  const wb    = XLSX.readFile(ARCHIVO);
  const hoja  = wb.Sheets[wb.SheetNames[0]];
  const datos = XLSX.utils.sheet_to_json(hoja);

  console.log(`📦 ${datos.length} filas encontradas en el Excel`);

  // Formatear y filtrar filas válidas
  const productosFormateados = [];
  let errores = 0;

  for (const row of datos) {
    const codigo = String(row['Código'] || row['codigo'] || '').trim();
    if (!codigo) { errores++; continue; }

    const nombre = String(row['Descripción'] || row['nombre'] || '').trim();
    if (!nombre) { errores++; continue; }

    productosFormateados.push({
      codigo,
      codigo_proveedor: String(row['Cód.Arti.Prov.'] || row['codigo_proveedor'] || '').trim(),
      nombre,
      marca:            String(row['Marca']      || row['marca']       || '').trim(),
      categoria:        String(row['Categoría']  || row['categoria']   || '').trim(),
      descripcion:      String(row['Detalle']    || row['descripcion'] || '').trim(),
    });
  }

  console.log(`🗑  Borrando catálogo anterior...`);
  await Producto.deleteMany();

  console.log(`⬆️  Insertando ${productosFormateados.length} productos...`);
  await Producto.insertMany(productosFormateados, { ordered: false });

  console.log(`✅ Importación completa:`);
  console.log(`   Importados: ${productosFormateados.length}`);
  console.log(`   Ignorados:  ${errores} (sin código o sin nombre)`);

  await mongoose.disconnect();
  process.exit(0);
}

importar().catch(err => {
  console.error('❌ Error en importación:', err);
  process.exit(1);
});
