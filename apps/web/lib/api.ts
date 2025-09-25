// API Base URL configuration
// In development, defaults to localhost:4000 if not set
// const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:4000';
const API_BASE = '';

export function api(path: string) {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${API_BASE}${path}`;
}

// Fetcher for use with SWR
export const fetcher = (url: string) => fetch(url, {
  // CHANGED: Added `credentials: 'include'` here to ensure cookies are sent on all SWR fetch requests.
  credentials: 'include' 
}).then(r => {
  if (!r.ok) {
    // Also parse the JSON body for a more specific error message from the API
    return r.json().then(errorData => {
      throw new Error(errorData.error || `${r.status} ${r.statusText}`);
    });
  }
  return r.json();
});

// WebSocket URL for chat functionality
export const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS || "ws://127.0.0.1:8000/ws";

// Export API_BASE for external use
export { API_BASE };

// Types
export interface DriveFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface DriveFile {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  created_at: string;
  doc_type?: string;
  basin?: string;
  block?: string;
  indexed?: boolean;
}

export interface DriveChildren {
  folders: DriveFolder[];
  files: DriveFile[];
}

// API Functions
export const driveApi = {
  // Get folder contents
  getChildren: (folderId?: string): Promise<DriveChildren> =>
    fetcher(api(`/api/drive/children${folderId ? `?folder_id=${folderId}` : ''}`)),

  // Create folder
  createFolder: async (name: string, parentId?: string): Promise<DriveFolder> => {
    const res = await fetch(api('/api/drive/folder'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // CHANGED: Ensure credentials are sent
      body: JSON.stringify({ name, parent_id: parentId || null })
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },

  // Rename folder
  renameFolder: async (id: string, name: string): Promise<DriveFolder> => {
    const res = await fetch(api(`/api/drive/folder/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },

  // Delete folder
  deleteFolder: async (id: string): Promise<void> => {
    const res = await fetch(api(`/api/drive/folder/${id}`), {
      method: 'DELETE'
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to delete folder' }));
      throw new Error(error.error || `${res.status} ${res.statusText}`);
    }
  },

  // Rename file
  renameFile: async (id: string, filename: string): Promise<DriveFile> => {
    const res = await fetch(api(`/api/files/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },

  // Delete file
  deleteFile: async (id: string): Promise<void> => {
    const res = await fetch(api(`/api/files/${id}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  },

  // Move file
  moveFile: async (id: string, folderId?: string): Promise<DriveFile> => {
    const res = await fetch(api(`/api/drive/file/${id}/move`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId || null })
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },

  // Search files
  search: async (query: string): Promise<DriveFile[]> => {
    const res = await fetch(api(`/api/drive/search?q=${encodeURIComponent(query)}`));
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },

  // Get breadcrumbs
  getBreadcrumbs: async (folderId: string): Promise<DriveFolder[]> => {
    const res = await fetch(api(`/api/drive/breadcrumbs/${folderId}`));
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
};
