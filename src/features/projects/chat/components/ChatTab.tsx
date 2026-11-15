'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/providers/AuthContext';
import { useSocket } from '@/providers/SocketContext';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { hasProjectPermission } from '@/lib/permissions';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import {
  Send, Image as ImageIcon, X, Reply, Edit2, Trash2, Smile,
  PlayCircle, Loader2, MoreVertical, MessageSquare, Search,
  RefreshCw, Check, CheckCheck, Paperclip, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatTabProps {
  projectId: string;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🚀'];

const QUICK_STARTERS = [
  { label: 'Site Progress', text: "Site update: Work is currently progressing according to today's schedule." },
  { label: 'Material Alert', text: 'Material update: Please confirm delivery schedule for upcoming site materials.' },
  { label: 'Inspection Photos', text: 'Sharing inspection photos and notes from the latest site walkthrough.' },
  { label: 'Milestone Check', text: 'Status check on milestone deliverables scheduled for this week.' },
];

function formatMessageDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function ChatTab({ projectId }: ChatTabProps) {
  const { user } = useAuth();
  const { project } = useProjectContext();
  const { socket } = useSocket();
  const toast = useToast();
  const { confirm } = useConfirm();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Height measurement to ensure chat fits viewport without breaking or pushing input off-screen
  const [chatHeight, setChatHeight] = useState<number | null>(null);

  useEffect(() => {
    // Scroll window to top when mounting so container position is measured from true page origin
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    const updateHeight = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Distance from container top to viewport bottom minus main layout bottom padding and buffer
      const available = window.innerHeight - rect.top - 40;
      setChatHeight(Math.max(460, Math.min(840, available)));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(socket?.connected || false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Attachments & Replies
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [editingMsg, setEditingMsg] = useState<any | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const currentUserId = user?._id || user?.id;
  const canManageChat = hasProjectPermission(user, project, 'chat:manage');

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 60);
  }, []);

  const fetchMessages = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const response = await api.get(`/projects/${projectId}/messages`);
      setMessages(response.data);
      if (!isManualRefresh) {
        scrollToBottom('instant');
      }
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, [projectId, toast, scrollToBottom]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    setIsConnected(socket.connected);

    const handleNewMessage = (newMessage: any) => {
      setMessages(prev => {
        if (prev.some(m => m._id === newMessage._id)) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();
    };

    const handleMessageUpdate = (updatedMsg: any) => {
      setMessages(prev => prev.map(m => (m._id === updatedMsg._id ? updatedMsg : m)));
    };

    const handleMessageDelete = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    const handleConnect = () => {
      setIsConnected(true);
      fetchMessages();
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:message:update', handleMessageUpdate);
    socket.on('chat:message:delete', handleMessageDelete);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:message:update', handleMessageUpdate);
      socket.off('chat:message:delete', handleMessageDelete);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, fetchMessages, scrollToBottom]);

  // Periodic polling fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/projects/${projectId}/messages`);
        setMessages((prev: any[]) => {
          const fetched: any[] = response.data;
          const lastFetched = fetched[fetched.length - 1];
          const lastPrev = prev[prev.length - 1];
          if (lastFetched?._id === lastPrev?._id && fetched.length === prev.length) return prev;
          return fetched;
        });
      } catch {
        // Silently ignore polling hiccups
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Close menus on outside click
  useEffect(() => {
    if (!activeMenuId && !showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-chat-menu]')) {
        setActiveMenuId(null);
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeMenuId, showEmojiPicker]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }
    setSelectedFile(file);
    setFileType(file.type.startsWith('video/') ? 'video' : 'image');
    setFilePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
  };

  const sendMessage = async () => {
    if ((!inputText.trim() && !selectedFile) || isSending) return;
    setIsSending(true);
    try {
      if (editingMsg) {
        const res = await api.patch(`/projects/${projectId}/messages/${editingMsg._id}`, {
          content: inputText.trim(),
        });
        setMessages(prev =>
          prev.map(m =>
            m._id === editingMsg._id ? { ...m, ...res.data, content: inputText.trim(), isEdited: true } : m
          )
        );
        setEditingMsg(null);
        setInputText('');
      } else {
        let attachments: any[] = [];
        if (selectedFile) {
          const url = await uploadToCloudinary(selectedFile);
          attachments.push({ url, type: fileType, name: selectedFile.name });
        }
        const res = await api.post(`/projects/${projectId}/messages`, {
          content: inputText.trim(),
          attachments,
          replyTo: replyingTo?._id,
        });

        const newMessage = { ...res.data };
        if (!newMessage.sender && !newMessage.senderId) {
          newMessage.sender = currentUserId;
          newMessage.senderName = user?.name || 'Me';
        }

        setMessages(prev => (prev.some(m => m._id === newMessage._id) ? prev : [...prev, newMessage]));
        scrollToBottom();
        setInputText('');
        clearFile();
        setReplyingTo(null);
      }
    } catch {
      toast.error(editingMsg ? 'Failed to edit message' : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    const ok = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmText: 'Delete Message',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/projects/${projectId}/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m._id !== messageId));
      setActiveMenuId(null);
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    try {
      const res = await api.patch(`/projects/${projectId}/messages/${messageId}/react`, { emoji });
      setMessages(prev => prev.map(m => (m._id === messageId ? res.data : m)));
      setActiveMenuId(null);
    } catch {
      toast.error('Failed to add reaction');
    }
  };

  const startEdit = (msg: any) => {
    setEditingMsg(msg);
    setReplyingTo(null);
    setInputText(msg.content || '');
    setActiveMenuId(null);
    textareaRef.current?.focus();
  };

  const startReply = (msg: any) => {
    setReplyingTo(msg);
    setEditingMsg(null);
    setActiveMenuId(null);
    textareaRef.current?.focus();
  };

  // Filtered messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase().trim();
    return messages.filter(
      m =>
        (m.content && m.content.toLowerCase().includes(q)) ||
        (m.senderName && m.senderName.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-none">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        <p className="text-slate-500 mt-2 text-xs font-medium">Connecting to project discussion...</p>
      </div>
    );
  }

  let lastDateGroup = '';

  return (
    <div
      ref={containerRef}
      style={chatHeight ? { height: `${chatHeight}px` } : undefined}
      className="flex flex-col h-[calc(100dvh-265px)] min-h-[460px] max-h-[840px] bg-white rounded-2xl border border-slate-200/80 shadow-none overflow-hidden relative"
    >
      {/* ── CHAT HEADER ── */}
      <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Project Discussion
              </h3>
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-amber-50 text-amber-700 border-amber-200/80'
                )}
                title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to live chat...'}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  )}
                />
                <span className="hidden sm:inline">{isConnected ? 'Live' : 'Syncing'}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {project?.name ? `#${project.name}` : 'General team thread'} • {messages.length}{' '}
              {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Search Toggle */}
          {isSearchOpen ? (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chat..."
                className="w-28 sm:w-44 text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400"
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Search messages"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Refresh Messages */}
          <button
            onClick={() => fetchMessages(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            title="Refresh messages"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-blue-600')} />
          </button>
        </div>
      </div>

      {/* ── SEARCH BANNER (When active search has results) ── */}
      {searchQuery.trim() && (
        <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-800 shrink-0">
          <span>
            Found <strong>{filteredMessages.length}</strong> matching{' '}
            {filteredMessages.length === 1 ? 'message' : 'messages'} for &ldquo;{searchQuery}&rdquo;
          </span>
          <button
            onClick={() => setSearchQuery('')}
            className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* ── MESSAGE LIST ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/40">
        {filteredMessages.length === 0 ? (
          searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No matching messages</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                No messages found matching &ldquo;{searchQuery}&rdquo;. Try another search term.
              </p>
            </div>
          ) : (
            /* Modern, interactive empty state */
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-4 py-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Project Discussion Channel</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Keep site updates, daily progress logs, material requests, and team conversations in one unified timeline.
              </p>

             
            </div>
          )
        ) : (
          filteredMessages.map(msg => {
            const rawSenderId =
              typeof msg.sender === 'object' && msg.sender !== null
                ? msg.sender._id || msg.sender.id
                : msg.sender || msg.senderId || msg.userId;
            const isMe = Boolean(
              (rawSenderId && currentUserId && String(rawSenderId) === String(currentUserId)) ||
                (msg.senderName &&
                  user?.name &&
                  String(msg.senderName).trim().toLowerCase() === String(user.name).trim().toLowerCase())
            );
            const time = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Date separator calculation
            const currentDateGroup = formatMessageDateGroup(msg.createdAt);
            const showDateGroup = currentDateGroup !== lastDateGroup;
            if (showDateGroup) {
              lastDateGroup = currentDateGroup;
            }

            return (
              <React.Fragment key={msg._id}>
                {showDateGroup && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-1 rounded-full text-[10.5px] font-semibold bg-white text-slate-500 border border-slate-200/80 shadow-none">
                      {currentDateGroup}
                    </span>
                  </div>
                )}

                <div className={cn('flex w-full group relative', isMe ? 'justify-end' : 'justify-start')}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mr-2.5 mt-0.5 font-bold text-xs select-none">
                      {msg.senderName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}

                  <div
                    className={cn(
                      'flex min-w-0 w-fit max-w-[85%] sm:max-w-[75%] flex-col',
                      isMe ? 'items-end' : 'items-start'
                    )}
                  >
                    {!isMe && (
                      <span className="text-[11px] font-semibold text-slate-600 mb-1 ml-1">
                        {msg.senderName || 'Team Member'}
                      </span>
                    )}

                    <div className="relative min-w-0 w-fit max-w-full group/bubble" data-chat-menu>
                      <div
                        className={cn(
                          'px-4 py-2.5 rounded-2xl border text-xs sm:text-sm relative z-10 transition-all shadow-none',
                          isMe
                            ? 'bg-blue-600 text-white border-blue-600 rounded-br-xs'
                            : 'bg-white text-slate-800 border-slate-200/90 rounded-bl-xs'
                        )}
                      >
                        {/* Reply reference */}
                        {msg.replyTo && (
                          <div
                            className={cn(
                              'mb-2 p-2 rounded-lg border-l-2 text-xs',
                              isMe
                                ? 'bg-blue-700/60 border-white text-blue-100'
                                : 'bg-slate-50 border-blue-500 text-slate-600'
                            )}
                          >
                            <span
                              className={cn(
                                'font-bold block text-[11px] mb-0.5',
                                isMe ? 'text-white' : 'text-blue-600'
                              )}
                            >
                              {msg.replyTo.senderName || 'Replying to message'}
                            </span>
                            <span className="truncate block opacity-90">
                              {msg.replyTo.content || 'Attachment'}
                            </span>
                          </div>
                        )}

                        {/* Media attachments */}
                        {msg.attachments?.map((att: any, idx: number) => (
                          <div
                            key={idx}
                            className="mb-2 overflow-hidden rounded-xl bg-slate-100/50 border border-slate-200/80"
                          >
                            {att.type === 'image' ? (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block cursor-pointer hover:opacity-95"
                              >
                                <img
                                  src={att.url}
                                  alt="attachment"
                                  className="max-w-full h-auto max-h-60 rounded-lg object-cover"
                                />
                              </a>
                            ) : att.type === 'video' ? (
                              <video
                                src={att.url}
                                controls
                                className="max-w-full max-h-60 rounded-lg object-cover"
                              />
                            ) : null}
                          </div>
                        ))}

                        {/* Text content */}
                        {msg.content && (
                          <p
                            className={cn(
                              'leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]',
                              isMe ? 'text-white' : 'text-slate-800'
                            )}
                          >
                            {msg.content}
                          </p>
                        )}

                        {/* Timestamp & edited note */}
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          {msg.isEdited && (
                            <span
                              className={cn(
                                'text-[9.5px] italic',
                                isMe ? 'text-blue-200' : 'text-slate-400'
                              )}
                            >
                              (edited)
                            </span>
                          )}
                          <span
                            className={cn(
                              'text-[10px] font-medium',
                              isMe ? 'text-blue-100' : 'text-slate-400'
                            )}
                          >
                            {time}
                          </span>
                        </div>
                      </div>

                      {/* Reactions pills */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div
                          className={cn(
                            'flex flex-wrap gap-1 mt-1 relative z-20',
                            isMe ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {Object.entries(
                            msg.reactions.reduce((acc: Record<string, number>, r: any) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => {
                            const iReacted = msg.reactions.some(
                              (r: any) =>
                                r.emoji === emoji &&
                                (r.user === currentUserId || r.user?._id === currentUserId)
                            );
                            return (
                              <button
                                key={emoji}
                                onClick={() => reactToMessage(msg._id, emoji)}
                                className={cn(
                                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all cursor-pointer shadow-none',
                                  iReacted
                                    ? 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-300'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                )}
                              >
                                <span>{emoji}</span>
                                <span className="font-semibold text-[11px]">{count as number}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Action Menu Trigger (Hover) */}
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === msg._id ? null : msg._id)}
                        className={cn(
                          'absolute top-2 p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all z-30 shadow-none cursor-pointer',
                          isMe ? '-left-8' : '-right-8',
                          activeMenuId === msg._id
                            ? 'opacity-100'
                            : 'opacity-0 group-hover/bubble:opacity-100 focus:opacity-100'
                        )}
                        title="Message actions"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === msg._id && (
                        <div
                          data-chat-menu
                          className={cn(
                            'absolute top-0 bg-white rounded-xl border border-slate-200/90 shadow-none w-56 z-50 overflow-hidden',
                            isMe ? 'right-full mr-2' : 'left-full ml-2'
                          )}
                        >
                          {/* Quick Emoji Reaction bar */}
                          <div className="flex items-center justify-around p-2 bg-slate-50/80 border-b border-slate-100">
                            {QUICK_REACTIONS.slice(0, 6).map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => reactToMessage(msg._id, emoji)}
                                className="text-base hover:scale-125 transition-transform p-0.5 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          <div className="p-1 space-y-0.5">
                            <button
                              onClick={() => startReply(msg)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Reply className="w-3.5 h-3.5 text-blue-600" /> Reply
                            </button>
                            {isMe && (
                              <button
                                onClick={() => startEdit(msg)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-amber-600" /> Edit
                              </button>
                            )}
                            {(isMe || canManageChat) && (
                              <button
                                onClick={() => deleteMessage(msg._id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT / ACTION FOOTER ── */}
      <div className="bg-white border-t border-slate-200/80 p-3 sm:p-4 shrink-0">
        {/* Reply / Edit context bar */}
        {(replyingTo || editingMsg) && (
          <div className="flex items-center justify-between bg-blue-50/60 p-2.5 mb-2.5 rounded-xl border border-blue-200/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                {replyingTo ? <Reply className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-blue-800 block">
                  {replyingTo ? `Replying to ${replyingTo.senderName || 'message'}` : 'Editing message'}
                </span>
                <span className="text-[11px] text-slate-500 truncate block">
                  {(replyingTo || editingMsg).content || 'Media attachment'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setReplyingTo(null);
                setEditingMsg(null);
                setInputText('');
              }}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selected file preview */}
        {filePreview && (
          <div className="relative inline-block mb-2.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            {fileType === 'image' ? (
              <img
                src={filePreview}
                alt="Upload preview"
                className="h-16 w-auto rounded-lg object-cover"
              />
            ) : (
              <div className="relative h-16 w-28 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
                <video
                  src={filePreview}
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <PlayCircle className="w-6 h-6 text-white relative z-10" />
              </div>
            )}
            <button
              onClick={clearFile}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 border border-slate-200 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
              title="Remove file"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Unified Input Row */}
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-slate-50/80 border border-slate-200 focus-within:border-blue-500 focus-within:bg-white rounded-xl flex items-end p-1 transition-all">
            {!editingMsg && (
              <div className="flex items-center gap-0.5 p-1 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title="Attach image or video"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Quick Emoji toggle */}
                <div className="relative" data-chat-menu>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Insert emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-xl p-2 flex gap-1 z-50 shadow-none">
                      {QUICK_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setInputText(prev => prev + emoji);
                            setShowEmojiPicker(false);
                            textareaRef.current?.focus();
                          }}
                          className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                editingMsg
                  ? 'Edit your message...'
                  : 'Type a message... (Press Enter to send)'
              }
              className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none py-2 px-2.5 max-h-28 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400"
              rows={1}
              style={{ minHeight: '38px' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={(!inputText.trim() && !selectedFile) || isSending}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-colors shadow-none cursor-pointer"
            title="Send Message"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Subtle keyboard shortcut hint */}
        <div className="hidden sm:flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
          <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line</span>
          <span>Max file size: 50MB</span>
        </div>
      </div>
    </div>
  );
}
