Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
    api / auth / me: 1 
            
            
           Failed to load resource: the server responded with a status of 500(Internal Server Error)
api / workspaces: 1 
            
            
           Failed to load resource: the server responded with a status of 500(Internal Server Error)
api / workspaces: 1 
            
            
           Failed to load resource: the server responded with a status of 500(Internal Server Error)
intercept - console - error.ts: 44 Error creating workspace: Object
error @intercept-console - error.ts: 44
intercept - console - error.ts: 44 Error creating workspace: Object
error @intercept-console - error.ts: 44
turbopack - hot - reloader - common.ts: 43[Fast Refresh]rebuilding
report - hmr - latency.ts: 26[Fast Refresh]done in 147ms
api / workspaces: 1 
            
            
           Failed to load resource: the server responded with a status of 500(Internal Server Error)const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
console.log('Testing workspace creation directly with SQLite...');

try {
    const db = new Database(dbPath);

    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');

    // Check if agency exists
    const agency = db.prepare('SELECT * FROM agencies WHERE id = ?').get('agency-demo-001');
    console.log('Agency found:', agency ? 'Yes' : 'No');

    if (!agency) {
        console.log('Creating demo agency...');
        db.prepare(`
      INSERT INTO agencies (id, name, email, plan)
      VALUES ('agency-demo-001', 'Demo Agency', 'demo@postia.com', 'pro')
    `).run();
        console.log('✅ Demo agency created');
    }

    // Try to create a workspace directly
    const workspaceId = 'test-workspace-' + Date.now();
    const now = new Date().toISOString();

    console.log('Creating workspace with ID:', workspaceId);

    const stmt = db.prepare(`
    INSERT INTO workspaces (
      id, agency_id, name,
      branding_primary_color, branding_secondary_color, branding_logo,
      branding_slogan, branding_description, branding_whatsapp,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const result = stmt.run(
        workspaceId,
        'agency-demo-001',
        'Test Workspace Direct',
        '#9333ea',
        '#737373',
        null,
        'Test slogan',
        'Test description',
        '',
        now,
        now
    );

    console.log('✅ Workspace created successfully!');
    console.log('Insert result:', result);

    // Verify the workspace was created
    const createdWorkspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId);
    console.log('Created workspace:', createdWorkspace);

    // List all workspaces
    const allWorkspaces = db.prepare('SELECT * FROM workspaces').all();
    console.log(`\nTotal workspaces: ${allWorkspaces.length}`);

    db.close();
} catch (error) {
    console.error('❌ Error:', error);
}