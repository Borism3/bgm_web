const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  codigo:           { type: String, required: true, unique: true, trim: true },
  codigo_proveedor: { type: String, trim: true, default: '' },
  nombre:           { type: String, required: true, trim: true },
  marca:            { type: String, trim: true, default: '' },
  categoria:        { type: String, trim: true, default: '' },
  descripcion:      { type: String, trim: true, default: '' },
  imagen:           { type: String, default: '' },
}, {
  timestamps: true
});

// Índice de texto completo con pesos — nombre tiene más relevancia que código
productoSchema.index(
  { nombre: 'text', codigo: 'text', codigo_proveedor: 'text' },
  { weights: { nombre: 10, codigo: 5, codigo_proveedor: 1 }, name: 'idx_busqueda' }
);

// Índice simple en marca para filtros rápidos
productoSchema.index({ marca: 1 });


module.exports = mongoose.model('Producto', productoSchema);
