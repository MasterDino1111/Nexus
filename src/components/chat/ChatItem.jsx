
import React from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { Clock } from "lucide-react";

export default function ChatItem({ chat, currentUserId, unread = 0 }) {
  const isPending = chat.status === "pending" && chat.created_by === currentUserId;

  return (
    <Link
      to={`/chat/${chat.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors rounded-xl"
    >
      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {chat.chat_avatar ? (
          <img src={chat.chat_avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-primary">
            {(chat.chat_name || "?")[0].toUpperCase()}
          </span>
        )}
        {isPending && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
            <Clock size={14} className="text-amber-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm truncate ${unread ? "font-bold" : "font-semibold"}`}>{chat.chat_name || "Chat"}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {isPending && (
              <span className="text-[9px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">Ausstehend</span>
            )}
            {chat.last_message_time && (
              <span className="text-[10px] text-muted-foreground">
                {moment(chat.last_message_time).fromNow()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-xs truncate ${unread ? "text-foreground" : "text-muted-foreground"}`}>
            {isPending
              ? `Einladung an ${chat.contact_email}`
              : (chat.last_message || "Noch keine Nachrichten")}
          </p>
          {unread > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}


