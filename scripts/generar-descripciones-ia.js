/**
 * scripts/generar-descripciones-ia.js
 *
 * Genera descripciones únicas y de calidad usando la API de Claude (Haiku).
 * Costo estimado: ~$0.50 USD por 4.000 productos.
 *
 * Requisitos:
 *   npm install @anthropic-ai/sdk
 *   Crear archivo .env con: ANTHROPIC_API_KEY=sk-ant-...
 *
 * Uso:
 *   node scripts/generar-descripciones-ia.js              ← solo sin descripción
 *   node scripts/generar-descripciones-ia.js --todos      ← sobreescribe todos
 *   node scripts/generar-descripciones-ia.js --dry        ← muestra sin guardar
 *   node scripts/generar-descripciones-ia.js --limite 50  ← procesa solo N productos
 */

require('dotenv').config();
const mongoose  = require('mongoose');
const Producto  = require('../models/Producto');
const Anthropic = require('@anthropic-ai/sdk');

const MONGO_URI   = process.env.MONGO_URI       || 'mongodb://127.0.0.1:27017/catalogo';
const API_KEY     = process.env.ANTHROPIC_API_KEY;
const SOLO_VACIOS = !process.argv.includes('--todos');
const DRY_RUN     = process.argv.includes('--dry');
const LIMITE_ARG  = process.argv.indexOf('--limite');
const LIMITE      = LIMITE_ARG !== -1 ? parseInt(process.argv[LIMITE_ARG + 1], 10) : null;

// Tamaño del lote enviado en cada llamada a la API
const BATCH_SIZE  = 15;
// Pausa entre lotes para no superar rate limits (ms)
const PAUSA_MS    = 1000;

if (!API_KEY) {
  console.error('❌ Falta ANTHROPIC_API_KEY en el archivo .env');
  process.exit(1);
}

const client = new Anthropic({ apiKey: API_KEY });

// ─── Prompt del sistema ───────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sos un redactor especializado en repuestos para camiones de carga pesada en Argentina.
Tu tarea es escribir descripciones cortas, claras y útiles para el SEO de un catálogo online.

Reglas:
- Máximo 2 oraciones (entre 30 y 60 palabras)
- Mencionar el tipo de pieza y su función
- Si el nombre incluye marca de vehículo (Scania, Mercedes Benz, Volvo, Cummins, Ford Cargo, etc.), mencionarla
- Usar lenguaje técnico pero accesible
- Terminar siempre con: "Disponible en BGM Diesel, Rosario."
- No inventar modelos ni especificaciones que no estén en el nombre
- Nunca usar las palabras "original", "genuino", "equivalente" ni "aplicable"
- Responder SOLO con las descripciones, una por línea, en el mismo orden que los productos
- No numerar ni agregar prefijos`;

// ─── Función para procesar un lote ───────────────────────────────────────────
async function procesarLote(productos) {
  const lista = productos
    .map((p, i) => `${i + 1}. [${p.codigo}] ${p.nombre}`)
    .join('\n');

  const respuesta = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system:     SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: `Generá una descripción para cada uno de estos repuestos:\n\n${lista}`,
    }],
  });

  const texto = respuesta.content[0]?.text || '';
  const lineas = texto
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 10);  // filtrar líneas vacías

  return lineas;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB conectado');

  const filtro = SOLO_VACIOS ? { descripcion: { $in: ['', null] } } : {};
  let query = Producto.find(filtro, 'codigo nombre descripcion').lean();
  if (LIMITE) query = query.limit(LIMITE);
  const productos = await query;

  console.log(`📦 Productos a procesar: ${productos.length}`);
  if (DRY_RUN) console.log('🔍 Modo DRY RUN — no se guarda nada\n');

  let procesados  = 0;
  let actualizados = 0;
  let errores     = 0;

  for (let i = 0; i < productos.length; i += BATCH_SIZE) {
    const lote = productos.slice(i, i + BATCH_SIZE);

    try {
      const descripciones = await procesarLote(lote);

      for (let j = 0; j < lote.length; j++) {
        const p    = lote[j];
        const desc = descripciones[j];

        if (!desc) {
          console.warn(`⚠️  Sin descripción para [${p.codigo}]`);
          errores++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`\n[${p.codigo}] ${p.nombre}`);
          console.log(`→ ${desc}`);
        } else {
          await Producto.updateOne({ _id: p._id }, { $set: { descripcion: desc } });
          actualizados++;
        }
        procesados++;
      }

      const pct = Math.round(procesados / productos.length * 100);
      process.stdout.write(`   Progreso: ${procesados}/${productos.length} (${pct}%)\r`);

      // Pausa entre lotes
      if (i + BATCH_SIZE < productos.length) {
        await new Promise(r => setTimeout(r, PAUSA_MS));
      }

    } catch (err) {
      console.error(`\n❌ Error en lote ${i}–${i + BATCH_SIZE}:`, err.message);
      errores += lote.length;
      // Pausa más larga si hay error (rate limit)
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`\n\n✅ Listo.`);
  console.log(`   Procesados:   ${procesados}`);
  if (!DRY_RUN) console.log(`   Actualizados: ${actualizados}`);
  console.log(`   Errores:      ${errores}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
