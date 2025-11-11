export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  expanded?: boolean;
}

export interface MarkdownOutline {
  level: number;
  text: string;
  id: string;
  line: number;
  children?: MarkdownOutline[];
}

export interface FileChangeEvent {
  type: 'change' | 'add' | 'unlink';
  path: string;
}

export interface ServerMessage {
  type: 'file-change' | 'connection';
  data: any;
}
