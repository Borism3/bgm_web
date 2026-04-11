/**
 * scripts/generar-descripciones-plantilla.js
 *
 * Genera descripciones automáticas para productos sin descripción usando
 * plantillas basadas en el nombre del producto (tipo de pieza + marca + modelo).
 *
 * Uso:
 *   node scripts/generar-descripciones-plantilla.js          ← solo sin descripción
 *   node scripts/generar-descripciones-plantilla.js --todos  ← sobreescribe todos
 *   node scripts/generar-descripciones-plantilla.js --dry    ← muestra sin guardar
 */

const mongoose = require('mongoose');
const Producto = require('../models/Producto');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/catalogo';
const SOLO_VACIOS = !process.argv.includes('--todos');
const DRY_RUN    = process.argv.includes('--dry');

// ─── Mapeo tipo de pieza → texto descriptivo ──────────────────────────────────
const TIPOS = [
  { re: /^FILTRO DE COMB/i,        tipo: 'Filtro de combustible',       uso: 'en el sistema de alimentación de combustible' },
  { re: /^FILTRO DE ACEITE/i,      tipo: 'Filtro de aceite',            uso: 'en el sistema de lubricación del motor' },
  { re: /^FILTRO DE AIRE/i,        tipo: 'Filtro de aire',              uso: 'en el sistema de admisión del motor' },
  { re: /^FILTRO DE AGUA/i,        tipo: 'Filtro de agua',              uso: 'en el circuito de refrigeración' },
  { re: /^FILTRO HIDR/i,           tipo: 'Filtro hidráulico',           uso: 'en el sistema hidráulico' },
  { re: /^FILTRO SEPAR/i,          tipo: 'Filtro separador de agua',    uso: 'en el sistema de combustible' },
  { re: /^FILTRO/i,                tipo: 'Filtro',                      uso: 'en el sistema de mantenimiento del motor' },
  { re: /^RETEN/i,                 tipo: 'Retén de aceite',             uso: 'para evitar fugas en cigüeñal, ruedas o transmisión' },
  { re: /^SELLO/i,                 tipo: 'Sello de aceite',             uso: 'para prevención de fugas en motor y transmisión' },
  { re: /^RODAMIENTO/i,            tipo: 'Rodamiento',                  uso: 'en ruedas, compresor o transmisión' },
  { re: /^VALVULA/i,               tipo: 'Válvula',                     uso: 'en el sistema de frenos, motor o dirección' },
  { re: /^TURBO/i,                 tipo: 'Turbocompresor',              uso: 'para aumentar la potencia del motor' },
  { re: /^SERVO EMBRAGUE/i,        tipo: 'Servo de embrague',          uso: 'en el sistema de transmisión' },
  { re: /^SERVO/i,                 tipo: 'Servo',                       uso: 'en el sistema de dirección o transmisión' },
  { re: /^ENFRIADOR/i,             tipo: 'Enfriador de aceite',         uso: 'en el sistema de refrigeración del motor' },
  { re: /^REFRIGERADOR/i,          tipo: 'Refrigerador de aceite',      uso: 'en el sistema de refrigeración del motor' },
  { re: /^LAMPARA/i,               tipo: 'Lámpara',                     uso: 'en el sistema eléctrico de iluminación' },
  { re: /^OPTICA/i,                tipo: 'Óptica / faro',               uso: 'en el sistema de iluminación exterior' },
  { re: /^FARO/i,                  tipo: 'Faro',                        uso: 'en el sistema de iluminación del vehículo' },
  { re: /^TORNILLO/i,              tipo: 'Tornillo',                    uso: 'en el ensamble y fijación de componentes' },
  { re: /^JGO\.|^JUEGO/i,         tipo: 'Juego / kit',                 uso: 'para el mantenimiento o reparación' },
  { re: /^KIT/i,                   tipo: 'Kit de repuestos',            uso: 'para mantenimiento o reparación' },
  { re: /^SOPORTE/i,               tipo: 'Soporte',                     uso: 'para la fijación de componentes estructurales' },
  { re: /^ARANDELA/i,              tipo: 'Arandela',                    uso: 'en el ensamble de componentes mecánicos' },
  { re: /^TUERCA/i,                tipo: 'Tuerca',                      uso: 'en el ensamble y fijación de ruedas y componentes' },
  { re: /^CONO/i,                  tipo: 'Cono de maza',                uso: 'en el sistema de ruedas y ejes' },
  { re: /^ARO/i,                   tipo: 'Aro / junta',                 uso: 'en el sistema de sellado de motor o transmisión' },
  { re: /^JUNTA/i,                 tipo: 'Junta de sellado',            uso: 'en el sistema de sellado del motor' },
  { re: /^EMPAQUE/i,               tipo: 'Empaque de sellado',          uso: 'en el sistema de sellado del motor' },
  { re: /^BUJE/i,                  tipo: 'Buje',                        uso: 'en suspensión, dirección o transmisión' },
  { re: /^SUPLEMENTO/i,            tipo: 'Suplemento de rueda',         uso: 'para la regulación de holguras en ruedas' },
  { re: /^BOMBA DE AGUA/i,         tipo: 'Bomba de agua',               uso: 'en el sistema de refrigeración' },
  { re: /^BOMBA DE ACEITE/i,       tipo: 'Bomba de aceite',             uso: 'en el sistema de lubricación' },
  { re: /^BOMBA/i,                 tipo: 'Bomba',                       uso: 'en el sistema hidráulico o de refrigeración' },
  { re: /^CORREA/i,                tipo: 'Correa de transmisión',       uso: 'en el sistema de distribución del motor' },
  { re: /^TENSOR/i,                tipo: 'Tensor de correa',            uso: 'en el sistema de distribución del motor' },
  { re: /^TERMOSTATO/i,            tipo: 'Termostato',                  uso: 'en el sistema de refrigeración del motor' },
  { re: /^RADIADOR/i,              tipo: 'Radiador',                    uso: 'en el sistema de refrigeración del motor' },
  { re: /^PASTILLA/i,              tipo: 'Pastilla de freno',           uso: 'en el sistema de frenos' },
  { re: /^ZAPATA/i,                tipo: 'Zapata de freno',             uso: 'en el sistema de frenos traseros' },
  { re: /^TAMBOR/i,                tipo: 'Tambor de freno',             uso: 'en el sistema de frenos' },
  { re: /^DISCO/i,                 tipo: 'Disco de freno',              uso: 'en el sistema de frenos' },
  { re: /^MANGUERA/i,              tipo: 'Manguera',                    uso: 'en el sistema de refrigeración o dirección' },
  { re: /^CAÑO/i,                  tipo: 'Caño / tubo',                 uso: 'en el sistema de escape o refrigeración' },
  { re: /^AMORTIGUADOR/i,          tipo: 'Amortiguador',                uso: 'en el sistema de suspensión' },
  { re: /^RESORTE/i,               tipo: 'Resorte de suspensión',       uso: 'en el sistema de suspensión' },
  { re: /^ESPEJO/i,                tipo: 'Espejo retrovisor',           uso: 'en el sistema de visibilidad del conductor' },
  { re: /^TAPAS?\s+MOTOR/i,        tipo: 'Tapa de motor',               uso: 'como componente de la culata o motor' },
  { re: /^TAPA/i,                  tipo: 'Tapa',                        uso: 'como componente de cierre o sellado' },
  { re: /^SEGURO/i,                tipo: 'Seguro / clip',               uso: 'en el ensamble y fijación de componentes' },
  { re: /^COJINETE/i,              tipo: 'Cojinete',                    uso: 'en transmisión, motor o eje' },
  { re: /^CRUCETA/i,               tipo: 'Cruceta de cardan',           uso: 'en el eje de transmisión' },
  { re: /^CARDÁN|^CARDAN/i,        tipo: 'Cardan',                      uso: 'en el sistema de transmisión de potencia' },
];

// ─── Detección de marca desde el nombre ───────────────────────────────────────
const MARCAS_VEHICULO = [
  { re: /\bSCANIA\b/i,                   marca: 'Scania' },
  { re: /\bM\.?\s*BENZ\b|\bMERCEDES/i,   marca: 'Mercedes Benz' },
  { re: /\bVOLVO\b/i,                     marca: 'Volvo' },
  { re: /\bFORD\s*CARGO\b|\bFORD\b/i,    marca: 'Ford Cargo' },
  { re: /\bCUMMINS\b/i,                   marca: 'Cummins' },
  { re: /\bMAHLE\b/i,                     marca: 'Mahle' },
  { re: /\bKNORR\b/i,                     marca: 'Knorr' },
  { re: /\bWABCO\b/i,                     marca: 'Wabco' },
  { re: /\bSAV\b/i,                       marca: 'SAV' },
  { re: /\bMAN\b/i,                       marca: 'MAN' },
  { re: /\bIVECO\b/i,                     marca: 'Iveco' },
  { re: /\bDEUTZ\b/i,                     marca: 'Deutz' },
  { re: /\bCATERPILLAR|\bCAT\b/i,         marca: 'Caterpillar' },
];

function detectarMarca(nombre) {
  for (const m of MARCAS_VEHICULO) {
    if (m.re.test(nombre)) return m.marca;
  }
  return null;
}

function detectarTipo(nombre) {
  for (const t of TIPOS) {
    if (t.re.test(nombre)) return t;
  }
  return { tipo: 'Repuesto', uso: 'en camiones y maquinaria pesada' };
}

function generarDescripcion(producto) {
  const nombre = producto.nombre || '';
  const codigo = producto.codigo || '';
  const { tipo, uso } = detectarTipo(nombre);
  const marca = detectarMarca(nombre);

  const partesMarca = marca ? ` para ${marca}` : '';
  const partesNombre = nombre
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase());

  return `${tipo} (${partesNombre}) utilizado ${uso}${partesMarca}. ` +
    `Repuesto original o equivalente de alta calidad. ` +
    `Código: ${codigo}. ` +
    `Disponible en BGM Diesel, Rosario. ` +
    `Consultá stock y precio por WhatsApp.`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB conectado');

  const filtro = SOLO_VACIOS ? { descripcion: { $in: ['', null] } } : {};
  const productos = await Producto.find(filtro, 'codigo nombre marca descripcion').lean();

  console.log(`📦 Productos a procesar: ${productos.length}`);
  if (DRY_RUN) console.log('🔍 Modo DRY RUN — no se guarda nada\n');

  let actualizados = 0;
  const ejemplos = [];

  for (const p of productos) {
    const desc = generarDescripcion(p);

    if (DRY_RUN) {
      if (actualizados < 5) {
        console.log(`\n[${p.codigo}] ${p.nombre}`);
        console.log(`→ ${desc}`);
      }
    } else {
      await Producto.updateOne({ _id: p._id }, { $set: { descripcion: desc } });
    }

    actualizados++;
    if (actualizados % 500 === 0) {
      process.stdout.write(`   ${actualizados}/${productos.length}...\r`);
    }
  }

  console.log(`\n✅ Listo. Productos ${DRY_RUN ? 'procesados (dry)' : 'actualizados'}: ${actualizados}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
