import { useNavigate } from "@solidjs/router";
import {
  createContext,
  createSignal,
  onMount,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js";
import { ApiError, errorMessage, login as loginRequest, logout as logoutRequest, me, setUnauthorizedHandler } from "./api";
import type { User } from "./types";

type AuthStatus = "unknown" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: Accessor<User | null>;
  status: Accessor<AuthStatus>;
  loadError: Accessor<string>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>();

export function AuthProvider(props: ParentProps) {
  const navigate = useNavigate();
  const [user, setUser] = createSignal<User | null>(null);
  const [status, setStatus] = createSignal<AuthStatus>("unknown");
  const [loadError, setLoadError] = createSignal("");

  function clearSession() {
    setUser(null);
    setLoadError("");
    setStatus("anonymous");
    navigate("/login", { replace: true });
  }

  setUnauthorizedHandler(clearSession);

  async function refresh() {
    setStatus("unknown");
    setLoadError("");
    try {
      const next = await me();
      setUser(next);
      setStatus("authenticated");
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError && err.status === 401) {
        setStatus("anonymous");
        return;
      }
      setLoadError(errorMessage(err));
      setStatus("anonymous");
    }
  }

  onMount(() => {
    void refresh();
  });

  async function login(email: string, password: string) {
    const next = await loginRequest(email, password);
    setUser(next);
    setLoadError("");
    setStatus("authenticated");
  }

  async function logout() {
    try {
      await logoutRequest();
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) throw err;
    }
    setUser(null);
    setLoadError("");
    setStatus("anonymous");
    navigate("/login", { replace: true });
  }

  const value: AuthContextValue = {
    user,
    status,
    loadError,
    login,
    logout,
    retry: refresh,
  };

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}
