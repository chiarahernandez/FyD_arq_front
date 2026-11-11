import { useState } from "react";
import Spinner from "./Spinner";

export default function ProductCard({ articulo, onPedir }) {
  const hayLimiteStock = Number.isInteger(articulo.stock);
  const sinStock = hayLimiteStock && articulo.stock <= 0;
  const maxCantidad = hayLimiteStock ? Math.max(articulo.stock, 0) : 999;

  const [cantidad, setCantidad] = useState(sinStock ? "" : 1);
  const [enviando, setEnviando] = useState(false);

  function handleCantidadChange(e) {
    const val = e.target.value;
    if (val === "") return setCantidad("");
    const n = Number(val);
    if (Number.isInteger(n) && n >= 1 && n <= maxCantidad) setCantidad(n);
  }

  async function handlePedir() {
    const cantidadValida = Number.isInteger(cantidad) && cantidad >= 1;
    if (!cantidadValida) return;
    setEnviando(true);
    try {
      await onPedir(articulo, cantidad);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card product-card">
      <div className="product-card-top" aria-hidden="true">
        {articulo.nombre.charAt(0).toUpperCase()}
      </div>
      <div className="product-name">{articulo.nombre}</div>
      <div className="product-price">
        ${Number(articulo.precio).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
      </div>

      {/* El catálogo ahora devuelve stock (PB-11/PB-13): se muestra y se usa
          para no dejar pedir más de lo disponible desde la propia UI. */}
      {hayLimiteStock && (
        <div
          className={sinStock ? "field-error" : "navbar-user"}
          style={{ margin: 0, fontSize: "0.82rem" }}
        >
          {sinStock ? "Sin stock" : `Stock disponible: ${articulo.stock}`}
        </div>
      )}

      <div className="product-actions">
        <input
          className="qty-input"
          type="number"
          min="1"
          max={maxCantidad}
          inputMode="numeric"
          aria-label={`Cantidad de ${articulo.nombre}`}
          value={cantidad}
          onChange={handleCantidadChange}
          disabled={sinStock}
        />
        <button
          className="btn btn-primary btn-block"
          onClick={handlePedir}
          disabled={sinStock || enviando || !Number.isInteger(cantidad) || cantidad < 1}
        >
          {enviando ? <Spinner /> : sinStock ? "Sin stock" : "Pedir"}
        </button>
      </div>
    </div>
  );
}
