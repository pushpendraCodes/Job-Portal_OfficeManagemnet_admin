import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { hydrate } from "../store/authSlice";

export function AuthGate() {
  const dispatch = useAppDispatch();
  const { user, hydrated, accessToken } = useAppSelector((s) => s.auth);
  const location = useLocation();

  useEffect(() => {
    dispatch(hydrate());
  }, [dispatch]);

  if (!hydrated) return <div className="auth-wrap">Loading…</div>;
  if (!user || !accessToken || user.accountType !== "admin") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
