import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '../.env')
let url = ''
let key = ''

if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8')
    const lines = envFile.split('\n')
    lines.forEach(line => {
        if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim()
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim()
    })
}

const supabase = createClient(url, key)

async function checkData() {
    console.log('Fetching inventory requests...')
    const { data, error } = await supabase
        .from('inventory_request')
        .select(`
            inventory_request_id,
            inventory_scope,
            status,
            property_id,
            property (
                property_name,
                location,
                asset_condition,
                acquisition_date
            )
        `)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log(`Found ${data.length} requests in total`)
    console.table(data.map(d => ({
        id: d.inventory_request_id,
        status: d.status,
        scope: d.inventory_scope,
        propertyName: Array.isArray(d.property) ? d.property[0]?.property_name : (d.property as any)?.property_name || 'NULL'
    })))

    console.log('\n--- TESTING UPDATE ---')
    const updateRes = await supabase.from('inventory_request').update({ status: 'rejected' }).eq('inventory_request_id', 'INR-1773136760845').select()
    console.log('Update Result:', updateRes.data)
    console.log('Update Error:', updateRes.error)
}

checkData()
