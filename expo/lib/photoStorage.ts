import { File as FSFile, Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const PHOTOS_DIR_NAME = 'cabin_photos';

function ensurePhotosDir(): Directory | null {
  if (Platform.OS === 'web') return null;
  try {
    const dir = new Directory(Paths.document, PHOTOS_DIR_NAME);
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }
    return dir;
  } catch (e) {
    console.log('[photoStorage] ensurePhotosDir error', e);
    return null;
  }
}

function getExtension(uri: string): string {
  try {
    const clean = uri.split('?')[0].split('#')[0];
    const last = clean.split('/').pop() ?? '';
    const dot = last.lastIndexOf('.');
    if (dot > 0 && dot < last.length - 1) {
      const ext = last.slice(dot + 1).toLowerCase();
      if (ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) return ext;
    }
  } catch (e) {
    console.log('[photoStorage] getExtension error', e);
  }
  return 'jpg';
}

function makeFilename(ext: string): string {
  return `cabin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

async function persistViaFetch(sourceUri: string, dir: Directory, filename: string): Promise<string | null> {
  try {
    const response = await fetch(sourceUri);
    if (!response.ok) {
      console.log('[photoStorage] persistViaFetch bad status', response.status);
      return null;
    }
    const buf = await response.arrayBuffer();
    const dest = new FSFile(dir, filename);
    if (dest.exists) {
      try { dest.delete(); } catch {}
    }
    dest.create();
    dest.write(new Uint8Array(buf));
    console.log('[photoStorage] persisted via fetch as', filename);
    return filename;
  } catch (e) {
    console.log('[photoStorage] persistViaFetch error', e);
    return null;
  }
}

export async function persistPickedPhoto(sourceUri: string): Promise<string> {
  if (!sourceUri) return sourceUri;
  if (Platform.OS === 'web') return sourceUri;
  if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
    return sourceUri;
  }
  const dir = ensurePhotosDir();
  if (!dir) return sourceUri;

  const ext = getExtension(sourceUri);
  const filename = makeFilename(ext);

  const isContent = sourceUri.startsWith('content://');
  const isFile = sourceUri.startsWith('file://') || sourceUri.startsWith('/');

  if (isFile) {
    try {
      const dest = new FSFile(dir, filename);
      const src = new FSFile(sourceUri);
      src.copy(dest);
      console.log('[photoStorage] persisted (copy) as', filename);
      return filename;
    } catch (e) {
      console.log('[photoStorage] copy failed, trying fetch fallback', e);
    }
  }

  if (isContent || isFile) {
    const result = await persistViaFetch(sourceUri, dir, filename);
    if (result) return result;
  }

  return sourceUri;
}

export function resolvePhotoUri(stored: string | undefined | null): string {
  if (!stored) return '';
  if (Platform.OS === 'web') return stored;
  if (
    stored.startsWith('http://') ||
    stored.startsWith('https://') ||
    stored.startsWith('data:') ||
    stored.startsWith('blob:')
  ) {
    return stored;
  }

  if (stored.startsWith('file://') || stored.startsWith('/') || stored.startsWith('content://')) {
    try {
      const filename = stored.split('/').pop()?.split('?')[0] ?? '';
      if (filename) {
        const dir = ensurePhotosDir();
        if (dir) {
          const candidate = new FSFile(dir, filename);
          if (candidate.exists) return candidate.uri;
        }
      }
      if (!stored.startsWith('content://')) {
        const direct = new FSFile(stored);
        if (direct.exists) return direct.uri;
      }
    } catch (e) {
      console.log('[photoStorage] resolvePhotoUri legacy error', e);
    }
    return stored;
  }

  try {
    const dir = ensurePhotosDir();
    if (!dir) return stored;
    const file = new FSFile(dir, stored);
    return file.uri;
  } catch (e) {
    console.log('[photoStorage] resolvePhotoUri error', e);
    return stored;
  }
}

export function resolvePhotoUris(stored: string[] | undefined | null): string[] {
  if (!stored || stored.length === 0) return [];
  return stored.map((s) => resolvePhotoUri(s)).filter((s) => s.length > 0);
}
