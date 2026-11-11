import { useState } from "react";
import client from "../api/client";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/Spinner";

function useFormState(initial) {
  const [valores, setValores] = useState(initial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  return { valores, setValores, cargando, setCargando, error, setError };
}

function mensajeError(err, fallback) {
  if (err.response?.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
  if (err.response?.status === 404) return "No se encontró ese recurso.";
  if (err.code === "ECONNABORTED" || !err.response) return "No se pudo conectar con el servidor.";
  return err.response?.data?.error || fallback;
}

export default function Admin() {
  const toast = useToast();

  // --- PB-05: alta de artículos ---
  const alta = useFormState({ nombre: "", precio: "", stock: "" });

  async function handleAltaArticulo(ev) {
    ev.preventDefault();
    alta.setError("");
    const precio = Number(alta.valores.precio);
    const stock = Number(alta.valores.stock);
    if (!alta.valores.nombre.trim()) return alta.setError("El nombre es obligatorio.");
    if (!Number.isFinite(precio) || precio <= 0) return alta.setError("El precio debe ser mayor a 0.");
    if (!Number.isInteger(stock) || stock < 0) {
      return alta.setError("El stock debe ser un número entero mayor o igual a 0.");
    }

    alta.setCargando(true);
    try {
      await client.post("/catalogo/articulos", { nombre: alta.valores.nombre.trim(), precio, stock });
      toast.success(`Artículo "${alta.valores.nombre}" creado.`);
      alta.setValores({ nombre: "", precio: "", stock: "" });
    } catch (err) {
      alta.setError(mensajeError(err, "No se pudo crear el artículo."));
    } finally {
      alta.setCargando(false);
    }
  }

  // --- Contrato TP3: PATCH /catalogo/articulos/{id}/precio ---
  const precioForm = useFormState({ articuloId: "", precio: "" });

  async function handleActualizarPrecio(ev) {
    ev.preventDefault();
    precioForm.setError("");
    const precio = Number(precioForm.valores.precio);
    if (!precioForm.valores.articuloId.trim()) return precioForm.setError("Ingresá el ID del artículo.");
    if (!Number.isFinite(precio) || precio <= 0) return precioForm.setError("El precio debe ser mayor a 0.");

    precioForm.setCargando(true);
    try {
      await client.patch(`/catalogo/articulos/${precioForm.valores.articuloId.trim()}/precio`, { precio });
      toast.success("Precio actualizado.");
      precioForm.setValores({ articuloId: "", precio: "" });
    } catch (err) {
      precioForm.setError(mensajeError(err, "No se pudo actualizar el precio."));
    } finally {
      precioForm.setCargando(false);
    }
  }

  // --- PB-04: activación de usuarios ---
  const activacion = useFormState({ usuarioId: "" });

  async function handleActivarUsuario(ev) {
    ev.preventDefault();
    activacion.setError("");
    if (!activacion.valores.usuarioId.trim()) return activacion.setError("Ingresá el ID del usuario.");

    activacion.setCargando(true);
    try {
      await client.patch(`/auth/usuarios/${activacion.valores.usuarioId.trim()}/activar`);
      toast.success("Usuario activado.");
      activacion.setValores({ usuarioId: "" });
    } catch (err) {
      activacion.setError(mensajeError(err, "No se pudo activar el usuario."));
    } finally {
      activacion.setCargando(false);
    }
  }

  // --- Fase 1.11: cambiar el rol de un usuario ---
  const rolForm = useFormState({ usuarioId: "", rol: "admin" });

  async function handleCambiarRol(ev) {
    ev.preventDefault();
    rolForm.setError("");
    if (!rolForm.valores.usuarioId.trim()) return rolForm.setError("Ingresá el ID del usuario.");

    rolForm.setCargando(true);
    try {
      await client.patch(`/auth/usuarios/${rolForm.valores.usuarioId.trim()}/rol`, {
        rol: rolForm.valores.rol,
      });
      toast.success("Rol actualizado.");
      rolForm.setValores({ usuarioId: "", rol: "admin" });
    } catch (err) {
      rolForm.setError(mensajeError(err, "No se pudo actualizar el rol."));
    } finally {
      rolForm.setCargando(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Panel de administración</h1>
      </div>

      <div className="admin-grid">
        <section className="card">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Dar de alta un artículo</h2>
          {alta.error && <div className="alert alert-error">{alta.error}</div>}
          <form onSubmit={handleAltaArticulo} noValidate>
            <div className="field">
              <label htmlFor="alta-nombre">Nombre</label>
              <input
                id="alta-nombre"
                value={alta.valores.nombre}
                onChange={(e) => alta.setValores((v) => ({ ...v, nombre: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="alta-precio">Precio</label>
              <input
                id="alta-precio"
                type="number"
                min="0"
                step="0.01"
                value={alta.valores.precio}
                onChange={(e) => alta.setValores((v) => ({ ...v, precio: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="alta-stock">Stock inicial</label>
              <input
                id="alta-stock"
                type="number"
                min="0"
                step="1"
                value={alta.valores.stock}
                onChange={(e) => alta.setValores((v) => ({ ...v, stock: e.target.value }))}
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={alta.cargando}>
              {alta.cargando ? <Spinner /> : "Crear artículo"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Actualizar precio</h2>
          {precioForm.error && <div className="alert alert-error">{precioForm.error}</div>}
          <form onSubmit={handleActualizarPrecio} noValidate>
            <div className="field">
              <label htmlFor="precio-id">ID del artículo</label>
              <input
                id="precio-id"
                value={precioForm.valores.articuloId}
                onChange={(e) => precioForm.setValores((v) => ({ ...v, articuloId: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="precio-nuevo">Precio nuevo</label>
              <input
                id="precio-nuevo"
                type="number"
                min="0"
                step="0.01"
                value={precioForm.valores.precio}
                onChange={(e) => precioForm.setValores((v) => ({ ...v, precio: e.target.value }))}
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={precioForm.cargando}>
              {precioForm.cargando ? <Spinner /> : "Actualizar precio"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Activar usuario</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-texto-suave)", marginTop: 0 }}>
            Pedile al usuario el ID que recibió al registrarse (lo devuelve la
            API en la respuesta del registro).
          </p>
          {activacion.error && <div className="alert alert-error">{activacion.error}</div>}
          <form onSubmit={handleActivarUsuario} noValidate>
            <div className="field">
              <label htmlFor="activar-id">ID del usuario</label>
              <input
                id="activar-id"
                value={activacion.valores.usuarioId}
                onChange={(e) => activacion.setValores((v) => ({ ...v, usuarioId: e.target.value }))}
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={activacion.cargando}>
              {activacion.cargando ? <Spinner /> : "Activar cuenta"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Cambiar rol de usuario</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-texto-suave)", marginTop: 0 }}>
            Promové a otro usuario a administrador, o devolvelo a cliente.
          </p>
          {rolForm.error && <div className="alert alert-error">{rolForm.error}</div>}
          <form onSubmit={handleCambiarRol} noValidate>
            <div className="field">
              <label htmlFor="rol-id">ID del usuario</label>
              <input
                id="rol-id"
                value={rolForm.valores.usuarioId}
                onChange={(e) => rolForm.setValores((v) => ({ ...v, usuarioId: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="rol-select">Nuevo rol</label>
              <select
                id="rol-select"
                value={rolForm.valores.rol}
                onChange={(e) => rolForm.setValores((v) => ({ ...v, rol: e.target.value }))}
              >
                <option value="admin">admin</option>
                <option value="cliente">cliente</option>
              </select>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={rolForm.cargando}>
              {rolForm.cargando ? <Spinner /> : "Cambiar rol"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
