import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzzoqzqmpxsyrerzthxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBricksStatus() {
    console.log('Querying inventory_request for bricks with scope "bricks"...\n');
    
    // Query for inventory requests with inventory_scope = 'bricks'
    const { data, error } = await supabase
        .from('inventory_request')
        .select('inventory_request_id, inventory_scope, status, requesting_office')
        .eq('inventory_scope', 'bricks')
        .order('date_requested', { ascending: false });
    
    if (error) {
        console.error('Error querying database:', error);
        process.exit(1);
    }
    
    console.log('Results for inventory_scope = "bricks":');
    console.log(JSON.stringify(data, null, 2));
    
    if (data && data.length > 0) {
        const bricksRows = data.filter(r => r.inventory_scope === 'bricks');
        console.log('\n✓ Found bricks rows:');
        bricksRows.forEach(row => {
            const isInProgress = row.status === 'in_progress';
            console.log(`  - ID: ${row.inventory_request_id}`);
            console.log(`    Scope: ${row.inventory_scope}`);
            console.log(`    Status: ${row.status} ${isInProgress ? '✓' : '✗'}`);
            console.log(`    Office: ${row.requesting_office}`);
        });
    } else {
        console.log('No bricks rows found');
    }
}

checkBricksStatus();
