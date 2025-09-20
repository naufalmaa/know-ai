// Simple in-memory database for development testing
// This allows you to test the upload functionality without setting up PostgreSQL

interface MockFile {
  id: string;
  folder_id: string | null;
  owner_id: string;
  filename: string;
  mime_type: string | null;
  size: number;
  s3_key: string;
  checksum?: string;
  created_at: Date;
}

interface MockFolder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  created_at: Date;
}

interface MockProductionRecord {
  ts: string;
  oil_bopd: number;
  gas_mmscfd: number;
  tenant_id: string;
}

class MockDatabase {
  private files: MockFile[] = [];
  private folders: MockFolder[] = [];
  private productionTimeseries: MockProductionRecord[] = [];
  private users: any[] = [];

  constructor() {
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Add sample production data
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      this.productionTimeseries.push({
        ts: date.toISOString().split('T')[0],
        oil_bopd: 14000 + (Math.random() * 3000) - 1500,
        gas_mmscfd: 200 + (Math.random() * 50) - 25,
        tenant_id: 'demo'
      });
    }

    // Add sample folders
    this.folders.push(
      { id: 'folder-1', name: 'Communications', parent_id: null, owner_id: 'demo-user', created_at: new Date() },
      { id: 'folder-2', name: 'Documents', parent_id: null, owner_id: 'demo-user', created_at: new Date() },
      { id: 'folder-3', name: 'Products', parent_id: null, owner_id: 'demo-user', created_at: new Date() }
    );

    // Add sample user
    this.users.push({ id: 'demo-user', email: 'demo@example.com', role: 'user', created_at: new Date() });
  }

  async query(text: string, params: any[] = []) {
    console.log('[MockDB]', text, params);
    
    // Mock folder queries
    if (text.includes('select id, name, parent_id, created_at from folders')) {
      return { rows: this.folders, rowCount: this.folders.length };
    }
    
    // Mock file queries  
    if (text.includes('select f.id, f.filename, f.mime_type, f.size, f.created_at')) {
      const filesWithMeta = this.files.map(f => ({
        ...f,
        doc_type: null,
        basin: null, 
        block: null,
        indexed: false
      }));
      return { rows: filesWithMeta, rowCount: filesWithMeta.length };
    }

    // Mock COUNT queries
    if (text.includes('SELECT COUNT(*) as count FROM folders')) {
      return { rows: [{ count: this.folders.length }], rowCount: 1 };
    }
    
    if (text.includes('SELECT COUNT(*) as count FROM files')) {
      return { rows: [{ count: this.files.length }], rowCount: 1 };
    }
    
    if (text.includes('SELECT COUNT(*) as count FROM production_timeseries')) {
      return { rows: [{ count: this.productionTimeseries.length }], rowCount: 1 };
    }
    
    if (text.includes('SELECT COUNT(*) as count FROM users')) {
      return { rows: [{ count: this.users.length }], rowCount: 1 };
    }

    // Mock file metadata distribution  
    if (text.includes('fm.doc_type, COUNT(*) as count')) {
      return { 
        rows: [
          { doc_type: 'Communications', count: 591 },
          { doc_type: 'Documents', count: 103 },
          { doc_type: 'Products', count: 448 },
          { doc_type: 'Suppliers', count: 9 },
          { doc_type: 'Tickets', count: 95 },
          { doc_type: 'Transactions', count: 729 }
        ], 
        rowCount: 6 
      };
    }

    // Mock recent files
    if (text.includes('WHERE created_at >= NOW() - INTERVAL')) {
      return { rows: [{ count: Math.floor(this.files.length * 0.1) }], rowCount: 1 };
    }

    // Mock production timeseries queries
    if (text.includes('from production_timeseries') && text.includes('date_trunc')) {
      const rows = this.productionTimeseries.slice(0, 30).map(record => ({
        ts: record.ts,
        oil: record.oil_bopd,
        gas: record.gas_mmscfd
      }));
      return { rows, rowCount: rows.length };
    }
    
    // Mock file insert
    if (text.includes('insert into files')) {
      const [id, folder_id, owner_id, filename, mime_type, size, s3_key] = params;
      console.log('[MockDB] Inserting file with ID:', id);
      
      const newFile: MockFile = {
        id,
        folder_id,
        owner_id,
        filename,
        mime_type,
        size: size || 0,
        s3_key,
        created_at: new Date()
      };
      this.files.push(newFile);
      console.log('[MockDB] File inserted:', newFile);
      console.log('[MockDB] Total files now:', this.files.length);
      return { rows: [newFile], rowCount: 1 };
    }
    
    // Mock file update
    if (text.includes('update files set size=')) {
      const [size, checksum, file_id] = params;
      console.log('[MockDB] Looking for file_id:', file_id, 'in', this.files.length, 'files');
      console.log('[MockDB] Available file IDs:', this.files.map(f => f.id));
      
      const file = this.files.find(f => f.id === file_id);
      if (file) {
        file.size = size;
        file.checksum = checksum;
        console.log('[MockDB] Updated file:', file);
        return { rows: [file], rowCount: 1 };
      }
      console.log('[MockDB] File not found for ID:', file_id);
      return { rows: [], rowCount: 0 };
    }
    
    // Mock folder insert
    if (text.includes('insert into folders')) {
      const [name, parent_id, owner_id] = params;
      const newFolder: MockFolder = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        parent_id,
        owner_id,
        created_at: new Date()
      };
      this.folders.push(newFolder);
      return { rows: [newFolder], rowCount: 1 };
    }
    
    // Mock search
    if (text.includes('filename ilike')) {
      const searchTerm = params[0] || '';
      const matching = this.files.filter(f => 
        f.filename.toLowerCase().includes(searchTerm.toLowerCase())
      ).map(f => ({
        ...f,
        doc_type: null,
        basin: null,
        block: null,
        well_name: null
      }));
      return { rows: matching, rowCount: matching.length };
    }

    // Mock file metadata insert/update
    if (text.includes('insert into file_metadata')) {
      return { rows: [{ file_id: params[0] }], rowCount: 1 };
    }

    // Mock health check
    if (text.includes('SELECT NOW()')) {
      return { rows: [{ current_time: new Date() }], rowCount: 1 };
    }
    
    // Default empty result
    return { rows: [], rowCount: 0 };
  }
}

export const mockDb = new MockDatabase();