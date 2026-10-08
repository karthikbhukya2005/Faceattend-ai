import React from 'react';
import { ChatWindow } from '../components/ChatWindow';

export const AIAssistant: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          AI Attendance Assistant
        </h1>

        <p className="text-xs text-slate-400">
          Query attendance trends, check unexcused absences, and verify policy compliance using natural language
        </p>
      </div>

      <ChatWindow />
    </div>
  );
};

export default AIAssistant;