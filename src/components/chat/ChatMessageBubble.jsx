import React, { memo } from 'react';

function ChatMessageBubble({ message, currentUserId, isAdmin }) {
  const isMe = message.senderAuthUserId === currentUserId;
  const fromAdmin = message.isAdministration || message.senderDisplayName === 'Administration';
  const time = new Date(message.sentAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
      {!isMe && fromAdmin && (
        <span className="mb-1 rounded-full bg-violet-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200">
          Administration
        </span>
      )}
      {isMe && isAdmin && (
        <span className="mb-1 rounded-full bg-violet-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200">
          Administration
        </span>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isMe
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
            : 'border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] text-[var(--mh-text)]'
        }`}
      >
        <p className="leading-relaxed">{message.content}</p>
        <span className={`mt-1 block text-[10px] ${isMe ? 'text-indigo-100' : 'text-[var(--mh-text-muted)]'}`}>
          {time}
        </span>
      </div>
    </div>
  );
}

export default memo(ChatMessageBubble);
