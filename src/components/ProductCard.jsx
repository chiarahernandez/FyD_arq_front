import { useState } from "react";
import Spinner from "./Spinner";

export default function ProductCard({ articulo, onPedir }) {
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);

  function handleCantidadChange(e) {
    const val = e.target.value;
    if (val === "") return setCantidad("");
    const n = Number(val);
    if (Number.isInteger(n) && n >= 1 && n <= 999) setCantidad(n);
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
      <div className="product-actions">
        <input
          className="qty-input"
          type="number"
          min="1"
          max="999"
          inputMode="numeric"
          aria-label={`Cantidad de ${articulo.nombre}`}
          value={cantidad}
          onChange={handleCantidadChange}
        />
        <button
          className="btn btn-primary btn-block"
          onClick={handlePedir}
          disabled={enviando || !Number.isInteger(cantidad) || cantidad < 1}
        >
          {enviando ? <Spinner /> : "Pedir"}
        </button>
      </div>
    </div>
  );
}
