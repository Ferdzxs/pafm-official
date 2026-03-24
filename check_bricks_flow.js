import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzzoqzqmpxsyrerzthxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBricksFlow() {
    console.log('=== BRICKS REQUEST FLOW CHECK ===\n');
    
    const bricksRequestId = 'REQ-PK-1774288254827';
    
    // 1. Check inventory_request
    console.log('1️⃣  Checking inventory_request...');
    const { data: reqData } = await supabase
        .from('inventory_request')
        .select('*')
        .eq('inventory_request_id', bricksRequestId);
    
    if (reqData && reqData[0]) {
        console.log(`   ✓ Found: status = "${reqData[0].status}"`);
    } else {
        console.log(`   ✗ Not found`);
    }
    
    // 2. Check ocular_inspection
    console.log('\n2️⃣  Checking ocular_inspection...');
    const { data: inspecData } = await supabase
        .from('ocular_inspection')
        .select('inspection_id, inventory_request_id')
        .eq('inventory_request_id', bricksRequestId);
    
    if (inspecData && inspecData.length > 0) {
        console.log(`   ✓ Found ${inspecData.length} inspection(s)`);
        inspecData.forEach(i => console.log(`      - ${i.inspection_id}`));
    } else {
        console.log(`   ✗ No inspections found`);
    }
    
    // 3. Check inventory_report
    console.log('\n3️⃣  Checking inventory_report...');
    const { data: reportData } = await supabase
        .from('inventory_report')
        .select('inventory_report_id, inventory_request_id, approval_status, preparation_date')
        .eq('inventory_request_id', bricksRequestId);
    
    if (reportData && reportData.length > 0) {
        console.log(`   ✓ Found ${reportData.length} report(s):`);
        reportData.forEach(r => {
            console.log(`      - ${r.inventory_report_id}`);
            console.log(`        Status: ${r.approval_status}`);
            console.log(`        Date: ${r.preparation_date}`);
        });
    } else {
        console.log(`   ✗ No inventory_report found (THIS IS THE ISSUE!)`);
    }
    
    // 4. Check all reports that should appear in CGSD approvals
    console.log('\n4️⃣  All reports pending CGSD approval (approval_status="pending")...');
    const { data: allPending } = await supabase
        .from('inventory_report')
        .select('inventory_report_id, inventory_request_id, approval_status, preparation_date')
        .eq('approval_status', 'pending')
        .order('preparation_date', { ascending: false });
    
    if (allPending && allPending.length > 0) {
        console.log(`   ✓ Found ${allPending.length} reports pending approval:`);
        allPending.forEach(r => {
            const isBricks = r.inventory_request_id === bricksRequestId ? ' ← SHOULD BE HERE!' : '';
            console.log(`      - ${r.inventory_report_id} (Request: ${r.inventory_request_id})${isBricks}`);
        });
    } else {
        console.log(`   ✗ No reports pending approval`);
    }
}

checkBricksFlow();
