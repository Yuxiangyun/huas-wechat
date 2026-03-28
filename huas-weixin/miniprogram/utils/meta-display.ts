import type { ApiMeta } from './api';
import { formatBeijingDateTime, resolveRefreshHint, resolveUpdatedAtText } from './util';

interface CacheMetaSnapshot {
  updatedAtText?: string;
  refreshHint?: string;
}

export interface MetaDisplayState {
  updatedAtText: string;
  refreshHint: string;
}

interface BuildMetaDisplayOptions {
  fallbackHint?: string;
  fallbackTime?: string | number | Date;
}

function resolveMetaUpdatedAtText(
  meta?: ApiMeta,
  fallbackTime?: string | number | Date,
): string | undefined {
  const serverUpdatedAtText = resolveUpdatedAtText(meta?.updated_at) || resolveUpdatedAtText(meta?.cache_time);
  if (serverUpdatedAtText) return serverUpdatedAtText;
  if (meta?.stale || fallbackTime === undefined || fallbackTime === null) return undefined;

  const fallbackText = formatBeijingDateTime(fallbackTime);
  return fallbackText || undefined;
}

export function buildMetaDisplayState(
  meta?: ApiMeta,
  { fallbackHint = '', fallbackTime }: BuildMetaDisplayOptions = {},
): MetaDisplayState {
  const updatedAtText = resolveMetaUpdatedAtText(meta, fallbackTime);
  const refreshHint = resolveRefreshHint(meta, updatedAtText) || (updatedAtText ? '' : fallbackHint);

  return {
    updatedAtText: refreshHint ? '' : (updatedAtText || ''),
    refreshHint,
  };
}

export function buildCachedMetaDisplayState(snapshot?: CacheMetaSnapshot): MetaDisplayState {
  if (!snapshot) {
    return {
      updatedAtText: '',
      refreshHint: '',
    };
  }

  return {
    updatedAtText: snapshot.refreshHint ? '' : (snapshot.updatedAtText || ''),
    refreshHint: snapshot.refreshHint || '',
  };
}
