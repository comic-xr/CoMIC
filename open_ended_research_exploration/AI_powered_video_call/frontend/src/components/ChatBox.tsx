import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { socket } from '../services/socket';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: string;
}

interface ChatBoxProps {
  initialMessages?: Message[];
  onSendMessage?: (message: string) => Promise<void>;
  isProcessing?: boolean;
  meetingId?: string;
  useAssistant?: boolean;
}

// Define what methods will be exposed via the ref
export interface ChatBoxRef {
  addBotMessage: (text: string) => void;
}

const ChatBox = forwardRef<ChatBoxRef, ChatBoxProps>(({ 
  initialMessages = [], 
  onSendMessage,
  isProcessing = false,
  meetingId,
  useAssistant = true
}, ref) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [localProcessing, setLocalProcessing] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    addBotMessage: (text: string) => {
      const timestamp = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const botMessage: Message = {
        id: Date.now().toString(),
        text,
        isBot: true,
        timestamp
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
    }
  }));

  // Set up socket listener for assistant responses
  useEffect(() => {
    if (!useAssistant) return;
    
    const onAssistantResponse = (data: any) => {
      console.log("Received assistant response:", data);
      
      if (data.success) {
        // Add the assistant's answer as a bot message
        const timestamp = new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const botMessage: Message = {
          id: Date.now().toString(),
          text: data.answer,
          isBot: true,
          timestamp
        };
        
        setMessages(prevMessages => [...prevMessages, botMessage]);
      } else {
        // Show error message
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: data.message || "Sorry, I couldn't process your request.",
          isBot: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prevMessages => [...prevMessages, errorMessage]);
      }
      
      setLocalProcessing(false);
    };
    
    socket.on("assistant-response", onAssistantResponse);
    
    // Add initial welcome message for the assistant
    if (useAssistant && messages.length === 0) {
      const timestamp = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: "Hello! I'm your meeting assistant. I can answer questions about the meeting based on the transcription. Please note that I need transcription data to be available before I can answer questions.",
        isBot: true,
        timestamp
      };
      
      setMessages([welcomeMessage]);
    }
    
    return () => {
      socket.off("assistant-response", onAssistantResponse);
    };
  }, [useAssistant, messages.length]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    // Don't process empty messages
    if (!text.trim()) return;
    
    // Generate a timestamp
    const timestamp = new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isBot: false,
      timestamp
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Use the OpenAI assistant if we have a meetingId and useAssistant is true
    if (useAssistant && meetingId) {
      setLocalProcessing(true);
      
      // Send the question to the assistant via socket
      socket.emit("ask-assistant", {
        meetingId,
        question: text
      });
      
      // The response will be handled by the "assistant-response" event listener
    } 
    // Otherwise call the parent's onSendMessage function if provided
    else if (onSendMessage) {
      await onSendMessage(text);
    }
  };

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden bg-white shadow-md">
      <div className="bg-blue-500 text-white p-3">
        <h3 className="font-bold">Meeting Assistant</h3>
        <p className="text-xs text-blue-100">
          {useAssistant 
            ? "Ask questions about the meeting transcription" 
            : "Chat with other participants"}
        </p>
      </div>
      
      <div 
        ref={chatContainerRef} 
        className="flex-1 p-4 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>
              {useAssistant 
                ? "Ask a question about the meeting transcription" 
                : "Send a message to start the conversation"}
            </p>
          </div>
        ) : (
          messages.map(message => (
            <ChatMessage 
              key={message.id}
              message={message.text}
              isBot={message.isBot}
              timestamp={message.timestamp}
            />
          ))
        )}
        
        {(isProcessing || localProcessing) && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={isProcessing || localProcessing}
      />
    </div>
  );
});

// Set display name for debugging
ChatBox.displayName = 'ChatBox';

export { ChatBox };
export type { Message }; 