import { useCallback, useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ProductCard from "../components/ProductCard";
import Spinner from "../components/Spinner";

const HISTORIAL_KEY_PREFIJO = "uchfyd_pedidos_sesion";
const PEDIDOS_POR_PAGINA = 15;

// El historial local se guarda por usuario (sub del JWT): sessionStorage es
// compartido por pestaña, así que si dos cuentas distintas inician sesión en
// la misma pestaña (logout + login de otro usuario) no deben ver el
// historial de pedidos de la cuenta anterior.
function leerHistorial(clave) {
  try {
    return JSON.parse(sessionStorage.getItem(clave) || "[]");
  } catch {
    return [];
  }
}

function guardarHistorial(clave, lista) {
  try {
    sessionStorage.setItem(clave, JSON.stringify(lista));
  } catch {
    /* noop */
  }
}

function formatearFecha(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleString("es-AR");
}

export default function Catalogo() {
  const toast = useToast();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "admin";

  const historialKey = usuario?.sub
    ? `${HISTORIAL_KEY_PREFIJO}_${usuario.sub}`
    : HISTORIAL_KEY_PREFIJO;

  const [articulos, setArticulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [historial, setHistorial] = useState(() => leerHistorial(historialKey));

  // Si cambia el usuario logueado en esta misma pestaña, recargamos el
  // historial correspondiente a esa cuenta (y no el de la anterior).
  useEffect(() => {
    setHistorial(leerHistorial(historialKey));
  }, [historialKey]);

  // --- Pestaña activa del box de pedidos: los admin arrancan viendo
  // "todos", el resto de los clientes solo tiene la pestaña "sesion" ---
  const [tabPedidos, setTabPedidos] = useState(esAdmin ? "todos" : "sesion");

  // --- Todos los pedidos (solo admin) ---
  const [todosPedidos, setTodosPedidos] = useState([]);
  const [todosCargando, setTodosCargando] = useState(false);
  const [todosError, setTodosError] = useState("");
  const [pagina, setPagina] = useState(1);

  const cargarCatalogo = useCallback(async () => {
    setCargando(true);
    setErrorCarga("");
    try {
      const { data } = await client.get("/catalogo/articulos");
      setArticulos(data);
    } catch (err) {
      setErrorCarga(
        err.response?.status === 401
          ? "Tu sesión expiró. Volvé a iniciar sesión."
          : "No pudimos cargar el catálogo. Reintentá en unos segundos."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  const cargarTodosPedidos = useCallback(async () => {
    setTodosCargando(true);
    setTodosError("");
    try {
      const { data } = await client.get("/pedidos");
      setTodosPedidos(data);
      setPagina(1);
    } catch (err) {
      setTodosError(
        err.response?.status === 401
          ? "Tu sesión expiró. Volvé a iniciar sesión."
          : "No se pudo cargar el listado de pedidos."
      );
    } finally {
      setTodosCargando(false);
    }
  }, []);

  useEffect(() => {
    if (esAdmin && tabPedidos === "todos") {
      cargarTodosPedidos();
    }
  }, [esAdmin, tabPedidos, cargarTodosPedidos]);

  async function handlePedir(articulo, cantidad) {
    try {
      // El backend ya no necesita el usuarioId en el body: lo toma del JWT
      // (el Gateway lo propaga como header hacia Pedidos — ver Fase 1.10
      // de la guía de cierre de gaps).
      const { data } = await client.post("/pedidos", {
        articuloId: articulo.id,
        cantidad,
      });

      toast.success(`Pedido confirmado: ${cantidad} × ${articulo.nombre}`);
      const nuevo = {
        pedidoId: data.pedidoId,
        nombre: articulo.nombre,
        cantidad,
        // se usan los valores que devuelve el backend (precio histórico e
        // importe total ya calculados) en vez de recalcularlos en el cliente
        precioUnitario: data.precioUnitario ?? articulo.precio,
        importeTotal: data.importeTotal ?? articulo.precio * cantidad,
        fecha: new Date().toISOString(),
      };
      setHistorial((h) => {
        const actualizado = [nuevo, ...h].slice(0, 10);
        guardarHistorial(historialKey, actualizado);
        return actualizado;
      });
      cargarCatalogo(); // refresca el stock mostrado tras la reserva
      if (esAdmin && tabPedidos === "todos") {
        cargarTodosPedidos(); // refleja el pedido recién hecho en el listado global
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        toast.error(`Sin stock suficiente de "${articulo.nombre}".`);
      } else if (status === 503) {
        toast.error("El sistema está temporalmente ocupado. Probá de nuevo en unos segundos.");
      } else if (status === 401) {
        toast.error("Tu sesión expiró. Volvé a iniciar sesión.");
      } else {
        toast.error("No pudimos registrar el pedido. Intentá nuevamente.");
      }
      throw err; // para que ProductCard no limpie su estado de "cantidad" si algo falló feo
    }
  }

  const claveFecha = todosPedidos.length > 0
    ? Object.keys(todosPedidos[0]).find((k) => /fecha|creado|created/i.test(k))
    : null;

  const totalPaginas = Math.max(1, Math.ceil(todosPedidos.length / PEDIDOS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const pedidosPagina = todosPedidos.slice(
    (paginaSegura - 1) * PEDIDOS_POR_PAGINA,
    paginaSegura * PEDIDOS_POR_PAGINA
  );

  const mostrarBoxPedidos = esAdmin || historial.length > 0;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Catálogo</h1>
        <button className="btn btn-ghost" onClick={cargarCatalogo} disabled={cargando}>
          Actualizar
        </button>
      </div>

      {errorCarga && <div className="alert alert-error">{errorCarga}</div>}

      {cargando ? (
        <div className="grid-productos">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card product-card">
              <div className="skeleton" style={{ height: 90 }} />
              <div className="skeleton" style={{ height: 16, width: "70%" }} />
              <div className="skeleton" style={{ height: 20, width: "40%" }} />
            </div>
          ))}
        </div>
      ) : articulos.length === 0 ? (
        <div className="empty-state">Todavía no hay artículos cargados en el catálogo.</div>
      ) : (
        <div className="grid-productos">
          {articulos.map((a) => (
            <ProductCard key={a.id} articulo={a} onPedir={handlePedir} />
          ))}
        </div>
      )}

      {mostrarBoxPedidos && (
        <section className="card" style={{ marginBottom: "2rem" }}>
          {esAdmin ? (
            <div className="tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tabPedidos === "todos"}
                className={`tab-btn ${tabPedidos === "todos" ? "tab-btn-activo" : ""}`}
                onClick={() => setTabPedidos("todos")}
              >
                Todos los pedidos
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tabPedidos === "sesion"}
                className={`tab-btn ${tabPedidos === "sesion" ? "tab-btn-activo" : ""}`}
                onClick={() => setTabPedidos("sesion")}
              >
                Tus pedidos
              </button>
            </div>
          ) : (
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Tus pedidos de esta sesión</h2>
          )}

          {tabPedidos === "sesion" || !esAdmin ? (
            historial.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "var(--color-texto-suave)" }}>
                Todavía no hiciste ningún pedido en esta sesión.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Artículo</th>
                      <th>Cantidad</th>
                      <th>Precio unitario</th>
                      <th>Total</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((p) => (
                      <tr key={p.pedidoId}>
                        <td>{p.pedidoId}</td>
                        <td>{p.nombre}</td>
                        <td>{p.cantidad}</td>
                        <td>${Number(p.precioUnitario).toFixed(2)}</td>
                        <td>${Number(p.importeTotal).toFixed(2)}</td>
                        <td>{formatearFecha(p.fecha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <>
              {todosError && <div className="alert alert-error">{todosError}</div>}
              {todosCargando ? (
                <Spinner />
              ) : todosPedidos.length === 0 ? (
                <p style={{ fontSize: "0.9rem", color: "var(--color-texto-suave)" }}>Todavía no hay pedidos.</p>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Cliente</th>
                          <th>Artículo</th>
                          <th>Cantidad</th>
                          <th>Precio unitario</th>
                          <th>Total</th>
                          {claveFecha && <th>Fecha</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {pedidosPagina.map((p) => (
                          <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>
                              {p.nombre_cliente || (
                                <span
                                  style={{ color: "var(--color-texto-suave)" }}
                                  title="Pedido anterior a este cambio: no se guardó el nombre"
                                >
                                  {p.usuario_id}
                                </span>
                              )}
                            </td>
                            <td>{p.articulo_id}</td>
                            <td>{p.cantidad}</td>
                            <td>${Number(p.precio_historico).toFixed(2)}</td>
                            <td>${Number(p.importe_total).toFixed(2)}</td>
                            {claveFecha && <td>{formatearFecha(p[claveFecha])}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPaginas > 1 && (
                    <div className="paginado">
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={paginaSegura <= 1}
                        onClick={() => setPagina((p) => p - 1)}
                      >
                        ← Anterior
                      </button>
                      <span>
                        Página {paginaSegura} de {totalPaginas} ({todosPedidos.length} pedidos)
                      </span>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={paginaSegura >= totalPaginas}
                        onClick={() => setPagina((p) => p + 1)}
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
