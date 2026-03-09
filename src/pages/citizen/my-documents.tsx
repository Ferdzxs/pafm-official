import React, { useEffect, useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Document = {
  document_id: string;
  document_type: string;
  status: string;
  file_url: string;
  created_at: string;
};

export default function MyDocuments() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    const { data } = await supabase
      .from("barangay_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setDocs(data);

    setLoading(false);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="animate-spin text-blue-400" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">My Documents</h1>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/40 text-slate-400">
              <th className="text-left p-4">Document ID</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">File</th>
            </tr>
          </thead>

          <tbody>
            {docs.map((d) => (
              <tr
                key={d.document_id}
                className="border-t border-slate-700/30 hover:bg-white/5"
              >
                <td className="p-4 text-white font-mono">{d.document_id}</td>

                <td className="p-4 text-slate-300 flex gap-2 items-center">
                  <FileText size={14} />
                  {d.document_type}
                </td>

                <td className="p-4 text-slate-400">
                  {new Date(d.created_at).toLocaleDateString()}
                </td>

                <td className="p-4 text-yellow-400">{d.status}</td>

                <td className="p-4">
                  {d.file_url ? (
                    <a
                      href={d.file_url}
                      target="_blank"
                      className="text-blue-400 flex items-center gap-1"
                    >
                      <Download size={14} />
                      Download
                    </a>
                  ) : (
                    <span className="text-slate-500">Not Available</span>
                  )}
                </td>
              </tr>
            ))}

            {docs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-10 text-slate-500">
                  No documents issued yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
