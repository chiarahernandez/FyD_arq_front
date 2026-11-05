import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

export default function Navbar() {
  const { isAuthenticated, usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="FYD" className="navbar-logo" />
        </Link>
        {isAuthenticated && (
          <nav className="navbar-actions">
            <span className="navbar-user">{usuario?.email}</span>
            <button className="navbar-logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
