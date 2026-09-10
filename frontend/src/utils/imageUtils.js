/**
 * Safely resolves an image source for React Native's <Image source={...} />.
 * Handles:
 * - numeric required local assets: require('../../assets/...') -> returns number directly
 * - object sources: { uri: '...' } -> returns object directly
 * - string URLs: 'https://...' -> wraps as { uri: '...' }
 */
export function resolveImageSource(src) {
  if (!src) return undefined;
  if (typeof src === 'number' || (typeof src === 'object' && src !== null && src.uri)) {
    return src;
  }
  if (typeof src === 'string') {
    return { uri: src };
  }
  return src;
}

export default resolveImageSource;
