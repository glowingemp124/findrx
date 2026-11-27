/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_GOOGLE_MAPS_API_KEY?: string;
    readonly NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  }
}

export {};
