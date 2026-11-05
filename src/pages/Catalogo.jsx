import { useCallback, useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ProductCard from "../components/ProductCard";

const HISTORIAL_KEY = "uchfyd_pedidos_sesion";

function leerHistorial() {
  try {
    return JSON.parse(sessionStorage.getItem(HISTORIAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function guardarHistorial(lista) {
  try {
    sessionStorage.setItem(HISTORIAL_KEY, JSON.stringify(lista));
  } catch {
    /* noop */
  }
}

export default function Catalogo() {
  const { usuario } = useAuth();
  const toast = useToast();

  const [articulos, setArticulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [historial, setHistorial] = useState(leerHistorial);

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

  async function handlePedir(articulo, cantidad) {
    try {
      // usuarioId: el backend actual lo toma del body (ver nota de seguridad
      // en el README); se envía el "sub" del propio JWT del usuario logueado.
      const { data } = await client.post("/pedidos", {
        usuarioId: usuario?.sub,
        articuloId: articulo.id,
        cantidad,
      });

      toast.success(`Pedido confirmado: ${cantidad} × ${articulo.nombre}`);
      const nuevo = {
        pedidoId: data.pedidoId,
        nombre: articulo.nombre,
        cantidad,
        precio: articulo.precio,
        fecha: new Date().toISOString(),
      };
      setHistorial((h) => {
        const actualizado = [nuevo, ...h].slice(0, 10);
        guardarHistorial(actualizado);
        return actualizado;
      });
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

      {historial.length > 0 && (
        <section className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Tus pedidos de esta sesión</h2>
          {historial.map((p) => (
            <div className="pedido-row" key={p.pedidoId}>
              <span>
                #{p.pedidoId} — {p.cantidad} × {p.nombre}
              </span>
              <span className="badge">
                ${(p.precio * p.cantidad).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
