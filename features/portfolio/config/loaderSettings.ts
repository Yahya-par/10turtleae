/**
 * Loader Configuration
 * Toggle between different loader designs
 */

export type LoaderType = 'loader1' | 'loader2';

export const loaderSettings = {
  /**
   * Active loader selection
   * - 'loader1': Original desert-themed loader with destinations
   * - 'loader2': Minimal modern loader with circular progress
   */
  activeLoader: 'loader2' as LoaderType,
} as const;
