/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    __kit?: {
      pages: number;
      selected: string[];
      rotate: (deg?: number) => void;
      duplicate: () => void;
      delete: () => void;
      blank: () => void;
      extractZip: () => Promise<void>;
      exportPdf: () => Promise<Blob | void>;
      loadSample: () => Promise<void>;
      getState: () => unknown;
      posts: string[];
      reorder?: (from: number, to: number) => void;
      selectAll?: () => void;
      invert?: () => void;
      setPageNumbers?: (v: boolean) => void;
      saveSession?: (name?: string) => Promise<void>;
      recallSession?: (id: string) => Promise<void>;
      listSessions?: () => Promise<unknown[]>;
      moveSelected?: (dir: -1 | 1) => void;
      select?: (ids: string[]) => void;
    };
  }
}
