import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import logo from "../assets/logo.png";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export default function Registro() {
  const { registrar } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errors, setErrors] = useState({});
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [registrado, setRegistrado] = useState(false);
  const [idRegistrado, setIdRegistrado] = useState("");

  function validar() {
    const e = {};
    if (!nombre.trim()) e.nombre = "Ingresá tu nombre.";
    if (!EMAIL_RE.test(email)) e.email = "Ingresá un email válido.";
    if (password.length < MIN_PASSWORD) e.password = `Mínimo ${MIN_PASSWORD} caracteres.`;
    if (confirmar !== password) e.confirmar = "Las contraseñas no coinciden.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setErrorGeneral("");
    if (!validar()) return;

    setCargando(true);
    try {
      const data = await registrar(email, password, nombre.trim());
      // La cuenta queda inactiva hasta que un administrador la active
      // (PB-02/PB-03/PB-04): ya no iniciamos sesión automáticamente acá,
      // porque el login la va a rechazar con 403 hasta ese momento.
      setIdRegistrado(data?.id ?? "");
      setRegistrado(true);
    } catch (err) {
      if (err.response?.status === 409) {
        setErrorGeneral("Ese email ya está registrado.");
      } else if (err.response?.status === 400) {
        setErrorGeneral("Revisá los datos ingresados.");
      } else if (err.code === "ECONNABORTED" || !err.response) {
        setErrorGeneral("No se pudo conectar con el servidor. Probá de nuevo en unos segundos.");
      } else {
        setErrorGeneral("Ocurrió un error inesperado. Intentá nuevamente.");
      }
    } finally {
      setCargando(false);
    }
  }

  if (registrado) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <img src={logo} alt="FYD" className="auth-logo" />
          <div className="card">
            <h1 className="auth-title">Cuenta creada</h1>
            <div className="alert alert-ok">
              Tu cuenta quedó registrada y pendiente de activación. Un
              administrador tiene que habilitarla antes de que puedas iniciar
              sesión.
            </div>
            {idRegistrado && (
              <p style={{ fontSize: "0.85rem", color: "var(--color-texto-suave)", marginBottom: "1.1rem" }}>
                Pasale este ID a un administrador para que active tu cuenta:
                <br />
                <code style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-texto)", userSelect: "all" }}>
                  {idRegistrado}
                </code>
              </p>
            )}
            <button className="btn btn-primary btn-block" onClick={() => navigate("/login")}>
              Ir a iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <img src={logo} alt="FYD" className="auth-logo" />
        <div className="card">
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">Registrate para empezar a pedir.</p>

        {errorGeneral && <div className="alert alert-error">{errorGeneral}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              type="text"
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              aria-invalid={Boolean(errors.nombre)}
            />
            {errors.nombre && <span className="field-error">{errors.nombre}</span>}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="field">
            <label htmlFor="confirmar">Confirmar contraseña</label>
            <input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              aria-invalid={Boolean(errors.confirmar)}
            />
            {errors.confirmar && <span className="field-error">{errors.confirmar}</span>}
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={cargando}>
            {cargando ? <Spinner /> : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
