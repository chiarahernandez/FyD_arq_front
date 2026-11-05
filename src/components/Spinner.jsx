export default function Spinner({ dark = false }) {
  return <span className={`spinner ${dark ? "spinner-dark" : ""}`} role="status" aria-label="Cargando" />;
}
