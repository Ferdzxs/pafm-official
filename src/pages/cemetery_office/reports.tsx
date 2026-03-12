import React, { useState, useEffect } from 'react'
import { FileBarChart, Download, Calendar, Filter, Loader2, PieChart as PieChartIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

export default function CemeteryReports() {
    const [loading, setLoading] = useState(true)
    const [reportData, setReportData] = useState<{
        nicheStatus: any[]
        applicationStatus: any[]
    }>({
        nicheStatus: [],
        applicationStatus: [],
    })
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
        end: new Date().toISOString().split('T')[0]
    })
    const [showDatePicker, setShowDatePicker] = useState(false)

    useEffect(() => {
        fetchReportData()
    }, [dateRange])

    async function fetchReportData() {
        setLoading(true)
        try {
            const [niches, apps] = await Promise.all([
                supabase.from('niche_record').select('status'),
                supabase.from('online_burial_application')
                    .select('application_status')
                    .gte('submission_date', dateRange.start)
                    .lte('submission_date', dateRange.end)
            ])

            const nicheCounts = niches.data?.reduce((acc: any, curr: any) => {
                acc[curr.status] = (acc[curr.status] || 0) + 1
                return acc
            }, {}) || {}

            const appCounts = apps.data?.reduce((acc: any, curr: any) => {
                acc[curr.application_status] = (acc[curr.application_status] || 0) + 1
                return acc
            }, {}) || {}

            setReportData({
                nicheStatus: Object.entries(nicheCounts).map(([name, value]) => ({ name, value })),
                applicationStatus: Object.entries(appCounts).map(([name, value]) => ({ name, value })),
            })
        } catch (error) {
            toast.error('Failed to generate report data: ' + (error as any).message)
        } finally {
            setLoading(false)
        }
    }

    function exportReport() {
        const content = `
Quezon City Cemetery Operational Report
Period: ${dateRange.start} to ${dateRange.end}

Niche Occupancy Distribution:
${reportData.nicheStatus.map(s => `${s.name}: ${s.value}`).join('\n')}

Application Status Summary:
${reportData.applicationStatus.map(s => `${s.name}: ${s.value}`).join('\n')}

Report Generated: ${new Date().toLocaleString()}
        `.trim()

        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `cemetery_report_${dateRange.start}_to_${dateRange.end}.txt`
        link.click()
        toast.success('Report exported as TXT')
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold">Operational Reports</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Real-time cemetery analytics and data exports</p>
                </div>
                <div className="flex gap-2 relative">
                    <div className="flex items-center gap-2">
                        {showDatePicker && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                                <input 
                                    type="date" 
                                    className="input-field py-1.5 px-3 text-xs w-36" 
                                    value={dateRange.start} 
                                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} 
                                />
                                <span className="text-slate-500">to</span>
                                <input 
                                    type="date" 
                                    className="input-field py-1.5 px-3 text-xs w-36" 
                                    value={dateRange.end} 
                                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} 
                                />
                            </div>
                        )}
                        <button 
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`btn-secondary flex items-center gap-2 ${showDatePicker ? 'border-blue-500/50 bg-blue-500/10' : ''}`}
                        >
                            <Calendar size={15} /> {showDatePicker ? 'Close' : 'Date Range'}
                        </button>
                    </div>
                    <button 
                        onClick={exportReport}
                        className="gradient-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                    >
                        <Download size={15} /> Export Report
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-40 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="font-medium">Aggregating real-time data...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass p-6 rounded-2xl border border-white/5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <PieChartIcon size={16} className="text-blue-400" /> Niche Occupancy Distribution
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={reportData.nicheStatus}
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {reportData.nicheStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {reportData.nicheStatus.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2 text-xs">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                                    <span className="capitalize text-slate-400">{entry.name} ({entry.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass p-6 rounded-2xl border border-white/5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <FileBarChart size={16} className="text-amber-400" /> Application Status Summary
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reportData.applicationStatus}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px' }} />
                                    <Bar dataKey="value" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
