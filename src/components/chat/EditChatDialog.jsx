
import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Loader2 } from "lucide-react";

export default function EditChatDialog({ open, onOpenChange, chat, onUpdated }) {
  const [name, setName] = useState(chat?.chat_name || "");
  const [phone, setPhone] = useState(chat?.contact_phone || "");
  const [avatarPreview, setAvatarPreview] = useState(chat?.chat_avatar || null);
  const [avatarData, setAvatarData] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // Sync when chat changes
  useEffect(() => {
    setName(chat?.chat_name || "");
    setPhone(chat?.contact_phone || "");
    setAvatarPreview(chat?.chat_avatar || null);
    setAvatarData(null);
  }, [chat?.id, open]);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
      setAvatarData(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim() || !chat) return;
    setSaving(true);
    const updated = await base44.entities.Chat.update(chat.id, {
      chat_name: name.trim(),
      contact_phone: phone.trim(),
      ...(avatarData ? { chat_avatar: avatarData } : {}),
    });
    setSaving(false);
    onUpdated?.(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Chat bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 pt-2">
          {/* Avatar picker */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden group"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {(name || "?")[0].toUpperCase()}
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Chat-Name"
            onKeyDown={e => e.key === "Enter" && handleSave()}
            className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
          />

          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Telefonnummer (für Anrufe)"
            className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
          />

          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Speichern...</> : "Speichern"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


