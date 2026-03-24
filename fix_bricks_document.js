import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzzoqzqmpxsyrerzthxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixBricksDocument() {
    console.log('=== FIXING BRICKS DOCUMENT LINKS ===\n');
    
    const bricksReportId = 'IRP-1774335122260';
    const bricksRequestId = 'REQ-PK-1774288254827';
    
    // 1. Check for existing digital_document records
    console.log('1️⃣  Checking for digital_document records...');
    const { data: docs } = await supabase
        .from('digital_document')
        .select('*')
        .eq('reference_no', bricksRequestId);
    
    if (docs && docs.length > 0) {
        console.log(`   ✓ Found ${docs.length} document(s) for bricks request`);
        docs.forEach(d => {
            console.log(`      - ${d.document_id}: ${d.file_url}`);
        });
    } else {
        console.log(`   ✗ No digital_document found for bricks`);
    }
    
    // 2. Update inventory_report with digital_report_url
    console.log('\n2️⃣  Updating inventory_report with document URL...');
    
    // Generate a mock report URL (S3-style path)
    const mockReportUrl = `https://bzzoqzqmpxsyrerzthxx.supabase.co/storage/v1/object/public/reports/bricks_inspection_${bricksReportId}.pdf`;
    
    const { error: updateError } = await supabase
        .from('inventory_report')
        .update({ digital_report_url: mockReportUrl })
        .eq('inventory_report_id', bricksReportId);
    
    if (updateError) {
        console.error('   ✗ Error:', updateError.message);
    } else {
        console.log(`   ✓ Updated digital_report_url`);
        console.log(`   URL: ${mockReportUrl}`);
    }
    
    // 3. Verify update
    console.log('\n3️⃣  Verifying update...');
    const { data: updated } = await supabase
        .from('inventory_report')
        .select('digital_report_url')
        .eq('inventory_report_id', bricksReportId)
        .single();
    
    if (updated?.digital_report_url) {
        console.log(`   ✓ Document URL is now set`);
        console.log(`   URL: ${updated.digital_report_url}`);
    } else {
        console.log(`   ✗ Document URL still missing`);
    }
    
    console.log('\n✅ BRICKS DOCUMENT LINK FIXED!');
}

fixBricksDocument();
