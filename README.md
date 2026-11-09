# EsencialesCol — tienda web

Catálogo con carrito que envía el pedido por WhatsApp, más panel de administración.
Todo corre en Cloudflare (plan gratis): Workers + D1 (base de datos) + R2 (fotos) + Access (login del admin).

## Flujo

- **Cliente:** catálogo → producto (color + cantidad, limitado al stock) → carrito → datos de entrega → "Pedir por WhatsApp".
  El pedido queda guardado como *pendiente* y se abre WhatsApp con el mensaje armado.
- **Páginas:** Inicio (destacados, categorías, nuevos y ofertas), Productos (búsqueda, filtros, orden y paginación), Nosotros
  (incluye testimonios) y Contacto.
- **Admin (`/admin`):** crear/editar productos (fotos, colores con stock propio, precio, oferta, textos de confianza, video),
  administrar categorías, elegir si el producto sale en "Destacados" o "Nuevos" del inicio (las ofertas salen solas
  cuando hay precio anterior), ver pedidos y confirmarlos. Incluye panel de resumen (pendientes, agotados, stock bajo),
  buscador de productos, registro de actividad (quién cambió qué) y limpieza de fotos sin usar.
- **Seguridad:** login con Cloudflare Access más lista de correos autorizados, verificación de origen en el admin, anti-spam
  Turnstile, máximo 5 pedidos por hora por conexión y autorización de datos personales (Ley 1581) en cada pedido. **El stock se descuenta al confirmar**, y se devuelve si un pedido confirmado se cancela.

## Desarrollo local

```bash
npm install
npm run db:migrate:local
npm run dev        # http://localhost:4321 (en local /admin no pide login)
npm test
```

## Publicar en Cloudflare

La guía completa, paso a paso y con lista para marcar, está en **[DEPLOY.md](DEPLOY.md)**: cuenta, base de datos, login del admin,
anti-spam, verificación, dominio y mantenimiento.

`npm run deploy` revisa primero la configuración y no publica si falta algo. Para revisarla sin publicar: `npm run check:deploy`.

En local (`npm run dev`) se usan las claves de prueba de Cloudflare Turnstile: el widget dice "Solo para pruebas" y siempre aprueba.

## Respaldos de la base de datos

D1 guarda el historial de los últimos 7 días (plan gratis) y permite volver a cualquier momento:

```bash
npx wrangler d1 time-travel info esencialescol
npx wrangler d1 time-travel restore esencialescol --timestamp=2026-10-10T12:00:00Z
```

Copia completa en `backups/` (recomendado una vez por semana; tiene datos de clientes, no se sube a Git):

```bash
npm run db:backup
```

## Vista previa temporal en Netlify

Solo para mostrar el diseño: usa productos de ejemplo en memoria (nada se guarda), el admin está cerrado y no hay fotos.
Netlify la compila sola con `netlify.toml` (`PREVIEW=netlify`). Para probarla en local:

```bash
PREVIEW=netlify npx astro dev --port 4500
```

Para quitarla cuando la tienda esté en Cloudflare: ver [DEPLOY.md](DEPLOY.md), fase 6.
