export type Status =
  | "idle"
  | "booting"
  | "reading"
  | "rendering"
  | "exporting"
  | "zipping";

export type Sheet = "none" | "more" | "history" | "numbers";

export type SourceFile = {
  id: string;
  name: string;
  color: string;
  bytes: Uint8Array;
  pageCount: number;
};

export type PageModel = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceColor: string;
  /** 0-based page index in the source PDF; -1 = blank page */
  pageIndex: number;
  /** Cumulative rotation in degrees: 0 | 90 | 180 | 270 */
  rotation: number;
  /** blank page size in PDF points */
  blankW?: number;
  blankH?: number;
  thumbUrl?: string;
};

export type SessionRow = {
  id: string;
  name: string;
  pageCount: number;
  sourceCount: number;
  created: number;
  /** Serialized pages + embedded source bytes (base64) */
  payload: string;
};

export const SOURCE_COLORS = [
  "#D9CCAC",
  "#8C9297",
  "#F0EFEC",
  "#A8B5A0",
  "#C4A484",
  "#9AA8B5",
  "#B5A89A",
  "#8FA8A0",
];
