import React from 'react';

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  timestamp: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isBot, timestamp }) => {
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
      <div 
        className={`max-w-[75%] rounded-lg px-4 py-2 ${
          isBot 
            ? 'bg-gray-200 text-gray-800' 
            : 'bg-blue-500 text-white'
        }`}
      >
        <div className="flex items-center mb-1">
          <span className="font-semibold text-sm">
            {isBot ? 'WebAI Assistant' : 'You'}
          </span>
          <span className="text-xs ml-2 opacity-70">{timestamp}</span>
        </div>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};

export default ChatMessage; 