import { createClient } from '@supabase/supabase-js'
const supabaseUrl='https://bzzoqzqmpxsyrerzthxx.supabase.co'
const supabaseAnonKey='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM'
const supabase=createClient(supabaseUrl,supabaseAnonKey)

const check = async ()=>{
 const { data: reportData, error: reportError } = await supabase
  .from('inventory_report')
  .select('*')
  .eq('inventory_request_id','REQ-PK-1774288254827')
 console.log('inventory_report', reportData, reportError)
 const { data: docData, error: docError } = await supabase
  .from('digital_document')
  .select('*')
  .eq('reference_no','REQ-PK-1774288254827')
 console.log('digital_document', docData, docError)
}
check()
