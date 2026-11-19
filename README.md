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
  cuando hay precio anterior), ver pedidos y confirmarlos. **El stock se descuenta al confirmar**, y se devuelve si un pedido confirmado se cancela.

## Desarrollo local

```bash
npm install
npm run db:migrate:local
npm run dev        # http://localhost:4321 (en local /admin no pide login)
npm test
```

## Publicar en Cloudflare (una sola vez)

1. Crear cuenta gratis en Cloudflare e iniciar sesión desde la terminal: `npx wrangler login`
2. Activar R2 en el dashboard (R2 Object Storage). Cloudflare pide un medio de pago aunque el uso esté dentro del plan gratis (10 GB).
3. Crear la base de datos y el bucket:
   ```bash
   npx wrangler d1 create esencialescol
   npx wrangler r2 bucket create esencialescol-media
   ```
   Copiar el `database_id` que imprime el primer comando dentro de `wrangler.jsonc` (en `d1_databases`).
4. Crear las tablas y publicar:
   ```bash
   npm run db:migrate:remote
   npm run deploy
   ```
   La tienda queda en `https://esencialescol.<tu-subdominio>.workers.dev`. `/admin` responde 403 hasta completar el paso 5.
5. Proteger el admin con Cloudflare Access (Zero Trust, gratis hasta 50 usuarios):
   - Zero Trust → Access → Applications → *Add an application* → **Self-hosted**.
   - Destinos: el host `esencialescol.<tu-subdominio>.workers.dev` con las rutas `admin` y `api/admin`.
   - Política: *Allow* → *Emails* → el correo del administrador. Login por código al correo (One-time PIN).
   - Copiar el **Application Audience (AUD) Tag** y el team domain (`<equipo>.cloudflareaccess.com`) en `vars` de `wrangler.jsonc`
     (`ACCESS_AUD` y `ACCESS_TEAM_DOMAIN`) y volver a ejecutar `npm run deploy`.

   El servidor verifica además la firma del token de Access, así que si la aplicación de Access se borra por error, `/admin` queda cerrado (no abierto).
6. Activar el anti-spam del carrito (Cloudflare Turnstile, gratis). **Sin este paso la tienda rechaza todos los pedidos.**
   - Dashboard → Turnstile → *Add widget* → hostname de la tienda → modo *Managed*.
   - Copiar la **Site Key** en `vars` de `wrangler.jsonc` (`TURNSTILE_SITE_KEY`, hoy tiene la clave de prueba de Cloudflare).
   - Guardar la **Secret Key** como secreto (nunca en el código) y volver a publicar:
     ```bash
     npx wrangler secret put TURNSTILE_SECRET_KEY
     npm run deploy
     ```

En local (`npm run dev`) se usan las claves de prueba de Cloudflare: el widget dice "Solo para pruebas" y siempre aprueba.

Cuando haya dominio propio: agregarlo en Workers → *Domains & Routes*, y añadir ese host a la aplicación de Access y al widget de Turnstile.

## Respaldos de la base de datos

D1 guarda el historial de los últimos 7 días (plan gratis) y permite volver a cualquier momento:

```bash
npx wrangler d1 time-travel info esencialescol
npx wrangler d1 time-travel restore esencialescol --timestamp=2026-10-10T12:00:00Z
```

Copia completa en un archivo (recomendado una vez por semana, guardarla fuera del computador):

```bash
npx wrangler d1 export esencialescol --remote --output=respaldo.sql
```

## Catálogo en Netlify con Supabase

Netlify usa `PREVIEW=netlify` y lee el catálogo de Supabase con `VITE_SUPABASE_URL` y
`VITE_SUPABASE_PUBLISHABLE_KEY`. Carga [la migración SQL](supabase/migrations/20261119000000_catalog.sql)
en el Editor SQL del proyecto para crear la tabla con los 63 productos. La migración permite las lecturas públicas
de productos publicados. Edita los datos desde el editor de tablas de Supabase.

La aplicación conserva la copia del catálogo incluida en el repositorio para arranques locales y fallos temporales
de Supabase. Las fotos se sirven desde `public/catalogo/`. El carrito prepara una cotización por WhatsApp sin
recopilar datos de entrega. Confirma el precio y el inventario por ese canal. El panel de Cloudflare corresponde
al despliegue con D1.

Para probar en PowerShell:

```powershell
$env:PREVIEW = 'netlify'
npm.cmd run dev -- --port 4500
```
