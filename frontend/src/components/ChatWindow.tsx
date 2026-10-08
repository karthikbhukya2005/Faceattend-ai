import React, { useState, useRef, useEffect } from 'react';
import { Send, BotMessageSquare, Sparkles, User, Database, RotateCcw } from 'lucide-react';
import { ChatMessage } from '../types';
import { aiApi } from '../services/api';
import { authService } from '../services/auth';

const ADMIN_SUGGESTIONS = [
  'Who was absent today?',
  'Show students with attendance below 75%',
  'Which department has the best attendance?',
  'How many people were late today?',
  'What is the policy for late arrivals?',
  "Give me a summary of this week's attendance",
];

const STUDENT_SUGGESTIONS = [
  'What is my attendance rate?',
  'Show my attendance summary',
  'What is my attendance status today?',
  'How many times was I late?',
  'What is the policy for late arrivals?',
  'What is the 75% attendance rule?',
];

function renderMarkdownContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: number) => {
    if (tableHeader.length > 0) {
      elements.push(
        <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/80">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="border-b border-slate-700 bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                {tableHeader.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 font-semibold">
                    {h.replace(/\*\*/g, '').trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/30">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: cell
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/`(.*?)`/g, '<code class="bg-slate-800 px-1 py-0.5 rounded text-emerald-400">$1</code>'),
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cols = trimmed.slice(1, -1).split('|').map((c) => c.trim());
      if (cols.some((c) => c.includes('---'))) {
        inTable = true;
      } else if (!inTable && tableHeader.length === 0) {
        tableHeader = cols;
      } else {
        tableRows.push(cols);
      }
      return;
    } else if (inTable || tableHeader.length > 0) {
      flushTable(idx);
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={idx} className="mt-3 mb-1 text-sm font-bold text-white flex items-center gap-1.5">
          {trimmed.replace('### ', '')}
        </h4>
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <div key={idx} className="my-2 border-l-2 border-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-r-lg text-xs text-emerald-300">
          <span
            dangerouslySetInnerHTML={{
              __html: trimmed.replace('> ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
            }}
          />
        </div>
      );
    } else if (trimmed.startsWith('- ')) {
      elements.push(
        <li key={idx} className="ml-4 list-disc text-xs text-slate-300 my-0.5">
          <span
            dangerouslySetInnerHTML={{
              __html: trimmed.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
            }}
          />
        </li>
      );
    } else if (trimmed.length > 0) {
      elements.push(
        <p key={idx} className="my-1.5 text-xs leading-relaxed text-slate-200">
          <span
            dangerouslySetInnerHTML={{
              __html: trimmed
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code class="bg-slate-800 px-1 py-0.5 rounded text-emerald-400">$1</code>'),
            }}
          />
        </p>
      );
    }
  });

  if (tableHeader.length > 0) {
    flushTable(lines.length);
  }

  return elements;
}

export const ChatWindow: React.FC = () => {
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === 'admin';

  const suggestions = isAdmin ? ADMIN_SUGGESTIONS : STUDENT_SUGGESTIONS;

  const welcomeMessage = isAdmin
    ? "### 👋 Welcome to FaceAttend AI Assistant!\n\nI am your intelligent attendance analyst with real-time access to institutional attendance data, biometric logs, and organizational policies.\n\nAsk me about daily attendance, late arrivals, student compliance, or department comparisons."
    : `### 👋 Welcome, ${currentUser?.name || 'Student'}!\n\nI am your personal FaceAttend AI Assistant. I can help you understand **your own attendance** and answer general attendance-policy questions.\n\nFor privacy, I cannot provide other students' attendance records or institution-wide analytics.`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: ['FaceAttend Knowledge Base'],
    },
  ]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || query).trim();
    if (!q || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await aiApi.chat(q);
      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources || [],
        intent: res.intent,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "⚠️ I encountered an error connecting to the RAG analytics engine. Please ensure the backend is running and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        id: 'init-reset',
        role: 'assistant',
        content: isAdmin
          ? "Conversation history cleared. How can I assist you with attendance records?"
          : "Conversation history cleared. How can I help you with your attendance or attendance policies?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['FaceAttend Knowledge Base'],
      },
    ]);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-lg shadow-indigo-500/20">
            <BotMessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                {isAdmin ? 'FaceAttend AI Assistant' : 'Personal AI Attendance Assistant'}
              </h3>
              <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                RAG Pipeline Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Institutional attendance query & policy reasoning'
                : 'Personal attendance query & policy guidance'}
            </p>
          </div>
        </div>

        <button
          onClick={resetConversation}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          title="Reset Conversation"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800/60 bg-slate-950/40 px-6 py-3">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(item)}
            className="flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/40 px-3 py-1 text-xs font-medium text-slate-300 hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
          >
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>{item}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-md ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'border border-slate-800 bg-slate-950/80 text-slate-200 rounded-bl-none'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <div>{renderMarkdownContent(msg.content)}</div>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
                  <Database className="h-3 w-3 text-indigo-400" />
                  <span className="font-semibold text-slate-300">Sources:</span>
                  {msg.sources.map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-800/80 px-1.5 py-0.5 text-slate-400 border border-slate-700/60"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <p className={`mt-1 text-[10px] ${msg.role === 'user' ? 'text-emerald-200 text-right' : 'text-slate-500'}`}>
                {msg.timestamp}
              </p>
            </div>

            {msg.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 animate-pulse">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 rounded-bl-none">
              <div className="flex items-center gap-2 text-xs text-indigo-300">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
                <span>Synthesizing {isAdmin ? 'live institutional records' : 'your attendance'} and RAG documents...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAdmin
                ? 'Ask about attendance trends, low attendance students, departments...'
                : 'Ask about your attendance or attendance policies...'
            }
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!query.trim() || isLoading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
