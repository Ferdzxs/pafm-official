import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzzoqzqmpxsyrerzthxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDocumentPatterns() {
    console.log('=== CHECKING DOCUMENT PATTERNS ===\n');
    
    console.log('1️⃣  Reports with digital_report_url...');
    const { data: withUrl } = await supabase
        .from('inventory_report')
        .select('inventory_report_id, digital_report_url')
        .not('digital_report_url', 'is', null)
        .limit(3);
    
    if (withUrl && withUrl.length > 0) {
        console.log(`   ✓ Found ${withUrl.length} reports with URLs:`);
        withUrl.forEach(r => {
            console.log(`      - ${r.inventory_report_id}`);
            console.log(`        URL: ${r.digital_report_url}`);
        });
    } else {
        console.log(`   ✗ No reports with digital_report_url found`);
    }
    
    console.log('\n2️⃣  Digital documents in system...');
    const { data: docs } = await supabase
        .from('digital_document')
        .select('document_id, document_type, file_url, reference_no')
        .limit(3);
    
    if (docs && docs.length > 0) {
        console.log(`   ✓ Found ${docs.length} digital documents:`);
        docs.forEach(d => {
            console.log(`      - ${d.document_id}`);
            console.log(`        Type: ${d.document_type}`);
            console.log(`        File: ${d.file_url}`);
            console.log(`        Ref: ${d.reference_no}`);
        });
    } else {
        console.log(`   ✗ No digital documents found`);
    }
}

checkDocumentPatterns();
