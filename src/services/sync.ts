import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { mergeSynced, type SyncedData } from '../domain/merge';
import { useAppStore } from '../store/useAppStore';

/**
 * Sauvegarde et synchro entre appareils via Supabase (Auth + Postgres).
 * Modèle : une ligne par utilisateur (table user_state) contenant un document JSON.
 * Les données restent d'abord locales (hors ligne) ; la synchro fusionne local et distant.
 * Si les variables d'environnement ne sont pas définies, l'app fonctionne 100 % hors ligne.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const syncConfigured = !!(url && anonKey);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!syncConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export async function getSession(): Promise<Session | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function signIn(email: string, password: string) {
  const sb = supabase();
  if (!sb) throw new Error('Synchro non configurée');
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(translateAuthError(error.message));
  await syncNow();
}

export async function signUp(email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  const sb = supabase();
  if (!sb) throw new Error('Synchro non configurée');
  const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.session) return 'confirm-email';
  await syncNow();
  return 'signed-in';
}

export async function signOut() {
  await supabase()?.auth.signOut();
}

let running: Promise<void> | null = null;

/** Récupère l'état distant, le fusionne avec le local, puis renvoie le résultat. */
export function syncNow(): Promise<void> {
  if (running) return running;
  running = (async () => {
    const sb = supabase();
    if (!sb) return;
    const session = await getSession();
    if (!session) return;
    const userId = session.user.id;

    const { data, error } = await sb.from('user_state').select('data').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(error.message);

    const store = useAppStore.getState();
    const merged = mergeSynced(store.getSynced(), (data?.data as SyncedData | undefined) ?? null);
    store.applySynced(merged);

    const { error: upErr } = await sb
      .from('user_state')
      .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() });
    if (upErr) throw new Error(upErr.message);
    useAppStore.getState().markSynced(Date.now());
  })().finally(() => {
    running = null;
  });
  return running;
}

function translateAuthError(msg: string): string {
  if (/invalid login/i.test(msg)) return 'E-mail ou mot de passe incorrect.';
  if (/already registered/i.test(msg)) return 'Un compte existe déjà avec cet e-mail.';
  if (/password/i.test(msg)) return 'Mot de passe trop faible (6 caractères minimum).';
  if (/email/i.test(msg)) return 'Adresse e-mail invalide ou non confirmée.';
  return msg;
}
