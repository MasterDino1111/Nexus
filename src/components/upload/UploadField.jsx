
import React from "react";
import { Upload, Loader2 } from "lucide-react";

export function Field({ label, value, onChange, placeholder, type = "text", textarea }) {
  const cls = "w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground";
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls + " resize-none"} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

export function SubmitBtn({ loading, label }) {
  return (
    <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
      {loading ? <><Loader2 size={16} className="animate-spin" /> Wird hochgeladen...</> : <><Upload size={16} /> {label}</>}
    </button>
  );
}


