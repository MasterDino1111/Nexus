
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Camera, X, Check, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function CreateGroupDialog({ open, onOpenChange, onCreated }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarData, setAvatarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    loadUsers();
  }, [open]);

  const loadUsers = async () => {
    try {
      const [me, allUsers] = await Promise.all([
        base44.auth.me(),
        base44.entities.User.list(),
      ]);
      setCurrentUser(me);
      setUsers(allUsers.filter(u => u.id !== me.id));
    } catch {}
  };

  const toggleUser = (userId) => {
    setSelected(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAvatar = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
      setAvatarData(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length < 1 || !currentUser) return;
    setLoading(true);
    const chat = await base44.entities.Chat.create({
      participants: [currentUser.id, ...selected],
      chat_name: groupName.trim(),
      chat_avatar: avatarData || "",
      is_group: true,
      last_message: "",
      last_message_time: new Date().toISOString(),
    });
    setLoading(false);
    // reset
    setGroupName("");
    setSelected([]);
    setAvatarPreview(null);
    setAvatarData(null);
    onOpenChange(false);
    onCreated?.(chat);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-primary" /> Gruppe erstellen
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => avatarRef.current?.click()}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden group relative"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera size={26} className="text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera size={18} className="text-white" />
              </div>
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleAvatar(e.target.files?.[0])} />
            <p className="text-xs text-muted-foreground">Gruppenbild auswählen</p>
          </div>

          {/* Group name */}
          <input
            type="text"
            placeholder="Gruppenname *"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
          />

          {/* User selection */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Teilnehmer auswählen ({selected.length} ausgewählt)
            </p>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Keine anderen Nutzer gefunden</p>
              ) : (
                users.map(u => {
                  const isSelected = selected.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isSelected ? "bg-primary/15 border border-primary/30" : "hover:bg-secondary"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                        {(u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{u.full_name || "Unbekannt"}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                      {isSelected && <Check size={16} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selected.length < 1 || loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-30 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Erstelle...</> : <><Users size={15} /> Gruppe erstellen</>}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


