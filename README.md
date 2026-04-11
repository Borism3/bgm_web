# BGM Diesel — Web + Catálogo

Aplicación web unificada: estética institucional + catálogo SSR desde MongoDB.

## Instalación

```bash
npm install
cp .env.example .env   # ajustá MONGO_URI si es necesario
```

## Importar productos desde Excel

```bash
node scripts/importar.js              # usa productos.xlsx por defecto
node scripts/importar.js /ruta/a/otro.xlsx
```

El script hace **upsert** por código: si el producto existe lo actualiza, si no lo crea.
Columnas que lee del Excel: `Código`, `Descripción`, `Cód.Arti.Prov.`, `Marca`, `Categoría`, `Detalle`.

## Desarrollo

```bash
npm run dev   # nodemon (hot reload)
```

## Producción

```bash
npm start     # node server.js
```

## Rutas

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | HTML estático | Página institucional |
| `/catalogo` | SSR | Listado paginado con búsqueda y filtro de marca |
| `/producto/:codigo` | SSR | Detalle de producto SEO-friendly |
| `/carrito` | SSR shell | Página de carrito (datos en localStorage) |
| `/api/productos` | JSON | Endpoint REST |
| `/api/productos/:codigo` | JSON | Producto individual |

## Imágenes de productos

Copiá las imágenes de productos a `/public/img/` con el nombre `{codigo}.webp`.
Si no existe imagen, se usa `/public/img/default.webp`.

## Estructura de carpetas

```
bgm-diesel-web/
├── server.js           ← servidor Express con SSR
├── .env                ← variables de entorno (no versionar)
├── models/
│   └── Producto.js     ← schema Mongoose
├── scripts/
│   └── importar.js     ← Excel → MongoDB
└── public/
    ├── index.html      ← inicio institucional
    ├── styles.css      ← CSS unificado (branding piloto)
    ├── carrito.js      ← lógica carrito cliente
    ├── carrito-page.js ← render de la página /carrito
    └── img/            ← logos, fotos, imágenes de productos
```

##generar descripciones con IA (No consume creditos) mas chotas
# Ver 5 ejemplos sin guardar
node scripts/generar-descripciones-plantilla.js --dry

# Generar y guardar (solo los que están vacíos)
npm run descripciones:plantilla

# Regenerar todos (sobreescribe existentes)
node scripts/generar-descripciones-plantilla.js --todos


##generar descripciones con la IA ( consume creditos)
##prueba
node scripts/generar-descripciones-ia.js --dry --limite 10
##prod
npm run descripciones:ia
