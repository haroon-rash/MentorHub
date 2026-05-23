import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as signalR from '@microsoft/signalr';
import { toast } from 'sonner';
import AnimatedSection from '../../components/ui/AnimatedSection.jsx';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Role, ADMIN_ROLES } from '../../constants/roles.js';
import {
  fetchChatHistory,
  fetchConversations,
  sendChatMessage,
  fetchChatProfiles,
  fetchAdminChatRecipients,
  blockUser,
  unblockUser,
  decodeJwtPayload,
} from '../../services/authApi.js';
import { apiBaseUrl, resolvePublicAssetUrl } from '../../utils/urls.js';
import ChatMessageBubble from '../../components/chat/ChatMessageBubble.jsx';

function messageIdOf(msg) {
  return msg?.id ?? msg?.Id ?? null;
}

function appendMessage(prev, msg) {
  const id = messageIdOf(msg);
  if (id && prev.some((m) => messageIdOf(m) === id)) return prev;
  return [...prev, msg];
}

function mergeMessagesFromHistory(prev, history) {
  const list = Array.isArray(history) ? history : [];
  if (list.length === 0) return prev.length === 0 ? list : prev;
  const prevKey = prev.map((m) => messageIdOf(m)).join('|');
  const nextKey = list.map((m) => messageIdOf(m)).join('|');
  if (prevKey === nextKey) return prev;
  return list;
}

function Chat() {
  const { token, role } = useAuth();
  const [searchParams] = useSearchParams();
  const partnerFromUrl = searchParams.get('partner');
  const currentUserId = useMemo(() => {
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    return payload?.authId || payload?.userId || payload?.id || payload?.sub || payload?.email || '';
  }, [token]);

  const [conversations, setConversations] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [chatBlockedReason, setChatBlockedReason] = useState(null);
  const [adminRecipientSearch, setAdminRecipientSearch] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState([]);
  const [adminSearchLoading, setAdminSearchLoading] = useState(false);

  const isAdmin = useMemo(
    () => ADMIN_ROLES.includes(String(role || '').toUpperCase()),
    [role],
  );

  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);
  const selectedPartnerIdRef = useRef(selectedPartnerId);
  const currentUserIdRef = useRef(currentUserId);
  selectedPartnerIdRef.current = selectedPartnerId;
  currentUserIdRef.current = currentUserId;

  const scrollToBottomIfNeeded = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (force || nearBottom) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, []);

  // Load Conversations List
  const loadConversations = useCallback(async () => {
    try {
      const raw = await fetchConversations(token);
      let ids = Array.isArray(raw)
        ? [...raw]
        : (raw?.data && Array.isArray(raw.data) ? [...raw.data] : []);

      if (partnerFromUrl && !ids.includes(partnerFromUrl)) {
        ids = [partnerFromUrl, ...ids];
      }

      if (ids.length === 0) {
        setConversations([]);
        return;
      }

      let profiles = [];
      try {
        profiles = await fetchChatProfiles(token, ids);
      } catch {
        profiles = [];
      }

      const profileById = new Map((profiles || []).map((p) => [p.authUserId, p]));
      const merged = ids.map((id) => {
        const existing = profileById.get(id);
        if (existing) return existing;
        return {
          authUserId: id,
          fullName: 'User',
          displayName: 'User',
          profilePhotoUrl: null,
          role: '',
          isBlockedByMe: false,
        };
      });

      setConversations(merged);
      setSelectedPartnerId((prev) => {
        if (partnerFromUrl && ids.includes(partnerFromUrl)) return partnerFromUrl;
        if (prev && ids.includes(prev)) return prev;
        return merged[0]?.authUserId ?? null;
      });
    } catch (error) {
      console.error('Failed to load conversations', error);
      toast.error(error.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [token, partnerFromUrl]);

  useEffect(() => {
    if (!isAdmin || !token) return undefined;
    const delay = adminRecipientSearch.length >= 2 ? 300 : 0;
    const timer = setTimeout(async () => {
      setAdminSearchLoading(true);
      try {
        const q = adminRecipientSearch.length >= 2 ? adminRecipientSearch : '';
        const results = await fetchAdminChatRecipients(token, q);
        setAdminSearchResults(Array.isArray(results) ? results : []);
      } catch {
        setAdminSearchResults([]);
      } finally {
        setAdminSearchLoading(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [isAdmin, token, adminRecipientSearch]);

  const startAdminConversation = useCallback(async (recipient) => {
    const id = recipient.authUserId;
    setSelectedPartnerId(id);
    setAdminRecipientSearch('');
    setAdminSearchResults([]);
    if (conversations.some((c) => c.authUserId === id)) return;
    try {
      const profiles = await fetchChatProfiles(token, [id]);
      if (profiles?.length) {
        setConversations((prev) => {
          if (prev.some((p) => p.authUserId === id)) return prev;
          return [profiles[0], ...prev];
        });
      } else {
        setConversations((prev) => {
          if (prev.some((p) => p.authUserId === id)) return prev;
          return [{
            authUserId: id,
            fullName: recipient.fullName,
            profilePhotoUrl: recipient.profilePhotoUrl || null,
            role: recipient.role,
          }, ...prev];
        });
      }
    } catch {
      setConversations((prev) => {
        if (prev.some((p) => p.authUserId === id)) return prev;
        return [{
          authUserId: id,
          fullName: recipient.fullName,
          profilePhotoUrl: recipient.profilePhotoUrl || null,
          role: recipient.role,
        }, ...prev];
      });
    }
  }, [conversations, token]);

  // Load Chat History for Selected Partner
  const loadChatHistory = useCallback(async (silent = false) => {
    if (!selectedPartnerId) return;

    if (!silent) setIsLoadingMessages(true);
    try {
      const history = await fetchChatHistory(token, selectedPartnerId);
      setMessages((prev) => (silent ? mergeMessagesFromHistory(prev, history) : (Array.isArray(history) ? history : [])));
      setChatBlockedReason(null);
      if (!silent) scrollToBottomIfNeeded(true);
    } catch (error) {
      console.error('Failed to load chat history', error);
      const msg = error.message || '';
      if (!isAdmin && msg.toLowerCase().includes('booking')) {
        setChatBlockedReason('book');
        setMessages([]);
      } else if (!silent) {
        toast.error(msg || 'Failed to load chat history');
      }
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  }, [selectedPartnerId, token, isAdmin, scrollToBottomIfNeeded]);

  // Initial load of conversations
  useEffect(() => {
    loadConversations();
  }, [token, loadConversations]);

  // Load history when partner changes
  useEffect(() => {
    if (selectedPartnerId) {
      loadChatHistory();
    }
  }, [selectedPartnerId, loadChatHistory]);

  // Real-time updates via SignalR (replaces polling)
  useEffect(() => {
    if (!token) return undefined;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiBaseUrl()}/chatHub`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    const onReceiveMessage = (senderAuthUserId, content, sentAtUtc, messageId) => {
      if (senderAuthUserId !== selectedPartnerIdRef.current) return;
      const incoming = {
        id: messageId,
        senderAuthUserId,
        receiverAuthUserId: currentUserIdRef.current,
        content,
        sentAtUtc,
        isRead: false,
      };
      setMessages((prev) => appendMessage(prev, incoming));
      scrollToBottomIfNeeded();
    };

    connection.on('ReceiveMessage', onReceiveMessage);
    connection.start().catch((err) => {
      console.warn('Chat SignalR connection failed:', err);
    });

    return () => {
      connection.off('ReceiveMessage', onReceiveMessage);
      connection.stop();
    };
  }, [token, scrollToBottomIfNeeded]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedPartnerId) return;

    const text = inputMessage.trim();
    setIsSendingMessage(true);
    try {
      const sent = await sendChatMessage({
        token,
        receiverAuthUserId: selectedPartnerId,
        content: text,
      });

      setInputMessage('');
      if (sent && typeof sent === 'object') {
        setMessages((prev) => appendMessage(prev, sent));
        scrollToBottomIfNeeded(true);
      }
      toast.success('Message sent');
    } catch (err) {
      console.error('Failed to send message:', err);
      const msg = err.message || 'Failed to send message';
      if (!isAdmin && msg.toLowerCase().includes('booking')) {
        setChatBlockedReason('book');
        toast.error('Book a session with this tutor before sending messages.');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleBlock = async () => {
    if (!selectedPartnerId) return;
    if (!window.confirm(`Are you sure you want to block ${selectedPartner?.fullName}? You will no longer be able to message each other.`)) return;

    setIsBlocking(true);
    try {
      await blockUser(token, selectedPartnerId);
      toast.success('User blocked');
      setSelectedPartnerId(null);
      loadConversations();
    } catch (err) {
      console.error('Failed to block user:', err);
      toast.error('Failed to block user');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblock = async () => {
    if (!selectedPartnerId) return;
    
    setIsBlocking(true);
    try {
      await unblockUser(token, selectedPartnerId);
      toast.success('User unblocked');
      loadConversations();
    } catch (err) {
      console.error('Failed to unblock user:', err);
      toast.error('Failed to unblock user');
    } finally {
      setIsBlocking(false);
    }
  };

  const selectedPartner = conversations.find(c => c.authUserId === selectedPartnerId);

  if (isLoading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AnimatedSection className="glass-panel rounded-3xl p-6" delay={0.05} immediate>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-500/15 p-3 text-indigo-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <div>
            <h1 className="font-heading text-2xl font-black text-[var(--mh-text)]">
              {isAdmin ? 'Administration Chat' : 'Academic Chat'}
            </h1>
            <p className="text-sm text-[var(--mh-text-muted)]">
              {isAdmin
                ? 'Message tutors and students platform-wide. Recipients see messages from Administration.'
                : 'Real-time collaboration with your mentors and students.'}
            </p>
          </div>
        </div>
      </AnimatedSection>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* Sidebar: Conversations */}
        <AnimatedSection as="aside" className="glass-panel h-[700px] flex flex-col rounded-[2rem] p-4" delay={0.1} immediate>
          <div className="px-2 pb-4 border-b border-[var(--mh-border)]">
            <h2 className="font-heading text-lg font-black text-[var(--mh-text)]">Messages</h2>
            {isAdmin && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={adminRecipientSearch}
                  onChange={(e) => setAdminRecipientSearch(e.target.value)}
                  placeholder="Search tutor or student..."
                  className="mh-input w-full text-xs"
                />
                {adminSearchLoading && (
                  <p className="text-[10px] text-[var(--mh-text-muted)]">Searching...</p>
                )}
                {!adminSearchLoading && adminSearchResults.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--mh-text-muted)]">
                      {adminRecipientSearch.length >= 2 ? 'Search results' : 'Platform users'}
                    </p>
                    <ul className="max-h-48 overflow-y-auto rounded-xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] py-1">
                      {adminSearchResults.map((r) => (
                        <li key={r.authUserId}>
                          <button
                            type="button"
                            onClick={() => startAdminConversation(r)}
                            className="flex w-full flex-col px-3 py-2 text-left hover:bg-indigo-500/15"
                          >
                            <span className="text-xs font-bold text-[var(--mh-text)]">{r.fullName}</span>
                            <span className="text-[10px] text-[var(--mh-text-muted)]">{r.email} · {r.role}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {conversations.length > 0 ? (
              conversations.map((partner) => (
                <button
                  key={partner.authUserId}
                  onClick={() => setSelectedPartnerId(partner.authUserId)}
                  className={`w-full group relative flex items-center gap-4 rounded-2xl p-4 transition-all ${
                    selectedPartnerId === partner.authUserId
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'border border-transparent hover:border-indigo-500/30 hover:bg-indigo-500/10'
                  }`}
                >
                  <div className="relative h-12 w-12 flex-shrink-0">
                    {partner.profilePhotoUrl ? (
                      <img 
                        src={partner.profilePhotoUrl.startsWith('http') ? partner.profilePhotoUrl : resolvePublicAssetUrl(partner.profilePhotoUrl, 'profiles')} 
                        className="h-full w-full rounded-xl object-cover border-2 border-white/20"
                        alt=""
                      />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center rounded-xl font-bold ${selectedPartnerId === partner.authUserId ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-300'}`}>
                        {(partner.fullName || '?').charAt(0)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm font-black ${selectedPartnerId === partner.authUserId ? 'text-white' : 'text-[var(--mh-text)]'}`}>
                        {partner.fullName}
                      </p>
                      {partner.isBlockedByMe && (
                        <span className="rounded bg-rose-500/20 px-1 text-[8px] font-bold uppercase text-rose-300">Blocked</span>
                      )}
                    </div>
                    <p className={`truncate text-[11px] ${selectedPartnerId === partner.authUserId ? 'text-indigo-100' : 'text-[var(--mh-text-muted)]'}`}>
                      {partner.isBlockedByMe ? 'Blocked user' : 'Click to chat'}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center px-4 pt-10 text-center text-[var(--mh-text-muted)]">
                <svg className="h-12 w-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest">No conversations yet</p>
                <p className="mt-2 text-sm text-[var(--mh-text-muted)]">
                  {isAdmin
                    ? 'Search for a tutor or student above to start an administration conversation.'
                    : String(role || '').toUpperCase() === Role.STUDENT
                      ? 'Book a session with a tutor to start messaging.'
                      : 'Students appear here after they book a session with you.'}
                </p>
                {!isAdmin && String(role || '').toUpperCase() === Role.STUDENT ? (
                  <Link to="/tutors" className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
                    Find tutors
                  </Link>
                ) : !isAdmin ? (
                  <Link to="/tutor-dashboard" className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
                    View dashboard
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* Chat Area */}
        <AnimatedSection as="section" className="glass-panel flex h-[700px] flex-col rounded-[2rem] p-4 overflow-hidden" delay={0.15} immediate>
          {selectedPartner ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-4 border-b border-[var(--mh-border)] pb-4">
                <div className="h-10 w-10 overflow-hidden rounded-xl bg-[var(--mh-input-bg)]">
                  {selectedPartner.profilePhotoUrl ? (
                    <img 
                      src={selectedPartner.profilePhotoUrl.startsWith('http') ? selectedPartner.profilePhotoUrl : resolvePublicAssetUrl(selectedPartner.profilePhotoUrl, 'profiles')} 
                      className="h-full w-full object-cover" 
                      alt=""
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-bold text-[var(--mh-text-muted)]">
                      {(selectedPartner.fullName || '?').charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-[var(--mh-text)]">{selectedPartner.fullName}</h4>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mh-text-muted)]">Online</span>
                  </div>
                </div>
                {!isAdmin && (
                <div className="ml-auto flex gap-2">
                  {selectedPartner.isBlockedByMe ? (
                    <button 
                      onClick={handleUnblock}
                      disabled={isBlocking}
                      className="rounded-xl bg-indigo-500/15 p-2 text-indigo-400 hover:bg-indigo-500/25 transition-colors"
                      title="Unblock User"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </button>
                  ) : (
                    <button 
                      onClick={handleBlock}
                      disabled={isBlocking}
                      className="rounded-xl bg-rose-500/15 p-2 text-rose-400 hover:bg-rose-500/25 transition-colors"
                      title="Block User"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  )}
                </div>
                )}
              </div>

              {chatBlockedReason === 'book' && !isAdmin && (
                <div className="mx-4 mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <p className="font-bold">Messaging requires a booking</p>
                  <p className="mt-1 text-[var(--mh-text-muted)]">
                    Reserve a session with this tutor to unlock chat. You can still view their profile here.
                  </p>
                  {String(role || '').toUpperCase() === Role.STUDENT && (
                    <Link to="/tutors" className="mt-2 inline-block text-xs font-bold text-indigo-400 hover:underline">
                      Find tutors to book →
                    </Link>
                  )}
                </div>
              )}

              {/* Messages Container */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar"
              >
                {isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => (
                    <ChatMessageBubble
                      key={messageIdOf(msg) || `${msg.senderAuthUserId}-${msg.sentAtUtc}`}
                      message={msg}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--mh-text-muted)] opacity-50">
                    <p className="text-xs font-bold uppercase tracking-widest">Start a conversation</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              {selectedPartner.isBlockedByMe ? (
                <div className="mt-4 flex items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-bold uppercase tracking-wider text-rose-300">
                  🚫 You have blocked this user
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="mt-4 flex gap-3 rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-3">
                  <input
                    type="text"
                    placeholder={isAdmin ? 'Message as Administration...' : 'Type a message...'}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isSendingMessage}
                    className="flex-1 bg-transparent px-2 text-sm text-[var(--mh-text)] outline-none placeholder:text-[var(--mh-text-subtle)] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isSendingMessage}
                    className="rounded-xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-50"
                  >
                    {isSendingMessage ? (
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    )}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-[var(--mh-text-muted)]">
              <div className="mb-4 rounded-full bg-[var(--mh-input-bg)] p-6">
                <svg className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <p className="font-heading text-lg font-black text-[var(--mh-text)]">Select a conversation to start chatting</p>
            </div>
          )}
        </AnimatedSection>
      </div>
    </div>
  );
}

export default Chat;