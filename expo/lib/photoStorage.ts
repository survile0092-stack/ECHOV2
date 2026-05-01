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

export async function persistPickedPhoto(sourceUri: string): Promise<string> {
  if (!sourceUri) return sourceUri;
  if (Platform.OS === 'web') return sourceUri;
  if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
    return sourceUri;
  }
  const dir = ensurePhotosDir();
  if (!dir) return sourceUri;
  try {
    const ext = getExtension(sourceUri);
    const filename = `cabin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dest = new FSFile(dir, filename);
    const src = new FSFile(sourceUri);
    src.copy(dest);
    console.log('[photoStorage] persisted photo as', filename);
    return filename;
  } catch (e) {
    console.log('[photoStorage] persistPickedPhoto error', e);
    return sourceUri;
  }
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

  if (stored.startsWith('file://') || stored.startsWith('/')) {
    try {
      const filename = stored.split('/').pop() ?? '';
      if (filename) {
        const dir = ensurePhotosDir();
        if (dir) {
          const candidate = new FSFile(dir, filename);
          if (candidate.exists) return candidate.uri;
        }
      }
      const direct = new FSFile(stored);
      if (direct.exists) return direct.uri;
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
