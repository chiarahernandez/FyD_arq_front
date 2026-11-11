import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/Spinner";
import logo from "../assets/logo.png";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");

  function validar() {
    const e = {};
    if (!EMAIL_RE.test(email)) e.email = "Ingresá un email válido.";
    if (!password) e.password = "La contraseña es obligatoria.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setErrorGeneral("");
    if (!validar()) return;

    setCargando(true);
    try {
      await login(email, password);
      const destino = location.state?.from?.pathname || "/";
      navigate(destino, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setErrorGeneral("Email o contraseña incorrectos.");
      } else if (err.response?.status === 403) {
        setErrorGeneral("Tu cuenta todavía no fue activada. Esperá a que un administrador la habilite.");
      } else if (err.code === "ECONNABORTED" || !err.response) {
        setErrorGeneral("No se pudo conectar con el servidor. Probá de nuevo en unos segundos.");
      } else {
        setErrorGeneral("Ocurrió un error inesperado. Intentá nuevamente.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <img src={logo} alt="FYD" className="auth-logo" />
        <div className="card">
        <h1 className="auth-title">Iniciar sesión</h1>
        <p className="auth-subtitle">Accedé con tu cuenta de UCH-FyD.</p>

        {errorGeneral && <div className="alert alert-error">{errorGeneral}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && <span className="field-error" id="email-error">{errors.email}</span>}
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password && <span className="field-error" id="password-error">{errors.password}</span>}
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={cargando}>
            {cargando ? <Spinner /> : "Ingresar"}
          </button>
        </form>

        <p className="auth-switch">
          ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
