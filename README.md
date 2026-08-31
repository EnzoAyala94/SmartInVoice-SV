# Sistema de Facturacion Electronica (DTE) - El Salvador

Sistema completo para emitir Documentos Tributarios Electronicos (Factura y CCF),
transmitirlos al Ministerio de Hacienda (simulado por defecto), generar el PDF
del comprobante y reportes en Excel.

## Estructura del proyecto

```
dte-sistema/
├── backend/     Node.js + Express + SQLite (API REST)
└── frontend/    React + Vite (interfaz web)
```

## Requisitos

- Node.js 18 o superior
- npm

## 1. Instalacion del backend

```bash
cd backend
npm install
cp .env.example .env
npm run init-db      # crea la base de datos y el usuario admin
npm run dev           # o: npm start
```

El backend queda corriendo en `http://localhost:4000`.

**Usuario por defecto:**
- Email: `admin@miempresa.com`
- Password: `Admin123!`

### Configurar los datos de tu empresa

Edita `backend/.env` con tus datos fiscales reales:

```
EMISOR_NIT=...
EMISOR_NRC=...
EMISOR_NOMBRE=...
EMISOR_COD_ACTIVIDAD=...
...
```

Estos son los catalogos oficiales del MH que necesitas para llenar correctamente
`EMISOR_DEPARTAMENTO`, `EMISOR_MUNICIPIO` y `EMISOR_COD_ACTIVIDAD`:
https://www.mh.gob.sv/ (seccion DTE / Factura Electronica)

## 2. Instalacion del frontend

```bash
cd frontend
npm install
npm run dev
```

Se abre en `http://localhost:5173` y ya esta conectado al backend (proxy configurado
en `vite.config.js`).

## 3. Modo de transmision al Ministerio de Hacienda

Por defecto el sistema corre en **modo simulacion** (`MH_MODO=simulacion` en `.env`),
lo que te permite probar todo el flujo (emitir, firmar, transmitir, recibir sello)
sin necesidad de credenciales reales del MH.

### Pasar a modo real (produccion)

Para transmitir documentos reales necesitas:

1. **Certificado digital** emitido/autorizado por el MH para tu NIT.
2. El **Servicio de Firma Electronica (SVFE)**: un componente Java que Hacienda
   distribuye, que corre localmente y firma el JSON del DTE con tu certificado.
   Debes instalarlo y correrlo aparte (normalmente en `http://localhost:8113`).
3. Credenciales de la **API de Hacienda** (usuario/password asociados a tu NIT)
   para autenticarte en `https://apitest.dtes.mh.gob.sv` (ambiente de pruebas) o
   `https://api.dtes.mh.gob.sv` (produccion).

Pasos en el codigo:

1. En `backend/.env`, cambia `MH_MODO=real` y llena `MH_USER`, `MH_PASSWORD`,
   y las URLs correspondientes (test o produccion).
2. En `backend/src/services/firmaService.js`, descomenta y ajusta el bloque de
   llamada real al servicio de firmador (ya esta dejado como referencia comentada).
3. Antes de emitir documentos reales, valida el JSON de cada tipo de DTE contra
   los esquemas oficiales publicados por el MH (Factura, CCF, Nota de Credito,
   Nota de Debito, etc.), ya que cada uno tiene campos especificos que este
   sistema base no cubre al 100% (por ejemplo, retenciones, documentos
   relacionados, exportaciones).

**Importante:** el ambiente de pruebas del MH (`ambiente: "00"`) es obligatorio
usarlo primero para validar que tus documentos son aceptados antes de pasar a
produccion (`ambiente: "01"`).

## 4. Flujo de uso

1. Inicia sesion.
2. (Opcional) Registra tus productos/servicios en el catalogo.
3. (Opcional) Registra clientes frecuentes, o deja que la factura sea a
   Consumidor Final generico.
4. Ve a **Emitir DTE**, elige tipo de documento, agrega los items, revisa los
   totales calculados automaticamente (IVA 13%) y presiona "Emitir y transmitir".
5. El sistema genera el JSON, lo "firma" (simulado o real), lo transmite al MH
   y guarda el resultado. Puedes descargar el PDF del comprobante al instante.
6. En **Historial** puedes filtrar por fecha/estado, anular documentos, y
   descargar el libro de ventas en Excel.

## 5. Roles de usuario

- `admin`: acceso total, puede emitir/anular DTEs, y gestionar usuarios internos.
- `facturador`: puede emitir y anular DTEs.
- `contador`: puede emitir, anular DTEs y ver reportes (mismo alcance que facturador).

### Crear un usuario contador (o facturador, o otro admin)

1. Inicia sesion como `admin@miempresa.com`.
2. En el menu lateral, entra a **Usuarios** (solo visible para el admin).
3. Clic en "+ Nuevo usuario", llena nombre, correo, contrasena y elige el rol.
4. Comparte esas credenciales con la persona correspondiente; ya puede iniciar sesion
   normalmente en `http://localhost:5173`.

### Restablecer la contrasena de un usuario

Si un usuario (contador, facturador, etc.) olvida su contrasena, no hay forma
de "recuperarla" (se guarda encriptada), pero el admin puede **restablecerla**:

1. Ve a **Usuarios**.
2. Clic en **"Restablecer contrasena"** en la fila de ese usuario.
3. Escribe la nueva contrasena (minimo 6 caracteres) y compartela con esa persona.

### Envio automatico de correo con credenciales

Cuando habilitas el portal de un cliente, el sistema le envia automaticamente
un correo con su usuario y contrasena de acceso.

**Por defecto viene en `MAIL_MODO=simulacion`**: no envia correos reales, solo
imprime el contenido del correo en la consola donde corre `npm start`, para que
puedas probar el flujo sin necesidad de credenciales de correo todavia.

Para que envie correos de verdad:

1. En `backend/.env`, cambia `MAIL_MODO=real`.
2. Configura estas variables con los datos de tu proveedor de correo:
   ```
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_SECURE=false
   MAIL_USER=tu-correo@gmail.com
   MAIL_PASSWORD=tu-contrasena-de-aplicacion
   MAIL_FROM=Facturacion Electronica <tu-correo@gmail.com>
   PORTAL_URL=http://localhost:5173/portal/login
   ```

**Si usas Gmail:** no puedes usar tu contrasena normal de Gmail directamente
(Google lo bloquea por seguridad). Necesitas generar una "Contrasena de
aplicacion":
1. Activa la verificacion en dos pasos en tu cuenta de Google
   (myaccount.google.com/security).
2. Ve a myaccount.google.com/apppasswords y genera una contrasena para
   "Correo" / "Otra app".
3. Usa esa contrasena de 16 caracteres en `MAIL_PASSWORD` (no tu contrasena real).

**Si prefieres otro proveedor** (Outlook, Zoho, un SMTP de tu hosting, etc.),
solo cambia `MAIL_HOST` y `MAIL_PORT` segun la documentacion de ese proveedor.

Cuando pongas el sistema en internet (ver seccion 9), actualiza tambien
`PORTAL_URL` con la URL real de tu frontend en produccion, para que el enlace
del correo funcione correctamente.

## 6. Notas de Credito y Notas de Debito

Ademas de Factura y CCF, ahora puedes emitir:
- **Nota de Credito (05):** para devoluciones, descuentos posteriores o correcciones que reducen el monto de una factura ya emitida.
- **Nota de Debito (06):** para cargos adicionales sobre un documento ya emitido (ej. intereses, cargos olvidados).

Estas **siempre requieren un documento relacionado** (la factura o CCF original):

1. En **Emitir DTE**, elige "Nota de Credito" o "Nota de Debito".
2. Selecciona el **cliente** (debe ser el mismo del documento original).
3. Aparecera un selector con los documentos de ese cliente — elige cual estas corrigiendo.
4. Escribe el **motivo** (ej. "Devolucion de mercaderia").
5. Agrega los items con el monto a acreditar/cargar, y emite normalmente.

El PDF, Excel y XML de estas notas incluyen automaticamente la referencia al documento original.

**Limitacion importante:** por ahora, el Panel general y los reportes **no restan automaticamente** las Notas de Credito del total de ventas (ni suman las de Debito) — cada documento se contabiliza por su propio monto. Si necesitas que el dashboard refleje el neto real (ventas menos notas de credito), avisame y lo agregamos.

## 7. Portal del Cliente

Cada cliente puede tener su propio acceso, separado del de tu equipo interno, para:

- Ver sus facturas del mes actual y de meses anteriores.
- Consultar el estado de cada una (procesado, anulado, rechazado, etc.).
- Ver una grafica de lo que ha pagado mensualmente (ultimos 12 meses).
- Descargar un Excel con las facturas del mes que este consultando.
- Descargar el **PDF y el Excel** de cualquiera de sus facturas.
- Actualizar su propio correo, telefono y **direccion fiscal** (en "Mi perfil").
- Cambiar su propia contrasena (en "Mi perfil"), sin depender de ti.
- **Reportar un problema** con una factura (boton "Reportar" junto a cada documento) — esto crea una solicitud que tu equipo ve y responde.
- **Solicitar que se le emita una factura nueva** (pantalla "Mis solicitudes") — util cuando el cliente quiere pedir un comprobante sin tener que llamarte.

### Gestionar las solicitudes de tus clientes (tu lado)

En el panel interno, entra a **Solicitudes** en el menu lateral. Ahi ves todas las
peticiones de tus clientes (correcciones reportadas o facturas solicitadas),
filtrables por estado. Al hacer clic en "Responder", puedes:
- Marcarla como **Atendida** (con una respuesta opcional para el cliente)
- **Rechazarla** (con el motivo)

Si la solicitud es una correccion y decides que el cliente tiene razon, hay un
boton de acceso directo a **"Emitir Nota"** que te lleva a Emitir DTE — desde
ahi eliges Nota de Credito/Debito y seleccionas el documento relacionado
manualmente.

## 8. Portal del Cliente (siguientes secciones)

### Habilitar el portal para un cliente

1. Como admin, ve a **Clientes**.
2. Asegurate de que el cliente tenga un correo registrado (edita el cliente si falta).
3. Clic en **"Habilitar portal"** en la fila de ese cliente.
4. Te pedira una contrasena (minimo 6 caracteres) — creala y compartela con tu cliente
   junto con este enlace: `http://localhost:5173/portal/login`.
5. El cliente inicia sesion ahi con su correo y esa contrasena, totalmente separado
   de tu panel interno (no puede ver otros clientes ni emitir facturas).

Puedes desactivar el acceso en cualquier momento con el mismo boton ("Desactivar portal").

### Editar los datos de un cliente

En la pantalla **Clientes**, cada fila tiene un boton **"Editar"** que abre el
mismo formulario con los datos actuales precargados. Ahi puedes actualizar
correo, telefono, direccion, NRC, o cualquier otro dato — util quando un
cliente cambia su numero o correo, o cuando necesitas completar su correo
para poder habilitarle el portal.

## 9. Reporte de IVA, Incidencias y Pagos en linea

### Reporte de IVA

En el panel interno, entra a **Reporte IVA**. Elige el mes, y veras el
resumen listo para tu declaracion mensual: Ventas Gravadas, Exentas, No
Sujetas, Debito Fiscal (IVA 13%), y el total de operaciones. Las Notas de
Credito ya estan restadas automaticamente y las de Debito sumadas. Puedes
descargar el mismo resumen en Excel.

### Incidencias

En **Incidencias**, ves de un vistazo cuantos documentos estan Rechazados,
Pendientes o en Contingencia (los que necesitan tu atencion), con acceso
directo al PDF y al historial completo para resolverlos.

### Pagos en linea (Stripe)

El cliente puede pagar sus facturas con tarjeta directamente desde su portal,
con el boton **"Pagar ahora"**.

**Por defecto viene en `PAGOS_MODO=simulacion`**: al hacer clic en "Pagar
ahora", la factura se marca como pagada al instante (sin cobrar nada real),
para que puedas probar el flujo completo sin necesidad de una cuenta de
Stripe todavia.

### Activar cobros reales con Stripe

1. Crea una cuenta en https://dashboard.stripe.com/register (gratis).
2. Una vez dentro, ve a **Developers → API keys** y copia tu
   **Secret key** (empieza con `sk_test_...` en modo de pruebas, o
   `sk_live_...` en modo real).
3. En `backend/.env`, configura:
   ```
   PAGOS_MODO=real
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   ```
4. Reinicia el backend.

Con `sk_test_...` puedes probar pagos reales de prueba usando la tarjeta
`4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC — Stripe no
cobra nada real con esas llaves. Cuando quieras cobrar de verdad, cambia a
tus llaves `sk_live_...` (esas si procesan tarjetas reales de tus clientes).

**Nota:** Stripe cobra una comision por transaccion (usualmente ~2.9% + $0.30
por cobro en USD) — revisa las tarifas actuales en stripe.com/pricing antes
de activar el modo real.

## 10. Actualizar una instalacion que ya tenias corriendo

Si ya habias instalado el backend antes de estas dos funciones nuevas (rol
contador y Portal del Cliente), no necesitas borrar tu base de datos. Solo corre:

```bash
cd backend
npm install        # instala recharts en el frontend tambien, ver abajo
npm run migrate    # agrega las columnas nuevas sin borrar tus datos
npm start
```

Y en el frontend:
```bash
cd frontend
npm install         # instala recharts, usado por la grafica del portal
npm run dev
```

## 11. Poner el sistema en internet (servidor gratuito)

**Recomendacion:** usa **Render** para el backend y **Vercel** para el frontend.
Ambos tienen capa gratuita, se conectan directo a GitHub, y son sencillos de
configurar sin tarjeta de credito para el nivel gratuito.

**Advertencia importante sobre la base de datos:** en el plan gratuito de Render,
el disco es "efimero": tus datos (facturas, clientes) sobreviven mientras el
servidor este corriendo, pero **se borran cada vez que vuelves a desplegar** el
codigo. Como estos son documentos fiscales que no deberias perder, apenas
tengas uso real te recomiendo agregar un "Persistent Disk" en Render (cuesta
un par de dolares al mes) para que la base de datos nunca se borre. Mientras
solo estes probando, el plan gratuito esta bien.

### Paso 1 — Sube tu proyecto a GitHub

1. Crea una cuenta en https://github.com si no tienes.
2. Crea un repositorio nuevo (privado si prefieres), por ejemplo `dte-sistema`.
3. En tu carpeta `dte-sistema`, abre una terminal y corre:
   ```
   git init
   git add .
   git commit -m "Primera version"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/dte-sistema.git
   git push -u origin main
   ```
   (Si no tienes `git` instalado, descargalo de https://git-scm.com/download/win)

   Nota: el archivo `.gitignore` que trae el proyecto ya excluye `node_modules`,
   `.env` y la base de datos, para que no subas datos sensibles ni archivos pesados.

### Paso 2 — Backend en Render

1. Entra a https://render.com y crea una cuenta (puedes usar tu GitHub).
2. Clic en **New +** → **Web Service**.
3. Conecta tu repositorio `dte-sistema`.
4. Configura:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run init-db`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. En la seccion **Environment Variables**, agrega las mismas que tienes en tu
   `backend/.env` (NIT, NRC, nombre de empresa, etc.), mas estas dos:
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = (la pondremos en el Paso 4, por ahora deja un valor
     provisional como `http://localhost:5173`, lo actualizas despues)
6. Clic en **Create Web Service**. Cuando termine, Render te da una URL como:
   `https://dte-sistema-backend.onrender.com`

### Paso 3 — Frontend en Vercel

1. Entra a https://vercel.com y crea una cuenta (puedes usar tu GitHub).
2. Clic en **Add New** → **Project**, selecciona tu repositorio `dte-sistema`.
3. Configura:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (deberia detectarlo solo)
4. En **Environment Variables**, agrega:
   - `VITE_API_URL` = `https://dte-sistema-backend.onrender.com/api`
     (usa la URL real que te dio Render en el paso anterior)
5. Clic en **Deploy**. Cuando termine, Vercel te da una URL como:
   `https://dte-sistema.vercel.app`

### Paso 4 — Conectar ambos (CORS)

1. Regresa a Render → tu servicio de backend → **Environment**.
2. Edita la variable `FRONTEND_URL` y ponle la URL real que te dio Vercel:
   `https://dte-sistema.vercel.app`
3. Guarda — Render va a reiniciar el backend automaticamente.

### Paso 5 — Prueba

Abre la URL de Vercel en el navegador y deberias ver la pantalla de login,
ya conectada a tu backend en Render. Inicia sesion con
`admin@miempresa.com` / `Admin123!` para confirmar que todo funciona.

### Cada vez que hagas cambios en el codigo

Solo necesitas volver a subirlos a GitHub:
```
git add .
git commit -m "Descripcion del cambio"
git push
```
Render y Vercel detectan el cambio automaticamente y vuelven a desplegar.
**Recuerda:** en Render (plan gratuito), cada uno de estos despliegues borra
la base de datos si no tienes el disco persistente activado.

## 12. App de Android (.apk)

Tu proyecto ya incluye la configuracion base para generar una app de Android
real, usando Capacitor (envuelve tu app web ya construida en un contenedor
nativo). La carpeta `frontend/android/` ya viene lista, solo falta compilarla.

### Requisito previo: backend desplegado en internet

Como quieres usar la app desde cualquier lugar (no solo en tu WiFi), tu
backend **debe estar desplegado en internet primero** (ver la seccion 10,
"Poner el sistema en internet"). Necesitas la URL final, algo como:
```
https://smartfactura-backend.onrender.com
```

### Paso 1 — Configura la URL de tu backend

Edita `frontend/.env.production` y reemplaza la URL de ejemplo por la real
de tu backend:
```
VITE_API_URL=https://TU-BACKEND-REAL.onrender.com/api
```

Tambien, en Render, actualiza la variable `FRONTEND_URL` de tu backend para
que incluya el origen que usa la app movil (ademas de tu web si ya tienes una):
```
FRONTEND_URL=https://tu-web.vercel.app,http://localhost
```

### Paso 2 — Reconstruye con la nueva configuracion

```bash
cd frontend
npm install
npm run build
npx cap sync android
```

### Paso 3 — Instala Android Studio

Descarga e instala Android Studio (gratis) desde:
```
https://developer.android.com/studio
```
La primera vez que lo abras, te va a pedir descargar el SDK de Android —
dejalo, tarda unos minutos.

### Paso 4 — Abre el proyecto y compila

1. Abre Android Studio → **Open** → selecciona la carpeta `frontend/android`.
2. Espera a que termine de sincronizar (la primera vez puede tardar varios
   minutos, esta descargando dependencias).
3. Ve al menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. Cuando termine, un aviso abajo a la derecha dice "locate" — haz clic ahi
   para encontrar tu archivo `.apk`, normalmente en:
   ```
   frontend/android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Paso 5 — Instala el .apk en tu telefono

1. Copia ese archivo `.apk` a tu telefono (por USB, WhatsApp a ti mismo,
   Google Drive, etc.)
2. Abrelo desde el telefono. Android te va a advertir que es de un
   "origen desconocido" (normal, porque no viene de Google Play) — dale
   permiso para instalar de todas formas.
3. Listo, ya tienes el icono de SmartFactura en tu telefono.

### Notas importantes

- Este `.apk` es una version de **prueba (debug)**. Sirve perfectamente
  para uso personal/interno, pero si algun dia quieres publicarla en
  Google Play, necesitas generar una version "release" firmada — Android
  Studio tiene un asistente para eso en el mismo menu Build.
- Cada vez que hagas cambios al codigo del frontend, repite el Paso 2
  (`npm run build && npx cap sync android`) y luego vuelve a compilar el
  APK en Android Studio.
- El icono y la pantalla de bienvenida (splash) ya vienen personalizados
  con la marca de SmartFactura.

## 13. Limitaciones conocidas de esta version base

- La conversion de "monto a letras" en el resumen del DTE es una aproximacion;
  para produccion se recomienda una libreria especializada en numeros-a-letras
  en espanol.
- El formato oficial de intercambio con el MH es el JSON firmado (JWT), no XML.
  El boton de "XML" genera una representacion adicional del mismo documento,
  util si necesitas importarlo a un sistema contable que solo acepte XML; no
  reemplaza al JSON que realmente se transmite al Ministerio de Hacienda.
- Solo se implementaron dos tipos de documento (Factura y CCF). Notas de
  Credito/Debito, Comprobante de Retencion, Factura de Exportacion, etc.
  requieren estructuras JSON adicionales segun el esquema del MH.
- No se incluye el modulo de contingencia (emision offline cuando el MH no
  responde) mas alla de marcar el estado; la logica de reenvio posterior
  se deberia agregar para un entorno de produccion real.
- El Portal del Cliente usa su propia cookie de sesion (`token_cliente`),
  separada de la del equipo interno, por lo que puedes tener ambas pestanas
  abiertas al mismo tiempo sin que se mezclen las sesiones.
#   S m a r t V o i c e - S V  
 #   S m a r t V o i c e - S V  
 