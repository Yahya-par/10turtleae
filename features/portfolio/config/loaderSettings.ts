export type LoaderType =
  | 'loader1'
  | 'loader2'
  | 'loader3'
  | 'loader4'
  | 'loader5'
  | 'loader6';

export const loaderSettings = {
  activeLoader: 'loader2' as LoaderType,
} as const; 
