import type {
  DayLog,
  DayWrite,
  Home,
  Plan,
  Preset,
  PresetWrite,
  RecordingNotes,
  Song,
  SongWrite,
  StartedOn,
  TempoState,
  User,
} from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let onUnauthorized: (() => void) | undefined;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong";
}

function errorText(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("error" in data)) return null;
  const message = (data as { error: unknown }).error;
  return typeof message === "string" && message ? message : null;
}

const sessionPaths = new Set(["/api/auth/login", "/api/auth/me", "/api/auth/logout"]);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(res.status, res.ok ? "Unexpected response" : "Request failed");
    }
  }

  if (!res.ok) {
    const message = errorText(data) ?? "Request failed";
    if (res.status === 401 && !sessionPaths.has(path)) onUnauthorized?.();
    throw new ApiError(res.status, message);
  }

  return data as T;
}

function send(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export function login(email: string, password: string) {
  return request<User>("/api/auth/login", send("POST", { email, password }));
}

export function logout() {
  return request<void>("/api/auth/logout", { method: "POST" });
}

export function me() {
  return request<User>("/api/auth/me");
}

export function getHome() {
  return request<Home>("/api/home");
}

export function putDay(date: string, body: DayWrite) {
  return request<DayLog>(`/api/days/${encodeURIComponent(date)}`, send("PUT", body));
}

export function toggleDay(date: string) {
  return request<DayLog>(`/api/days/${encodeURIComponent(date)}/toggle`, { method: "POST" });
}

export function getPlan() {
  return request<Plan>("/api/plan");
}

export function putSong(key: string, body: SongWrite) {
  return request<Song>(`/api/songs/${encodeURIComponent(key)}`, send("PUT", body));
}

export function putPreset(key: string, body: PresetWrite) {
  return request<Preset>(`/api/presets/${encodeURIComponent(key)}`, send("PUT", body));
}

export function putRecordings(body: RecordingNotes) {
  return request<RecordingNotes>("/api/recordings", send("PUT", body));
}

export function startPlan(startedOn: string) {
  return request<StartedOn>("/api/plan/start", send("PUT", { started_on: startedOn }));
}

export function getTempo() {
  return request<TempoState>("/api/tempo");
}

export function cleanTempo() {
  return request<TempoState>("/api/tempo/clean", { method: "POST" });
}

export function bumpTempo() {
  return request<TempoState>("/api/tempo/bump", { method: "POST" });
}

export function easeTempo() {
  return request<TempoState>("/api/tempo/ease", { method: "POST" });
}

export function putTempo(bpm: number) {
  return request<TempoState>("/api/tempo", send("PUT", { bpm }));
}
