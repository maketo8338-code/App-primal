import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import type { State } from '../lib/store';

// ─────────────────────────────────────────────────────────────────────────────
// Backup file of everything the user entered (profile, journal, habits,
// favourites, notification preferences + ambience settings). Plain JSON so it
// stays readable and portable; it never leaves the phone unless the user sends it.
// ─────────────────────────────────────────────────────────────────────────────

export const BACKUP_FORMAT = 'primal-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: State;
  ambience?: unknown;
}

export function buildBackup(data: State, ambience: unknown): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data, ambience };
}

/** Reads a backup file's text. Returns null when it is not a PRIMAL backup. */
export function parseBackup(text: string): BackupFile | null {
  try {
    const value = JSON.parse(text) as Partial<BackupFile>;
    if (value?.format !== BACKUP_FORMAT || typeof value.version !== 'number' || !value.data || typeof value.data !== 'object') return null;
    if (value.version > BACKUP_VERSION) return null; // made by a newer app version
    return value as BackupFile;
  } catch {
    return null;
  }
}

export type ExportResult = { ok: true } | { ok: false; reason: 'unavailable' | 'error' };

/** Writes the backup to a file and opens the phone's share sheet (Files, Drive, e-mail…). */
export async function exportBackup(backup: BackupFile): Promise<ExportResult> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unavailable' };
  try {
    const day = backup.exportedAt.slice(0, 10);
    const file = new File(Paths.cache, `primal-sauvegarde-${day}.json`);
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(backup));
    if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'unavailable' };
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Sauvegarder mes données PRIMAL' });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Lets the user pick a backup file; returns its parsed content, or why it failed. */
export async function pickBackup(): Promise<{ ok: true; backup: BackupFile } | { ok: false; reason: 'cancelled' | 'invalid' | 'error' }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return { ok: false, reason: 'cancelled' };
    const asset = result.assets[0];
    const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
    const backup = parseBackup(text);
    return backup ? { ok: true, backup } : { ok: false, reason: 'invalid' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
