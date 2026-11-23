import { useCallback, useEffect, useRef, useState } from "react";
import client from "../api/client";

// Estado de registro en blockchain de un pedido (GET /blockchain/pedidos/:id).
// Mientras el registro está en curso (la tx tarda ~15-60 s en Sepolia) consulta
// de nuevo cada pocos segundos, con un tope para no quedar consultando para siempre.
const INTERVALO_MS = 5000;
const MAX_CONSULTAS = 36; // ~3 minutos

const EN_CURSO = new Set(["pendiente", "enviado"]);

// `reciente`: el pedido se acaba de crear en esta sesión. Solo en ese caso un
// "no_registrado" se toma como "todavía no llegó a la cola" y se sigue consultando;
// en un pedido viejo, "no_registrado" es definitivo.
export default function BlockchainBadge({ pedidoId, esAdmin = false, reciente = false }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const consultas = useRef(0);

  const consultar = useCallback(async () => {
    try {
      const { data } = await client.get(`/blockchain/pedidos/${pedidoId}`);
      setInfo(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [pedidoId]);

  useEffect(() => {
    consultas.current = 0;
    consultar();
  }, [consultar]);

  const esperandoCola = reciente && info?.estado === "no_registrado";
  const seguirConsultando =
    !error && (info === null || EN_CURSO.has(info.estado) || esperandoCola);

  useEffect(() => {
    if (!seguirConsultando || consultas.current >= MAX_CONSULTAS) return undefined;
    const t = setTimeout(() => {
      consultas.current += 1;
      consultar();
    }, INTERVALO_MS);
    return () => clearTimeout(t);
  }, [seguirConsultando, info, consultar]);

  async function reintentar() {
    setReintentando(true);
    try {
      await client.post(`/blockchain/pedidos/${pedidoId}/reintentar`);
      consultas.current = 0;
      setInfo((i) => (i ? { ...i, estado: "pendiente" } : i));
    } catch {
      setError(true);
    } finally {
      setReintentando(false);
    }
  }

  if (error) {
    return (
      <span className="bc-badge bc-gris" title="No se pudo consultar el servicio blockchain">
        No disponible
      </span>
    );
  }

  if (!info) return <span className="bc-badge bc-gris">…</span>;

  if (info.registradoEnBlockchain) {
    const link = info.etherscanTxUrl || info.contrato?.etherscanUrl;
    const fecha = info.fechaRegistro ? new Date(info.fechaRegistro).toLocaleString("es-AR") : "";
    if (info.coincide) {
      return (
        <a
          className="bc-badge bc-ok"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          title={`Registrado en Sepolia el ${fecha}. Ver la transacción en Etherscan.`}
        >
          ✓ Registrado en blockchain
        </a>
      );
    }
    return (
      <a
        className="bc-badge bc-error"
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        title="Los datos actuales del pedido NO coinciden con el hash registrado en la blockchain: el pedido fue modificado después de crearse."
      >
        ⚠ Alterado
      </a>
    );
  }

  if (EN_CURSO.has(info.estado) || (esperandoCola && consultas.current < MAX_CONSULTAS)) {
    return (
      <span className="bc-badge bc-pendiente" title="Esperando confirmación de la transacción">
        ⏳ Registrando…
      </span>
    );
  }

  const etiqueta = info.estado === "fallido" ? "Falló el registro" : "Sin registro";
  return (
    <span className="bc-acciones">
      <span className="bc-badge bc-gris" title={info.error || "El pedido no está registrado en blockchain"}>
        {etiqueta}
      </span>
      {esAdmin && (
        <button type="button" className="bc-reintentar" onClick={reintentar} disabled={reintentando}>
          {reintentando ? "…" : "Registrar"}
        </button>
      )}
    </span>
  );
}
