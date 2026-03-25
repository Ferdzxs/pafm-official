import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, ClipboardList, CheckSquare, Microscope, FileText, ArrowRight } from 'lucide-react'

const MOCK_ASSETS = [
 { id: 'ASSET-001', name: 'City Hall Generator', location: 'City Hall', status: 'Operational', condition: 'Good' },
 { id: 'ASSET-002', name: 'Park Lighting (East Park)', location: 'East Park', status: 'Needs Repair', condition: 'Fair' },
 { id: 'ASSET-003', name: 'Cemetery Mower', location: 'Cemetery Grounds', status: 'In Use', condition: 'Good' },
 { id: 'ASSET-004', name: 'Barangay Hall Tables', location: 'Barangay Hall', status: 'Operational', condition: 'Fair' },
]

const MOCK_INSPECTIONS = [
 { id: 'INSP-001', asset: 'Park Lighting (East Park)', due: '2024-03-15', status: 'Pending' },
 { id: 'INSP-002', asset: 'Cemetery Mower', due: '2024-03-21', status: 'In Progress' },
 { id: 'INSP-003', asset: 'City Hall Generator', due: '2024-04-01', status: 'Pending' },
]

const ROLE_REQUEST_PATH: Record<string, string | undefined> = {
 cemetery_office: '/burial/asset-requests',
 parks_admin: '/parks/asset-requests',
 punong_barangay: '/barangay/pb/asset-requests',
}

export default function AssetInventoryPage() {
 const navigate = useNavigate()
 const role = useRole()

 const header = useMemo(() => {
 switch (role) {
  case 'cgsd_management':
  return {
   title: 'Inventory & Asset Management',
   description: 'View and manage all city-owned assets. Approve requests, track inspections, and generate reports.',
  }
  case 'famcd':
  return {
   title: 'Asset Inspection & Submission',
   description: 'Track assets that need inspection and submit your inspection findings for approval.',
  }
  default:
  return {
   title: 'Asset Inventory',
   description: 'This module provides read-only information about city assets. Use Asset Requests to request new items or changes.',
  }
 }
 }, [role])

 const stats = useMemo(() => {
 const total = MOCK_ASSETS.length
 const needsRepair = MOCK_ASSETS.filter((a) => a.status.toLowerCase().includes('needs')).length
 const good = MOCK_ASSETS.filter((a) => a.condition === 'Good').length
 return { total, needsRepair, good }
 }, [])

 const requestPath = role ? ROLE_REQUEST_PATH[role] : undefined

 return (
 <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
  <div>
   <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{header.title}</h1>
   <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{header.description}</p>
  </div>
  {role === 'cgsd_management' && (
   <Button onClick={() => navigate('/assets/requests')} className="inline-flex items-center gap-2">
   <Package size={16} /> Review Requests
   </Button>
  )}
  {role === 'famcd' && (
   <Button onClick={() => navigate('/assets/submissions')} className="inline-flex items-center gap-2">
   <FileText size={16} /> View Submissions
   </Button>
  )}
  {requestPath && role && role !== 'cgsd_management' && role !== 'famcd' && (
   <Button onClick={() => navigate(requestPath)} className="inline-flex items-center gap-2">
   <Package size={16} /> Go to Asset Requests
   </Button>
  )}
  </div>

  {role === 'cgsd_management' && (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
   <Card>
   <CardHeader>
    <CardTitle className="text-sm">Total Assets</CardTitle>
   </CardHeader>
   <CardContent>
    <div className="text-3xl font-bold">{stats.total}</div>
    <div className="text-xs text-muted-foreground">All registered city-owned assets</div>
   </CardContent>
   </Card>

   <Card>
   <CardHeader>
    <CardTitle className="text-sm">Needs Repair</CardTitle>
   </CardHeader>
   <CardContent>
    <div className="text-3xl font-bold">{stats.needsRepair}</div>
    <div className="text-xs text-muted-foreground">Assets flagged for maintenance</div>
   </CardContent>
   </Card>

   <Card>
   <CardHeader>
    <CardTitle className="text-sm">Good Condition</CardTitle>
   </CardHeader>
   <CardContent>
    <div className="text-3xl font-bold">{stats.good}</div>
    <div className="text-xs text-muted-foreground">Assets in good working order</div>
   </CardContent>
   </Card>
  </div>
  )}

  {role === 'famcd' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
   <Card className="p-4">
   <div className="flex items-center justify-between">
    <div>
    <h2 className="text-lg font-semibold">Upcoming Inspections</h2>
    <p className="text-xs text-muted-foreground">Assets that require inspection or status updates.</p>
    </div>
    <Badge variant="secondary">{MOCK_INSPECTIONS.length} items</Badge>
   </div>

   <div className="mt-4 space-y-3">
    {MOCK_INSPECTIONS.map((insp) => (
    <div key={insp.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
     <div>
     <p className="font-medium">{insp.asset}</p>
     <p className="text-xs text-muted-foreground">Due: {insp.due}</p>
     </div>
     <div className="flex items-center gap-2">
     <Badge variant={insp.status === 'Pending' ? 'warning' : insp.status === 'In Progress' ? 'secondary' : 'success'}>
      {insp.status}
     </Badge>
     <Button size="sm" variant="outline" onClick={() => navigate('/assets/submissions')}>
      <Microscope size={14} /> Submit
     </Button>
     </div>
    </div>
    ))}
   </div>
   </Card>

   <Card className="p-4">
   <div className="flex items-center justify-between">
    <div>
    <h2 className="text-lg font-semibold">Quick Actions</h2>
    <p className="text-xs text-muted-foreground">Common tasks for inspection teams.</p>
    </div>
    <Badge variant="secondary">3</Badge>
   </div>

   <div className="mt-4 grid gap-2">
    <Button variant="outline" onClick={() => navigate('/assets/inspections')}>
    <Microscope size={16} /> Start Inspection
    </Button>
    <Button variant="outline" onClick={() => navigate('/assets/reports')}>
    <FileText size={16} /> View Reports
    </Button>
    <Button variant="outline" onClick={() => navigate('/assets/requests')}>
    <ClipboardList size={16} /> Track Requests
    </Button>
   </div>
   </Card>
  </div>
  )}

  {role === 'cgsd_management' && (
  <div className="bg-white dark:bg-[#1a1c23] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
   <div className="overflow-x-auto">
   <table className="w-full text-left text-sm whitespace-nowrap">
    <thead>
    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
     <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Asset ID</th>
     <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Name</th>
     <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Location</th>
     <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Status</th>
     <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Condition</th>
     <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400 text-right">Actions</th>
    </tr>
    </thead>
    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
    {MOCK_ASSETS.map((asset) => (
     <tr key={asset.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
     <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">{asset.id}</td>
     <td className="px-6 py-4 text-gray-900 dark:text-white">{asset.name}</td>
     <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{asset.location}</td>
     <td className="px-6 py-4">
      <Badge variant={asset.status === 'Needs Repair' ? 'destructive' : 'secondary'}>
      {asset.status}
      </Badge>
     </td>
     <td className="px-6 py-4">{asset.condition}</td>
     <td className="px-6 py-4 text-right">
      <Button size="sm" variant="outline" onClick={() => navigate('/assets/inspections')}>
      <Microscope size={14} /> Inspect
      </Button>
     </td>
     </tr>
    ))}
    </tbody>
   </table>
   </div>
  </div>
  )}

  {role && role !== 'cgsd_management' && role !== 'famcd' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
   <Card className="p-6">
   <div className="flex items-start justify-between">
    <div>
    <h2 className="text-lg font-semibold">Need to Request a New Asset?</h2>
    <p className="text-xs text-muted-foreground mt-1">Submit a request and track its approval status in the Asset Requests module.</p>
    </div>
    <Package className="text-muted-foreground" size={24} />
   </div>
   <div className="mt-6">
    {requestPath ? (
    <Button onClick={() => navigate(requestPath)} className="inline-flex items-center gap-2">
     <ArrowRight size={16} /> Go to Asset Requests
    </Button>
    ) : (
    <p className="text-sm text-muted-foreground">No asset request page assigned for your role.</p>
    )}
   </div>
   </Card>

   <Card className="p-6">
   <div className="flex items-start justify-between">
    <div>
    <h2 className="text-lg font-semibold">Asset Inventory View</h2>
    <p className="text-xs text-muted-foreground mt-1">This is a read-only view of current asset data for transparency and planning.</p>
    </div>
    <ClipboardList className="text-muted-foreground" size={24} />
   </div>
   <div className="mt-6">
    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
    <li>Check existing asset status</li>
    <li>Submit a request when an asset needs repair or replacement</li>
    <li>Track request progress via the Asset Requests page</li>
    </ol>
   </div>
   </Card>
  </div>
  )}
 </div>
 )
}
