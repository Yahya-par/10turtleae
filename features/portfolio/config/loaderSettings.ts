export type LoaderType =
  | 'loader1'
  | 'loader2'
  | 'loader3'
  | 'loader4'
  | 'loader5'
  | 'loader6'
  | 'loader7';

export const loaderSettings = {
  activeLoader: 'loader7' as LoaderType,
} as const; 
