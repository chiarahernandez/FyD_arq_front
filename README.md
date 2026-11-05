# UCH-FyD — Web App (frontend)

SPA responsive (React + Vite) para el sistema UCH-FyD, construida contra los endpoints reales del Gateway (`auth`, `catalogo`, `pedidos`). Sigue el patrón **SPA / Thin Client con Bundling & Polyfilling** definido en el TP2: Vite arma un bundle único optimizado y el `target: "es2015"` asegura compatibilidad con navegadores más viejos.

## ⚠️ Paso obligatorio antes de usarla: habilitar CORS en el Gateway

El navegador bloquea por política de mismo origen cualquier request desde esta web app (en `localhost:5173` o el dominio que sea) hacia el Gateway (`localhost:3000`), a menos que el Gateway declare explícitamente qué orígenes puede aceptar. Esto no es un patrón de la arquitectura ni cambia ninguna lógica de negocio — es un requisito de infraestructura para que cualquier cliente basado en navegador pueda hablarle a la API.

En `uch-fyd/gateway/package.json`, agregar la dependencia:

```json
"cors": "^2.8.5"
```

Y en `uch-fyd/gateway/src/index.js`, al principio del archivo:

```js
const cors = require("cors");
// ...
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

(Agregarlo antes de las rutas `/auth`, `/pedidos`, `/catalogo`.) Reconstruir el contenedor del gateway después (`docker compose up --build gateway`).

## Cómo correrla en desarrollo

```bash
npm install
cp .env.example .env   # y ajustar VITE_API_BASE_URL si hace falta
npm run dev
```

Abre en `http://localhost:5173`. Necesita el resto del sistema (`docker compose up` desde `uch-fyd/`) corriendo en paralelo.

## Cómo buildearla / correrla con Docker

```bash
docker build -t uch-fyd-web --build-arg VITE_API_BASE_URL=http://localhost:3000 .
docker run -p 8080:8080 uch-fyd-web
```

O agregarla como un servicio más al `docker-compose.yml` del equipo:

```yaml
  web:
    build:
      context: ../frontend
      args:
        VITE_API_BASE_URL: http://localhost:3000
    ports: ["8080:8080"]
```

## Qué endpoints consume

| Acción | Endpoint | Protegido |
|---|---|---|
| Registro | `POST /auth/registro` | No |
| Login | `POST /auth/login` | No |
| Listar catálogo | `GET /catalogo/articulos` | Sí (JWT) |
| Crear pedido | `POST /pedidos` | Sí (JWT) |

## Decisiones de seguridad

- **Token en memoria + `sessionStorage`**, nunca en `localStorage`: se limpia solo al cerrar la pestaña, acotando la ventana de exposición si hubiera un XSS. La mitigación ideal (cookie `HttpOnly` seteada por el Gateway) requeriría cambiar el contrato de `/auth/login` para que devuelva `Set-Cookie` en vez de un JSON con el token — quedó fuera de alcance porque implica tocar el backend, pero es la mejora recomendada si el tiempo lo permite.
- **Validación de inputs en el cliente** (formato de email, longitud mínima de contraseña, cantidad entera positiva) como primera barrera, sabiendo que la validación real y vinculante es la del backend — el frontend nunca reemplaza esa responsabilidad.
- **Expiración de sesión activa**: el JWT se decodifica (sin verificar firma, eso lo hace el Gateway) solo para leer `exp` y disparar un logout automático apenas vence, en vez de esperar a que una request falle con 401.
- **Manejo centralizado de 401**: cualquier respuesta 401 limpia el token y fuerza un login nuevo, vía un interceptor de axios + evento global, así ninguna pantalla queda en un estado inconsistente con sesión vencida.
- **Reintento acotado solo ante 503** (pool de hilos saturado): un único reintento con backoff corto, nunca reintentos automáticos sobre errores que podrían generar un pedido duplicado.
- **CSP y cabeceras de seguridad** en `nginx.conf` para el build de producción (`X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy` restrictiva a `'self'`).
- **Sin `dangerouslySetInnerHTML`** en ningún componente — React escapa todo el contenido dinámico por defecto, evitando XSS por inyección de HTML desde datos del catálogo.

## Limitación conocida (a nivel de contrato de API, no del frontend)

El servicio `pedidos` toma `usuarioId` del **body** de la request, no lo deriva del JWT ya validado por el Gateway. Esto significa que, en teoría, un cliente podría enviar un `usuarioId` distinto al propio. El frontend ya hace lo correcto de su lado (usa el `sub` del token del usuario logueado, nunca un valor libre), pero el cierre real de este gap requiere un cambio en el backend: que el Gateway reenvíe la identidad verificada en un header (ej. `X-Usuario-Id`) y que `pedidos` la use en vez de confiar en el body. Vale la pena mencionarlo en la defensa como una mejora de robustez identificada.

También: no existe un endpoint `GET /pedidos` para listar el historial real de un usuario, así que el panel "Tus pedidos de esta sesión" es **solo local** (vive en `sessionStorage` del navegador) y se pierde si cambian de dispositivo o cierran la pestaña. Está etiquetado como tal en la UI a propósito, para no insinuar que es un historial persistente del lado del servidor.

## Estructura

```
frontend/
├── src/
│   ├── api/client.js        → instancia de axios, manejo de token, reintentos
│   ├── context/              → AuthContext, ToastContext
│   ├── components/           → Navbar, ProtectedRoute, ProductCard, Spinner
│   └── pages/                → Login, Registro, Catalogo
├── nginx.conf                → cabeceras de seguridad + SPA fallback
├── Dockerfile                → build multi-stage (node → nginx)
└── .env.example
```
