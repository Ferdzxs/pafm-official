import React, { useState, useEffect } from 'react'
import {
  Loader2, PenTool, CheckCircle2, FileCheck, ShieldCheck,
  Eye, Stamp, Download, Building2, Calendar
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DialogPremiumInner, premiumDialogShellClasses } from '@/components/ui/dialog-premium'

interface SigningApp {
  application_id: string
  application_status: string
  submission_date: string
  person: { full_name: string; person_id: string }
  deceased: { full_name: string; date_of_death: string; death_certificate_no: string | null }
}

interface IssuedPermit {
  document_id: string
  reference_no: string
  date_created: string
  status: string
}

export default function ApprovalsSigning() {
  const [queue, setQueue] = useState<SigningApp[]>([])
  const [issued, setIssued] = useState<IssuedPermit[]>([])
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState<string | null>(null)
  const [selected, setSelected] = useState<SigningApp | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [printData, setPrintData] = useState<Record<string, any> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [issuedPage, setIssuedPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [{ data: queueData, error: qErr }, { data: issuedData }] = await Promise.all([
        supabase
          .from('online_burial_application')
          .select(`
            application_id, application_status, submission_date,
            person:person_id(full_name, person_id),
            deceased:deceased_id(full_name, date_of_death, death_certificate_no)
          `)
          .eq('application_status', 'verified')
          .order('submission_date', { ascending: true }),
        supabase
          .from('digital_document')
          .select('document_id, reference_no, date_created, status')
          .eq('document_type', 'burial_permit')
          .order('date_created', { ascending: false }),
      ])
      if (qErr) throw qErr
      setQueue((queueData as unknown as SigningApp[]) || [])
      setIssued(issuedData || [])
    } catch (err: unknown) {
      toast.error('Failed to load signing queue: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  async function handleSign(app: SigningApp) {
    setSigning(app.application_id)
    try {
      // 1. Generate and record the digital burial permit
      const serial = app.application_id.split('-')[1] ?? Math.random().toString(36).substr(2, 6).toUpperCase()
      const permitId = `DDOC-${serial}-${Date.now().toString().substr(-4)}`
      const permitRefNo = `BP-${new Date().getFullYear()}-${serial}`

      // 2. Approve the application and link the permit
      const { error: appError } = await supabase
        .from('online_burial_application')
        .update({ application_status: 'approved', permit_document_id: permitId })
        .eq('application_id', app.application_id)
      if (appError) throw appError

      const { error: docError } = await supabase
        .from('digital_document')
        .insert([{
          document_id: permitId,
          document_type: 'burial_permit',
          reference_no: permitRefNo,
          date_created: new Date().toISOString().split('T')[0],
          person_id: app.person?.person_id,
          status: 'active',
          file_url: `https://storage.bpm.qcgov.ph/permits/${permitRefNo}.pdf`,
        }])
      if (docError) throw docError

      toast.success(`✅ Burial Permit ${permitRefNo} digitally signed and issued.`)
      setSelected(null)
      fetchData()
    } catch (err: unknown) {
      toast.error('Signing failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSigning(null)
    }
  }

  async function handlePrint(doc: IssuedPermit) {
    const loadingToast = toast.loading('Readying permit for print...')
    try {
      // Fetch linked application details needed for the permit
      let { data: obApp } = await supabase
        .from('online_burial_application')
        .select(`
           or_number,
           person:person_id(full_name),
           deceased:deceased_id(full_name, date_of_death, cause_of_death)
        `)
        .eq('permit_document_id', doc.document_id)
        .single()
      
      // Fallback for older permits without permit_document_id
      if (!obApp && doc.reference_no) {
        const serialParts = doc.reference_no.split('-')
        const serial = serialParts.length >= 3 ? serialParts[2] : null
        
        if (serial) {
            const { data: fallbackApp } = await supabase
              .from('online_burial_application')
              .select(`
                or_number,
                person:person_id(full_name),
                deceased:deceased_id(full_name, date_of_death, cause_of_death)
              `)
              .ilike('application_id', `%${serial}%`)
              .limit(1)
            
            if (fallbackApp && fallbackApp.length > 0) {
                obApp = fallbackApp[0]
            }
        }
      }

      if (!obApp) throw new Error('Linked details not found (might be an older permit).')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const personData = obApp.person as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deceasedData = obApp.deceased as any

      const applicant = Array.isArray(personData) ? personData[0]?.full_name : personData?.full_name
      const deceased = Array.isArray(deceasedData) ? deceasedData[0] : deceasedData
      
      const validUntilDate = new Date(doc.date_created)
      validUntilDate.setFullYear(validUntilDate.getFullYear() + 5)

      setPrintData({
         ...doc,
         deceasedName: deceased?.full_name || '—',
         dateOfDeath: deceased?.date_of_death || '—',
         causeOfDeath: deceased?.cause_of_death || '—',
         applicantName: applicant || '—',
         orNumber: obApp.or_number || 'Pending / N/A',
         validUntil: validUntilDate.toISOString().split('T')[0]
      })

      // Allow state to render the hidden print div, then trigger browser print
      setTimeout(() => {
        window.print()
      }, 500)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      toast.dismiss(loadingToast)
    }
  }

  const totalQueuePages = Math.ceil(queue.length / itemsPerPage)
  const queueItems = queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalIssuedPages = Math.ceil(issued.length / itemsPerPage)
  const issuedItems = issued.slice((issuedPage - 1) * itemsPerPage, issuedPage * itemsPerPage)

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <PenTool size={22} className="text-purple-400" /> Final Approval & Signing
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Authorized digital sign-off and burial permit issuance</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500/10 border-purple-500/20 text-purple-400 border font-bold text-xs self-start sm:self-auto">
            <ShieldCheck size={12} className="mr-1" /> CCRD Authorized Officer
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Awaiting Signature', value: queue.length, color: 'text-amber-400' },
          { label: 'Permits Issued (All Time)', value: issued.length, color: 'text-emerald-400' },
          { label: 'Issued Today', value: issued.filter(p => p.date_created === new Date().toISOString().split('T')[0]).length, color: 'text-blue-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Signing Queue */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Stamp size={14} className="text-amber-400" /> Pending Signatures ({queue.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-purple-500" size={32} />
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl border border-dashed border-slate-800">
            <CheckCircle2 className="mx-auto mb-4 text-emerald-500/20" size={64} />
            <h3 className="text-base font-bold text-white">All Clear</h3>
            <p className="text-slate-500 mt-2 text-sm">No applications currently awaiting final signature.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {queueItems.map(app => (
                <Card key={app.application_id} className="bg-slate-900/40 border-slate-800/50 overflow-hidden card-hover">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Info */}
                      <div className="flex-1 p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-400">
                            {app.application_id}
                          </Badge>
                          {/* Indigent status checked via SSDD — no is_indigent column in DB */}

                          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 border text-[9px]">
                            <FileCheck size={9} className="mr-1" /> Verified
                          </Badge>
                        </div>

                        <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-1">{app.deceased?.full_name}</h3>
                        <p className="text-sm text-slate-500 mb-4">Applicant: <span className="text-slate-300">{app.person?.full_name}</span></p>

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar size={13} className="text-slate-600" />
                            DOD: {app.deceased?.date_of_death ? new Date(app.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Building2 size={13} className="text-slate-600" />
                            Cert: <span className="font-mono text-blue-400 ml-0.5">{app.deceased?.death_certificate_no ?? 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <FileCheck size={13} className="text-emerald-500" /> Docs Validated
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Stamp size={13} className="text-indigo-500" /> Data Verified
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="w-full md:w-56 bg-purple-500/5 border-t md:border-t-0 md:border-l border-slate-800/50 p-6 flex flex-col items-center justify-center gap-3">
                        <button
                          className="w-full btn-secondary text-xs py-2"
                          onClick={() => setSelected(app)}
                        >
                          <Eye size={14} className="mr-2" /> Review
                        </button>
                        <button
                          onClick={() => handleSign(app)}
                          disabled={signing === app.application_id}
                          className="w-full py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-purple-500/20 transition-all disabled:opacity-60"
                        >
                          {signing === app.application_id ? (
                            <Loader2 size={14} className="animate-spin mx-auto" />
                          ) : (
                            '✍ Sign & Issue Permit'
                          )}
                        </button>
                        <p className="text-[9px] text-slate-600 text-center italic">Digital sig appended to OR & permit.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalQueuePages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      {/* Issued Permits Log */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" /> Issued Burial Permits ({issued.length})
        </h2>
        <div className="glass rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/3">
                  {['Document ID', 'Permit / OR #', 'Date Issued', 'Status', 'Download'].map(h => (
                    <th key={h} className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issuedItems.map(doc => (
                  <tr key={doc.document_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{doc.document_id}</td>
                    <td className="px-4 py-3 text-xs font-mono text-blue-400 font-bold">{doc.reference_no}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {doc.date_created ? new Date(doc.date_created).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border text-[9px]">{doc.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => handlePrint(doc)}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="Print Permit"
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {issued.length === 0 && !loading && (
              <div className="py-12 text-center">
                <p className="text-slate-600 text-sm">No permits issued yet.</p>
              </div>
            )}
          </div>
        </div>
        {issued.length > itemsPerPage && (
          <Pagination currentPage={issuedPage} totalPages={totalIssuedPages} onPageChange={setIssuedPage} />
        )}
      </div>

      {/* Review Modal — premium card (centered via shared Dialog) */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className={premiumDialogShellClasses('max-w-lg')}>
          <DialogPremiumInner className="flex flex-col p-0">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-6 pb-4 pt-2 pr-12">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <PenTool size={24} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Final Review</h2>
                  <p className="font-mono text-xs text-muted-foreground">{selected?.application_id}</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 px-6 py-5">
              {selected &&
                [
                  ['Deceased', selected.deceased?.full_name ?? '—'],
                  [
                    'Date of Death',
                    selected.deceased?.date_of_death
                      ? new Date(selected.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'long' })
                      : '—',
                  ],
                  ['Death Certificate #', selected.deceased?.death_certificate_no ?? 'Not on file'],
                  ['Applicant / Relative', selected.person?.full_name ?? '—'],
                  [
                    'Submitted',
                    new Date(selected.submission_date).toLocaleDateString('en-PH', { dateStyle: 'long' }),
                  ],
                  ['Case Type', 'Burial Application'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-3 border-b border-border/50 py-2.5 last:border-0"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
                    <span className="max-w-[58%] text-right text-sm font-medium text-foreground">{value}</span>
                  </div>
                ))}

              <div className="admin-box mt-4 border-purple-500/20 bg-muted/20">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Workflow
                </p>
                {[
                  { icon: FileCheck, label: 'Documents Validated', done: true },
                  { icon: Stamp, label: 'Data Verified', done: true },
                  { icon: PenTool, label: 'Awaiting Signature', done: false },
                ].map(({ icon: Icon, label, done }) => (
                  <div key={label} className="flex items-center gap-2 py-1.5">
                    <Icon size={14} className={done ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'} />
                    <span
                      className={`text-xs font-medium ${done ? 'text-emerald-700 line-through decoration-emerald-600/50 dark:text-emerald-400' : 'font-bold text-purple-700 dark:text-purple-300'}`}
                    >
                      {label}
                    </span>
                    {done && <CheckCircle2 size={12} className="ml-auto text-emerald-600 dark:text-emerald-400" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 border-t border-border/60 bg-muted/20 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-secondary flex-1 justify-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => selected && handleSign(selected)}
                disabled={!selected || signing === selected.application_id}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-purple-500/25 transition-all hover:opacity-95 disabled:opacity-50 dark:from-purple-500 dark:to-indigo-500"
              >
                {selected && signing === selected.application_id ? (
                  <Loader2 size={14} className="mx-auto animate-spin" />
                ) : (
                  '✍ Sign & Issue Permit'
                )}
              </button>
            </div>
          </DialogPremiumInner>
        </DialogContent>
      </Dialog>

      {/* Hidden layout specifically for printing */}
      {printData && (
        <div className="hidden print:block fixed inset-0 z-9999 bg-white text-black w-full h-full p-12 custom-print-wrapper">
          <style>{`
            @media print {
              @page { margin: 0; size: letter; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
              nav, aside, header { display: none !important; }
            }
          `}</style>
          
          <div className="max-w-3xl mx-auto border-4 border-double border-slate-900 p-10 h-full relative">
            <div className="text-center mb-10 pb-6 border-b-2 border-slate-900">
              <h1 className="text-xl font-bold uppercase tracking-widest text-slate-800">Republic of the Philippines</h1>
              <h2 className="text-lg font-semibold uppercase tracking-widest text-slate-700 mt-1">Quezon City</h2>
              <h3 className="text-3xl font-black mt-6 mb-2 text-slate-900 uppercase tracking-tighter">Civil Registration Office</h3>
              <div className="inline-block bg-slate-900 text-white px-6 py-2 text-xl font-bold tracking-widest uppercase">
                Burial Permit
              </div>
            </div>

            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Permit Number</p>
                <p className="text-2xl font-mono font-bold text-slate-900">{printData.reference_no}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Date Issued</p>
                <p className="text-lg font-bold text-slate-900">{new Date(printData.date_created).toLocaleDateString('en-PH', { dateStyle: 'long' })}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Name of Deceased</p>
                <p className="text-2xl font-bold uppercase text-slate-900 border-b border-slate-300 pb-1">{printData.deceasedName}</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Date of Death</p>
                  <p className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-1">
                    {printData.dateOfDeath !== '—' ? new Date(printData.dateOfDeath).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Cause of Death</p>
                  <p className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-1">{printData.causeOfDeath}</p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Applicant / Next of Kin</p>
                <p className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-1">{printData.applicantName}</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Official Receipt (OR) Number</p>
                  <p className="text-lg font-mono font-bold text-slate-900 border-b border-slate-300 pb-1">{printData.orNumber}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Valid Until</p>
                  <p className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-1">
                    {new Date(printData.validUntil).toLocaleDateString('en-PH', { dateStyle: 'long' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-10 right-10 w-64 text-center">
              <div className="border-b border-slate-900 pb-2 mb-2">
                {/* Space for signature */}
                <div className="h-16 flex items-center justify-center">
                  <span className="font-mono text-purple-900 italic transform -rotate-2 opacity-50">DIGITALLY SIGNED</span>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-900 uppercase">Authorized Officer</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Civil Registration Office</p>
            </div>
            
            <div className="absolute bottom-10 left-10 w-32 h-32 border-[6px] border-double border-red-900/20 rounded-full flex items-center justify-center transform -rotate-12 opacity-80">
                <div className="text-center">
                    <p className="text-[10px] font-black text-red-900/40 uppercase tracking-widest mt-1">OFFICIAL</p>
                    <p className="text-[10px] font-black text-red-900/40 uppercase tracking-widest">SEAL</p>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}