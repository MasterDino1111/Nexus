
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Languages, Loader2, X } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "Englisch" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Französisch" },
  { code: "es", label: "Spanisch" },
  { code: "it", label: "Italienisch" },
  { code: "pt", label: "Portugiesisch" },
  { code: "ru", label: "Russisch" },
  { code: "ja", label: "Japanisch" },
  { code: "zh", label: "Chinesisch" },
  { code: "ar", label: "Arabisch" },
  { code: "tr", label: "Türkisch" },
  { code: "nl", label: "Niederländisch" },
];

export default function TranslateButton({ text, label = "Übersetzen" }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const [translated, setTranslated] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTranslate = async (targetLang) => {
    setLang(targetLang);
    setLoading(true);
    setTranslated(null);
    try {
      const langLabel = LANGUAGES.find(l => l.code === targetLang)?.label || targetLang;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Übersetze den folgenden Text auf ${langLabel}. Gib NUR die Übersetzung zurück, ohne Erklärungen oder Anführungszeichen.\n\nText:\n${text}`,
      });
      setTranslated(res);
    } catch (e) {
      setTranslated("Übersetzung fehlgeschlagen.");
    }
    setLoading(false);
  };

  if (!text?.trim()) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/70 transition-colors"
      >
        <Languages size={13} /> {label}
      </button>
      {open && (
        <div className="mt-2 p-3 bg-secondary/50 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Zielsprache</p>
            <button onClick={() => { setOpen(false); setTranslated(null); }}>
              <X size={12} className="text-muted-foreground" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => handleTranslate(l.code)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  lang === l.code && translated ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Übersetze...
            </div>
          )}
          {translated && !loading && (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{translated}</p>
          )}
        </div>
      )}
    </div>
  );
}


