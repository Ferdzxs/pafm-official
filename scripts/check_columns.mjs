import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, key)

const table = 'ocular_inspection'

const { data, error } = await supabase
  .from('information_schema.columns')
  .select('column_name')
  .eq('table_name', table)
  .order('ordinal_position', { ascending: true })

if (error) {
  console.error('error fetching columns:', error)
  process.exit(1)
}

console.log(`${table} columns:`)
console.log(data.map((d) => d.column_name).join(', '))
