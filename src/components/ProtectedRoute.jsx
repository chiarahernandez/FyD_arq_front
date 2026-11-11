import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, usuario } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (adminOnly && usuario?.rol !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}
