import React, { useState } from 'react'
import { Package, Plus, Search, Filter, Clock, CheckCircle, XCircle } from 'lucide-react'

// Mock Data
const MOCK_REQUESTS = [
    { id: 'REQ-BR-001', item: 'Office Photocopier Ink', status: 'Pending', date: '2023-11-04', priority: 'High' },
    { id: 'REQ-BR-002', item: 'Monoblock Chairs (x20)', status: 'Approved', date: '2023-11-01', priority: 'Medium' },
    { id: 'REQ-BR-003', item: 'Barangay Hall Aircon Cleaning', status: 'Approved', date: '2023-10-25', priority: 'Low' },
]

export default function PunongBarangayAssetRequestsPage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        Asset & Resource Requests
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Submit and track maintenance or resource requests to CGSD/FAMCD for the Barangay.
                    </p>
                </div>
                <button
                    className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                    style={{ background: '#2563eb', color: '#fff' }}
                >
                    <Plus size={16} /> New Request
                </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Pending Requests', value: 2, icon: Clock, color: '#f59e0b' },
                    { label: 'Approved', value: 5, icon: CheckCircle, color: '#10b981' },
                    { label: 'Rejected', value: 0, icon: XCircle, color: '#ef4444' },
                ].map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${stat.color}15`, color: stat.color }}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{stat.value}</p>
                                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* FILTERS & SEARCH */}
            <div className="flex flex-col sm:flex-row items-center gap-3 p-2 rounded-2xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search requests..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-transparent outline-none"
                        style={{ color: 'var(--color-text-primary)' }}
                    />
                </div>
                <div className="w-px h-6 hidden sm:block" style={{ background: 'var(--color-border)' }} />
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <Filter size={16} /> Filter
                </button>
            </div>

            {/* LIST */}
            <div className="bg-white dark:bg-[#1a1c23] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Request ID</th>
                                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Item / Service</th>
                                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Date Requested</th>
                                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Priority</th>
                                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {MOCK_REQUESTS.map((req, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                    <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">{req.id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{req.item}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{req.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${req.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                                                req.priority === 'Medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' :
                                                    'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                            }`}>
                                            {req.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{
                                            background: req.status === 'Approved' ? 'rgba(16,185,129,0.1)' : req.status === 'Pending' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                                            color: req.status === 'Approved' ? '#10b981' : req.status === 'Pending' ? '#f59e0b' : '#3b82f6'
                                        }}>
                                            {req.status}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}