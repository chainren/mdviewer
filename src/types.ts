export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  documentType?: DocumentType;
  children?: FileNode[];
  expanded?: boolean;
}

// AIGC START
export type DocumentType = 'markdown' | 'html' | 'yaml' | 'json';

export interface WorkspaceDocument {
  content: string;
  documentType: DocumentType;
  path: string;
  lastModified: number;
}
// AIGC END

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
