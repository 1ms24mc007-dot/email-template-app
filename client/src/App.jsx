import { useEffect, useState } from "react";
import {
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { api } from "./api";
import { ToastProvider, Spinner } from "./components/ui";
import { Setup, Login, Forgot, Reset } from "./pages/AuthPages";
import Dashboard from "./pages/Dashboard";
import { TemplateList, TemplateView, TemplateForm } from "./pages/Templates";
import Compose from "./pages/Compose";
import GlobalPlaceholders from "./pages/GlobalPlaceholders";


function Layout({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = (user.fullName || 'Admin')
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app">

      {/* Sidebar */}
      <aside
        className={open ? 'side open' : 'side'}
        onClick={() => setOpen(false)}
      >
        <div className="brand">Mailroom</div>

        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/templates">Email templates</NavLink>
          <NavLink to="/compose">Compose & send</NavLink>
          <NavLink to="/global">Global placeholders</NavLink>
        </nav>
      </aside>

      {/* Main application */}
      <div className="main">

        <header>
          <button
            className="menu"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            Menu
          </button>

          {/* Profile dropdown */}
          <div className="profile-container">

            <button
              className="profile-trigger"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <span className="profile-avatar">
                {initials}
              </span>

              <span className="profile-name">
                {user.fullName}
              </span>

              <span className="profile-chevron">
                {profileOpen ? '▲' : '▼'}
              </span>
            </button>

            {profileOpen && (
              <>
                <div
                  className="profile-backdrop"
                  onClick={() => setProfileOpen(false)}
                />

                <div className="profile-dropdown">

                  <div className="profile-dropdown-heading">
                    <span className="profile-avatar profile-avatar-large">
                      {initials}
                    </span>

                    <div>
                      <strong>{user.fullName}</strong>
                      <span>Administrator</span>
                    </div>
                  </div>

                  <div className="profile-divider" />

                  <div className="profile-details">
                    <span className="profile-detail-label">
                      Full name
                    </span>
                    <strong>{user.fullName}</strong>

                    <span className="profile-detail-label">
                      Email address
                    </span>
                    <strong>{user.email}</strong>
                  </div>

                  <div className="profile-divider" />

                  <button
                    className="profile-logout"
                    onClick={onLogout}
                  >
                    <span>↪</span>
                    Sign out
                  </button>

                </div>
              </>
            )}

          </div>
        </header>

        <main>
  <Outlet />
</main>

<footer className="app-footer">
  <div className="footer-brand">
    <span className="footer-logo">M</span>
    <strong>Mailroom</strong>
  </div>

  <div className="footer-description">
    Email Template Management & Sending Platform
  </div>

  <div className="footer-copyright">
    © {new Date().getFullYear()} Mailroom. All rights reserved.
  </div>
</footer>

      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState({
      loading: true,
      setup: false,
      user: null,
    }),
    nav = useNavigate();
  const boot = async () => {
    try {
      const s = (await api("/auth/status")).data.setupRequired;
      let user = null;
      if (!s) {
        try {
          user = (await api("/auth/me")).data;
        } catch {}
      }
      setState({ loading: false, setup: s, user });
    } catch {
      setState({ loading: false, setup: false, user: null, down: true });
    }
  };
  useEffect(() => {
    boot();
  }, []);
  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setState({ ...state, user: null });
    nav("/login");
  };
  if (state.loading) return <Spinner />;
  if (state.down)
    return (
      <p className="error" style={{ padding: 24 }}>
        Cannot reach the server. Is the backend running on port 4000?
      </p>
    );
  const { setup, user } = state,
    guard = (el) =>
      setup ? <Navigate to="/setup" /> : user ? el : <Navigate to="/login" />;
  return (
    <ToastProvider>
      <Routes>
        <Route
          path="/setup"
          element={
            setup ? (
              <Setup onDone={() => setState({ ...state, setup: false })} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/login"
          element={
            setup ? (
              <Navigate to="/setup" />
            ) : user ? (
              <Navigate to="/" />
            ) : (
              <Login
                onLogin={(u) => {
                  setState({ ...state, user: u });
                  nav("/");
                }}
              />
            )
          }
        />
        <Route path="/forgot-password" element={<Forgot />} />
        <Route path="/reset-password" element={<Reset />} />
        <Route element={guard(<Layout user={user} onLogout={logout} />)}>
          <Route index element={<Dashboard />} />
          <Route path="templates" element={<TemplateList />} />
          <Route path="templates/new" element={<TemplateForm />} />
          <Route path="templates/:id" element={<TemplateView />} />
          <Route path="templates/:id/edit" element={<TemplateForm />} />
          <Route path="compose" element={<Compose />} />
          <Route path="global" element={<GlobalPlaceholders />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ToastProvider>
  );
}
