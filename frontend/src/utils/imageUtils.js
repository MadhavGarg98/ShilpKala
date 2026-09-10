import { getBaseUrl } from '../config';

/**
 * Safely resolves an image source for React Native's <Image source={...} />.
 * Handles:
 * - numeric required local assets: require('../../assets/...') -> returns number directly
 * - object sources: { uri: '...' } -> returns object directly
 * - string URLs: 'https://...' -> wraps as { uri: '...' }
 */
export function resolveImageSource(src) {
  if (!src) return undefined;
  if (typeof src === 'number') {
    return src;
  }
  if (typeof src === 'object' && src !== null && src.uri) {
    let uri = src.uri;
    if (typeof uri === 'string' && (uri.includes('localhost:8000') || uri.includes('127.0.0.1:8000'))) {
      uri = uri.replace(/http:\/\/(localhost|127\.0\.0\.1):8000/, getBaseUrl());
    }
    return { ...src, uri };
  }
  if (typeof src === 'string') {
    let uri = src;
    if (uri.includes('localhost:8000') || uri.includes('127.0.0.1:8000')) {
      uri = uri.replace(/http:\/\/(localhost|127\.0\.0\.1):8000/, getBaseUrl());
    }
    return { uri };
  }
  return src;
}

export default resolveImageSource;
