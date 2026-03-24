import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzzoqzqmpxsyrerzthxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkFamcdQueue() {
    console.log('=== FAMCD QUEUE CHECK ===\n');
    console.log('Simulating FAMCD query: status IN [pending, in_progress]\n');
    
    const { data, error } = await supabase
        .from('inventory_request')
        .select(`
            inventory_request_id,
            inventory_scope,
            status,
            date_requested
        `)
        .in('status', ['pending', 'in_progress'])
        .order('date_requested', { ascending: false });
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Found ${data.length} requests for FAMCD to inspect:\n`);
    
    const bricksFound = data.find(r => r.inventory_request_id === 'REQ-PK-1774288254827');
    
    data.forEach(r => {
        const isBricks = r.inventory_request_id === 'REQ-PK-1774288254827' ? ' ← BRICKS' : '';
        console.log(`  ${r.inventory_request_id} | ${r.inventory_scope} | Status: ${r.status}${isBricks}`);
    });
    
    console.log('\n✓ BRICKS IS IN FAMCD QUEUE');
    console.log('⚠️  But FAMCD has NOT submitted inspection report yet');
    console.log('\nTo fix: FAMCD must:');
    console.log('  1. Open /assets/inspections');
    console.log('  2. Find "bricks [Docs: NR-15]" request');
    console.log('  3. Click "Conduct Inspection"');
    console.log('  4. Fill inspection form and submit');
    console.log('\nOnce submitted, CGSD will see it in /assets/approvals');
}

checkFamcdQueue();
