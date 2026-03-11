import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectItem } from '@/components/ui/select'
import { Search, Filter, Upload, FileText, Calendar, CheckCircle, Eye, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

type ReportRow = {
  inventory_report_id: string
  approval_status: string
  preparation_date: string | null
  digital_report_url: string | null
  inventory_request?: {
    inventory_scope?: string
  }
  government_office?: {
    office_name?: string
  }
}

type SubmissionRecord = {
  document_id: string
  document_type: string
  reference_no: string
  status: string
  date_created: string
  file_url: string | null
}

const DESTINATIONS = [
  { label: 'Commission on Audit (COA)', value: 'coa' },
  { label: 'City Accounting Office', value: 'city_accounting' },
  { label: 'Office of the City Mayor', value: 'city_mayor' },
]

export default function Submissions() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [reports, setReports] = useState<ReportRow[]>([])
  const [submissions, setSubmissions] = useState<Record<string, SubmissionRecord>>({})
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null)
  const [destination, setDestination] = useState(DESTINATIONS[0].value)
  const [comment, setComment] = useState('')

  useEffect(() => {
    reload()
  }, [])

  const reload = async () => {
    setIsLoading(true)

    const [reportRes, docRes] = await Promise.all([
      supabase
        .from('inventory_report')
        .select(`
          *,
          government_office ( office_name ),
          inventory_request ( inventory_scope )
        `)
        .order('preparation_date', { ascending: false }),
      supabase
        .from('digital_document')
        .select('*')
        .like('document_type', 'inventory_report_submission%')
    ])

    if (reportRes.error) {
      console.error('Error fetching reports:', reportRes.error)
      toast.error('Failed to load submissions list.')
      setIsLoading(false)
      return
    }

    if (docRes.error) {
      console.error('Error fetching submissions:', docRes.error)
      toast.error('Failed to load submissions list.')
      setIsLoading(false)
      return
    }

    const submissionMap: Record<string, SubmissionRecord> = {}
    ;(docRes.data || []).forEach((doc: any) => {
      submissionMap[doc.reference_no] = {
        document_id: doc.document_id,
        document_type: doc.document_type,
        reference_no: doc.reference_no,
        status: doc.status,
        date_created: doc.date_created,
        file_url: doc.file_url,
      }
    })

    setReports(reportRes.data || [])
    setSubmissions(submissionMap)
    setIsLoading(false)
  }

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return reports

    const q = searchTerm.trim().toLowerCase()
    return reports.filter((r) =>
      r.inventory_report_id?.toLowerCase().includes(q) ||
      r.inventory_request?.inventory_scope?.toLowerCase().includes(q)
    )
  }, [reports, searchTerm])

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge variant="success" className="text-[10px] uppercase">Approved</Badge>
      case 'pending':
        return <Badge variant="warning" className="text-[10px] uppercase">Pending</Badge>
      case 'draft':
        return <Badge variant="secondary" className="text-[10px] uppercase">Draft</Badge>
      case 'submitted':
        return <Badge variant="outline" className="text-[10px] uppercase">Submitted</Badge>
      default:
        return <Badge variant="secondary" className="text-[10px] uppercase">{status || 'Unknown'}</Badge>
    }
  }

  const getSubmissionDestination = (doc?: SubmissionRecord) => {
    if (!doc) return null
    if (doc.document_type?.includes('coa')) return 'COA'
    if (doc.document_type?.includes('city_accounting')) return 'City Accounting'
    if (doc.document_type?.includes('city_mayor')) return 'City Mayor'
    return doc.document_type
  }

  const handleSubmit = async () => {
    if (!selectedReport) return

    const reportId = selectedReport.inventory_report_id
    const existing = submissions[reportId]
    if (existing) {
      toast.error('This report has already been submitted.', { id: 'submission-already' })
      return
    }

    const toastId = toast.loading('Submitting report...')

    const documentId = `DDOC-${Date.now()}`
    const documentType = `inventory_report_submission_${destination}`
    const today = new Date().toISOString().split('T')[0]

    const { error: docError } = await supabase.from('digital_document').insert({
      document_id: documentId,
      document_type: documentType,
      reference_no: reportId,
      date_created: today,
      status: 'submitted',
      created_by_office: null,
      received_by_employee: null,
      person_id: null,
      file_url: selectedReport.digital_report_url || null
    })

    const { error: reportError } = await supabase
      .from('inventory_report')
      .update({ approval_status: 'submitted' })
      .eq('inventory_report_id', reportId)

    const error = docError || reportError
    if (error) {
      console.error('Submission error', error)
      const detail = (error as any)?.details ? ` (${(error as any).details})` : ''
      toast.error(`Failed to submit report: ${error.message ?? 'Unknown error'}${detail}`, { id: toastId })
      return
    }

    toast.success('Report submitted successfully.', { id: toastId })
    setSelectedReport(null)
    setComment('')
    setDestination(DESTINATIONS[0].value)
    reload()
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Submissions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track submission of finalized land and building inventory reports to COA, City Accounting, and the Office of the City Mayor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={reload}>
            <Filter size={16} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-6 shadow-sm border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search by report ID or scope..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-full bg-background relative z-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Report</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Prepared By</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Date</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Status</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Submitted To</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      Loading submissions...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      No reports found.
                    </td>
                  </tr>
                ) : filtered.map((item) => {
                  const submission = submissions[item.inventory_report_id]
                  const destinationLabel = getSubmissionDestination(submission)

                  return (
                    <tr key={item.inventory_report_id} className="hover:bg-accent/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-foreground">{item.inventory_report_id}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.inventory_request?.inventory_scope || 'General Inventory Report'}>
                              {item.inventory_request?.inventory_scope || 'General Inventory Report'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-foreground font-medium">{item.government_office?.office_name || 'System'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar size={14} className="shrink-0" />
                          <span>{item.preparation_date || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(item.approval_status)}</td>
                      <td className="p-4">{destinationLabel || '-'}</td>
                      <td className="p-4 text-right">
                        {submission ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (submission.file_url) {
                                window.open(submission.file_url, '_blank')
                              } else {
                                toast.error('No attached file for this submission.')
                              }
                            }}
                          >
                            <Eye size={16} className="mr-2" /> View
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(item)
                              setDestination(DESTINATIONS[0].value)
                              setComment('')
                            }}
                          >
                            <Upload size={16} className="mr-2" /> Submit
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-lg shadow-xl relative z-[101] bg-card">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Submit Inventory Report</h2>
                  <p className="text-sm text-muted-foreground mt-1">{selectedReport.inventory_report_id}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedReport(null)}>
                  <XCircle size={20} />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Send to</label>
                  <Select value={destination} onChange={(e) => setDestination(e.target.value)}>
                    {DESTINATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Notes (optional)</label>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background/50 text-sm resize-y"
                    placeholder="Add context for the recipient (e.g., comments or additional instructions)."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedReport(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  <CheckCircle size={16} className="mr-2" /> Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
