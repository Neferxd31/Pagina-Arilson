# Guía de publicación en Cloudflare

Lista para marcar de principio a fin. Todo el código ya está listo: aquí solo se crean las cuentas, se copian claves y se publica.

**Antes de empezar, ten a mano:**

- El correo (o correos) que van a entrar al admin.
- Una tarjeta o PayPal para activar R2 (no cobra mientras no pases de 10 GB de fotos).
- El dominio que vas a usar, si ya lo decidiste (se puede conectar al final).

`npm run check:deploy` revisa la configuración en cualquier momento y te dice qué falta. `npm run deploy` lo corre solo y **no publica**
si encuentra un error.

---

## Fase 0: Contenido real

- [ ] Testimonios reales (nombre, ciudad y texto, con permiso del cliente) en `src/pages/nosotros.astro`, lista `testimonials`.
- [ ] Horario de atención en `src/pages/contacto.astro`.
- [ ] Textos legales: completar todo lo marcado como `[Pendiente]` o en lorem en `src/pages/privacidad.astro`,
      `src/pages/terminos.astro` y `src/pages/envios.astro`. Idealmente revisados por un abogado.
- [ ] Cuando los textos legales estén completos, quitar el aviso de borrador en `src/layouts/LegalLayout.astro`.
- [ ] Confirmar con Arilson la frase firmada con su nombre en Nosotros y el dato de "35 clientes fidelizados".

`npm run check:deploy` muestra como advertencia los archivos que todavía tienen texto de ejemplo.

## Fase 1: Cuenta, base de datos y fotos

1. [ ] Crear cuenta gratis en cloudflare.com e iniciar sesión desde la terminal del proyecto:
   ```bash
   npx wrangler login
   ```
2. [ ] En el panel: **R2 Object Storage** → *Purchase R2 Plan* (plan gratis, pide medio de pago).
3. [ ] Crear la base de datos y copiar el `database_id` que imprime en `wrangler.jsonc`, dentro de `d1_databases`:
   ```bash
   npx wrangler d1 create esencialescol
   ```
4. [ ] Crear el almacén de fotos:
   ```bash
   npx wrangler r2 bucket create esencialescol-media
   ```
5. [ ] Crear las tablas (aplica todas las migraciones de `migrations/`):
   ```bash
   npm run db:migrate:remote
   ```

## Fase 2: Login del admin (Cloudflare Access)

El admin tiene dos candados: Cloudflare pide un código al correo, y además la página revisa que ese correo esté en `ADMIN_EMAILS`.

1. [ ] Panel → **Zero Trust**. La primera vez pide elegir un nombre de equipo: tu dominio de equipo queda como
   `<equipo>.cloudflareaccess.com`.
2. [ ] Access → Applications → *Add an application* → **Self-hosted**:
   - Destinos: el host de la tienda (`esencialescol.<tu-usuario>.workers.dev` y luego el dominio propio) con las rutas `admin` y `api/admin`.
   - Política: *Allow* → *Emails* → el correo de Arilson (y el tuyo si administras).
   - Método de login: **One-time PIN** (código al correo).
   - Duración de la sesión: 24 horas o 1 semana.
3. [ ] Copiar en `vars` de `wrangler.jsonc`:
   - `ACCESS_TEAM_DOMAIN`: `<equipo>.cloudflareaccess.com`
   - `ACCESS_AUD`: el **Application Audience (AUD) Tag** de la aplicación.
   - `ADMIN_EMAILS`: los mismos correos de la política, separados por coma.

Para agregar o quitar un administrador: cambiarlo **en los dos lugares** (política de Access y `ADMIN_EMAILS`) y volver a publicar.
El botón "Cerrar sesión" del admin termina la sesión de Access.

## Fase 3: Anti-spam del carrito (Cloudflare Turnstile)

**Sin esta fase la tienda rechaza todos los pedidos**, a propósito, para que la protección nunca quede apagada.

1. [ ] Panel → **Turnstile** → *Add widget* → modo *Managed* → hostnames: el `workers.dev` de la tienda (y luego el dominio).
2. [ ] Copiar la **Site Key** en `TURNSTILE_SITE_KEY` de `wrangler.jsonc` (hoy tiene la clave de prueba).
3. [ ] Guardar la **Secret Key** como secreto (nunca en el código):
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

## Fase 4: Publicar y verificar

1. [ ] Revisar que no falte nada y publicar:
   ```bash
   npm run deploy
   ```
2. [ ] Verificar en la tienda publicada:
   - [ ] Inicio, productos, nosotros, contacto y las páginas legales abren bien.
   - [ ] `/admin` pide el código del correo. Con un correo que no está en la lista, el acceso se bloquea.
   - [ ] Crear una categoría y un producto con foto: aparece en la tienda de inmediato.
   - [ ] Pedido de prueba: la casilla de datos es obligatoria, el widget **no** dice "Solo para pruebas" y el mensaje llega a WhatsApp.
         Después cancelarlo en `/admin/pedidos`.
   - [ ] `/admin/actividad` muestra esos cambios con tu correo.
   - [ ] Al compartir el link de un producto en WhatsApp se ve la foto, el nombre y el precio.
   - [ ] `/robots.txt` y `/sitemap.xml` abren.
   - [ ] Caché: al pedir dos veces la misma página, la segunda debe responder `cf-cache-status: HIT`:
         ```bash
         curl -sI https://<tu-tienda>/ | grep -i cf-cache-status
         ```
         Si nunca dice HIT, la caché no está activa en la cuenta: la tienda funciona igual, solo hace más lecturas a la base de datos.

## Fase 5: Dominio propio

1. [ ] Comprar el dominio. Un `.com` se puede comprar directo en Cloudflare (*Domain Registration*). Si es `.com.co` u otro registrador,
   en Cloudflare: *Add a site* (plan Free) y cambiar los nameservers en el registrador.
2. [ ] Workers → `esencialescol` → Settings → *Domains & Routes* → *Add* → *Custom Domain*: el dominio y `www`.
3. [ ] Agregar el dominio a la aplicación de **Access** (rutas `admin` y `api/admin`) y a los hostnames de **Turnstile**.
4. [ ] Opcional: desactivar la dirección `workers.dev` para que solo funcione el dominio.
5. [ ] Opcional: regla gratis de *Rate limiting* (Security → WAF) para `/api/orders`, como capa extra contra spam.
6. [ ] Registrar la tienda en Google Search Console y enviar `https://<dominio>/sitemap.xml`.

## Fase 6: Quitar la vista previa de Netlify

1. [ ] Borrar `netlify.toml` y la carpeta `src/preview/`.
2. [ ] En `astro.config.mjs`: quitar `isNetlifyPreview`, el adaptador de Netlify y `previewVite` (dejar solo Cloudflare y la caché).
3. [ ] En `src/layouts/Layout.astro`: quitar `isPreview` y la franja "Vista previa de diseño".
4. [ ] Desinstalar el adaptador:
   ```bash
   npm uninstall @astrojs/netlify
   ```
5. [ ] Borrar el sitio en el panel de Netlify (irreversible).

---

## Mantenimiento

- **Respaldo semanal** de la base de datos. Queda en `backups/`, que nunca se sube a Git porque tiene datos de clientes;
  guárdalo fuera del computador:
  ```bash
  npm run db:backup
  ```
- **Volver atrás** hasta 7 días (plan gratis) con Time Travel de D1:
  ```bash
  npx wrangler d1 time-travel info esencialescol
  ```
- **Cambios en la base de datos:** crear `migrations/0004_...sql` (nunca editar una migración ya aplicada), probar con
  `npm run db:migrate:local`, y en producción aplicar **antes** de publicar: `npm run db:migrate:remote` y luego `npm run deploy`.
- **Volver a la versión anterior del código** si algo sale mal: `npx wrangler rollback`.
- **Límites del plan gratis:** si aparecen errores de límite (por ejemplo "1102" de procesador o lecturas de D1 agotadas), pasar al
  plan Workers Paid (USD 5 al mes).
