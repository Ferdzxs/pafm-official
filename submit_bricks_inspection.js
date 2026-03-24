import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzzoqzqmpxsyrerzthxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function submitBricksInspection() {
    console.log('=== SUBMITTING BRICKS INSPECTION ===\n');
    
    const bricksRequestId = 'REQ-PK-1774288254827';
    const timestamp = Date.now();
    const inspectionId = `INSP-${timestamp}`;
    const reportId = `IRP-${timestamp}`;
    const employeeId = 'EMP-002'; // FAMCD employee
    const officeId = 'OFF-002'; // FAMCD office
    
    try {
        // 1. Create ocular_inspection record
        console.log('1️⃣  Creating ocular_inspection record...');
        const { error: inspError } = await supabase
            .from('ocular_inspection')
            .insert({
                inspection_id: inspectionId,
                inventory_request_id: bricksRequestId,
                property_id: null, // bricks is general inventory, not tied to specific property
                inspection_date: new Date().toISOString().split('T')[0],
                physical_condition_notes: 'Condition: good | Recs: Maintain current storage conditions | Notes: Bricks in good condition, properly stacked and organized. No visible damage or deterioration observed. Recommended to continue maintenance schedule.',
                new_condition: 'good',
                usage_verified: true,
                boundary_verified: true,
                conducted_by_employee: employeeId,
                conducted_by_office: officeId
            });
        
        if (inspError) {
            console.error('   ✗ Error:', inspError.message);
            throw inspError;
        }
        console.log(`   ✓ Created: ${inspectionId}`);
        
        // 2. Create inventory_report record
        console.log('\n2️⃣  Creating inventory_report record...');
        const { error: reportError } = await supabase
            .from('inventory_report')
            .insert({
                inventory_report_id: reportId,
                inventory_request_id: bricksRequestId,
                preparation_date: new Date().toISOString().split('T')[0],
                prepared_by_employee: employeeId,
                prepared_by_office: officeId,
                approval_status: 'pending' // Key: This makes it visible to CGSD
            });
        
        if (reportError) {
            console.error('   ✗ Error:', reportError.message);
            throw reportError;
        }
        console.log(`   ✓ Created: ${reportId}`);
        
        // 3. Update inventory_request status to 'completed'
        console.log('\n3️⃣  Updating inventory_request status...');
        const { error: updateError } = await supabase
            .from('inventory_request')
            .update({ status: 'completed' })
            .eq('inventory_request_id', bricksRequestId);
        
        if (updateError) {
            console.error('   ✗ Error:', updateError.message);
            throw updateError;
        }
        console.log(`   ✓ Updated status to "completed"`);
        
        console.log('\n✅ BRICKS INSPECTION SUBMITTED SUCCESSFULLY!\n');
        console.log('📋 Next Step: CGSD can now review in /assets/approvals');
        console.log(`   Report ID: ${reportId}`);
        console.log(`   Status: pending (waiting for CGSD approval)`);
        
    } catch (error) {
        console.error('\n❌ Failed to submit inspection:', error.message);
        process.exit(1);
    }
}

submitBricksInspection();
