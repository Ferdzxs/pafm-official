import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzzoqzqmpxsyrerzthxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyCgsdQueue() {
    console.log('=== CGSD APPROVALS QUEUE (VERIFICATION) ===\n');
    
    // Check all pending reports (same query CGSD uses)
    const { data, error } = await supabase
        .from('inventory_report')
        .select(`
            inventory_report_id,
            inventory_request_id,
            approval_status,
            preparation_date,
            inventory_request (
                inventory_scope
            )
        `)
        .eq('approval_status', 'pending')
        .order('preparation_date', { ascending: false });
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`✓ Found ${data.length} reports pending CGSD approval\n`);
    
    // Find and highlight bricks
    const bricksReport = data.find(r => r.inventory_request_id === 'REQ-PK-1774288254827');
    
    if (bricksReport) {
        console.log('🎯 BRICKS REPORT FOUND:\n');
        console.log(`   Report ID: ${bricksReport.inventory_report_id}`);
        console.log(`   Request ID: ${bricksReport.inventory_request_id}`);
        console.log(`   Scope: ${bricksReport.inventory_request.inventory_scope}`);
        console.log(`   Status: ${bricksReport.approval_status}`);
        console.log(`   Date: ${bricksReport.preparation_date}`);
        console.log('\n✅ BRICKS NOW APPEARS IN CGSD APPROVALS!');
    } else {
        console.log('❌ Bricks report not found');
    }
    
    console.log('\n📋 Recent reports pending approval:');
    data.slice(0, 10).forEach((r, i) => {
        const isBricks = r.inventory_request_id === 'REQ-PK-1774288254827' ? ' ← BRICKS' : '';
        console.log(`   ${i+1}. ${r.inventory_report_id} ${isBricks}`);
    });
}

verifyCgsdQueue();
