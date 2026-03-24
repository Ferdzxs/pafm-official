import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzzoqzqmpxsyrerzthxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkScopes() {
    console.log('Fetching all inventory_request rows...\n');
    
    // Query all inventory requests
    const { data, error } = await supabase
        .from('inventory_request')
        .select('inventory_request_id, inventory_scope, status, requesting_office, date_requested')
        .order('date_requested', { ascending: false });
    
    if (error) {
        console.error('Error querying database:', error);
        process.exit(1);
    }
    
    if (!data || data.length === 0) {
        console.log('❌ No inventory_request rows found in database');
        process.exit(0);
    }
    
    console.log(`✓ Found ${data.length} inventory_request rows:\n`);
    
    // Group by inventory_scope
    const grouped = {};
    data.forEach(row => {
        const scope = row.inventory_scope || '(no scope)';
        if (!grouped[scope]) {
            grouped[scope] = [];
        }
        grouped[scope].push(row);
    });
    
    // Display results
    Object.entries(grouped).forEach(([scope, rows]) => {
        console.log(`\n📋 Scope: "${scope}" (${rows.length} rows)`);
        rows.forEach(row => {
            const statusEmoji = row.status === 'in_progress' ? '⏳' : 
                               row.status === 'pending' ? '⏹️' :
                               row.status === 'completed' ? '✓' : '•';
            console.log(`  ${statusEmoji} ID: ${row.inventory_request_id}`);
            console.log(`     Status: ${row.status}`);
            console.log(`     Office: ${row.requesting_office}`);
            console.log(`     Date: ${row.date_requested}`);
        });
    });
}

checkScopes();
