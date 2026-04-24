import { Platform } from 'react-native';

const DEV_LAN_IP = '__DEV_LAN_IP__';
const BASE = __DEV__
  ? `http://${Platform.OS === 'android' ? '10.0.2.2' : DEV_LAN_IP}:18230/api`
  : 'http://127.0.0.1:18230/api';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
