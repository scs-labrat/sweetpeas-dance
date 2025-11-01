import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Sparkles, Loader2, X, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const MessageBubble = ({ message, onSpeak }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser && 'flex flex-col items-end'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-rose-600 text-white'
              : 'bg-white border border-gray-200'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <ReactMarkdown 
              className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="ml-4 mb-2 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="ml-4 mb-2 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        
        {message.tool_calls?.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.tool_calls.map((toolCall, idx) => (
              <div key={idx} className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1">
                🔧 {toolCall.name?.split('.').pop() || 'Processing...'}
              </div>
            ))}
          </div>
        )}
        
        {!isUser && message.content && (
          <button
            onClick={() => onSpeak(message.content)}
            className="mt-1 text-xs text-gray-500 hover:text-purple-600 transition-colors"
          >
            🔊 Play
          </button>
        )}
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-rose-200 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-rose-700">F</span>
        </div>
      )}
    </div>
  );
};

export default function AssistantChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-speak new assistant messages when voice is enabled
  useEffect(() => {
    if (voiceEnabled && messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      const lastAssistantMessage = newMessages.reverse().find(m => m.role === 'assistant');
      
      if (lastAssistantMessage?.content) {
        speakText(lastAssistantMessage.content);
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, voiceEnabled]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          toast.error('Voice recognition failed. Please try again.');
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && !conversationId && !isInitializing) {
      initializeConversation();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      stopSpeaking();
    };
  }, [isOpen]);

  const initializeConversation = async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: 'sweetpeas_assistant',
        metadata: {
          name: 'Admin Assistant Chat',
          description: 'Conversation with Sweetpeas Assistant'
        }
      });
      
      setConversationId(conversation.id);
      
      unsubscribeRef.current = base44.agents.subscribeToConversation(conversation.id, (data) => {
        setMessages(data.messages || []);
        setIsLoading(false);
      });

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: 'Hi! Please introduce yourself and give me a brief tour of what you can help me with.'
      });
      
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setIsInitializing(false);
    }
  };

  const speakText = (text) => {
    if (!voiceEnabled || !text) return;
    
    stopSpeaking();
    
    // Clean markdown formatting for speech
    const cleanText = text
      .replace(/[#*_`]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/\n+/g, '. ');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
    toast.success(voiceEnabled ? 'Voice disabled' : 'Voice enabled');
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId || isLoading) return;

    setIsLoading(true);
    const userMessage = input;
    setInput('');

    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 z-50 w-[450px] h-[600px] flex flex-col"
    >
      <Card className="flex flex-col h-full shadow-2xl border-2 border-rose-200">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg flex-shrink-0 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <CardTitle className="text-lg">Sweetpeas Assistant</CardTitle>
              {isSpeaking && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2 h-2 bg-green-400 rounded-full"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVoice}
                className="text-white hover:bg-white/20 h-8 w-8"
                title={voiceEnabled ? "Disable voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-purple-100 mt-1">
            Your AI business helper {voiceEnabled && '🔊'}
          </p>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {!conversationId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Starting conversation...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message, idx) => (
                <MessageBubble 
                  key={idx} 
                  message={message} 
                  onSpeak={speakText}
                />
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t bg-white rounded-b-lg flex-shrink-0">
          <div className="flex gap-2">
            <Button
              onClick={startListening}
              disabled={isLoading || !conversationId}
              variant="outline"
              size="icon"
              className={isListening ? 'bg-red-100 border-red-300' : ''}
            >
              {isListening ? <MicOff className="h-4 w-4 text-red-600" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={isListening ? "Listening..." : "Ask me anything..."}
              disabled={isLoading || !conversationId || isListening}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !conversationId}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {isListening && (
            <p className="text-xs text-gray-500 mt-2 text-center animate-pulse">
              🎤 Listening... Speak now
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}