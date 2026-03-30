import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { cn } from '@/src/lib/utils';
import Markdown from 'react-markdown';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function AIAssistant({ contextData }: { contextData: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Halo! Saya asisten AI Anda. Ada yang bisa saya bantu tentang portofolio saham atau Efficient Frontier ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const contextDataForAI = contextData ? { ...contextData, scatterPoints: undefined } : null;

      const systemInstruction = `Anda adalah asisten AI ahli keuangan (Hedge Fund Engineer) yang membantu pengguna memahami Efficient Frontier dan portofolio saham Indonesia. 
      Gunakan bahasa Indonesia yang profesional namun mudah dipahami.
      Anda dapat menjawab pertanyaan apapun terkait investasi, saham, analisis teknikal/fundamental, dan cara memaksimalkan kombinasi portofolio.
      Jika pengguna bertanya tentang data saat ini, gunakan konteks berikut (jika ada):
      ${contextDataForAI ? JSON.stringify(contextDataForAI) : 'Belum ada data portofolio yang dihitung.'}
      Berikan saran yang praktis dan dapat ditindaklanjuti untuk memaksimalkan return dan meminimalkan risiko.
      Jawab dengan ringkas dan informatif.`;

      // Convert our messages to the format expected by the Gemini API
      const history = newMessages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction,
        }
      });

      // Send the entire history to maintain context
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
        }
      });

      setMessages(prev => [...prev, { role: 'model', content: response.text || 'Maaf, saya tidak dapat merespons saat ini.' }]);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Maaf, terjadi kesalahan saat menghubungi AI.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-blue-600 hover:bg-blue-500 text-white"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] shadow-[0_0_25px_rgba(59,130,246,0.2)] flex flex-col z-50 border-blue-900/50 bg-slate-950/95 backdrop-blur-md">
          <CardHeader className="p-4 bg-slate-900 border-b border-slate-800 text-slate-200 rounded-t-xl flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-base font-medium text-blue-400">Nusa Assistant</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-200" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-4 overflow-y-auto space-y-4 bg-transparent">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                  msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-br-sm shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm shadow-sm prose prose-sm prose-invert"
                )}>
                  {msg.role === 'user' ? msg.content : (
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <CardFooter className="p-3 bg-slate-900 border-t border-slate-800 rounded-b-xl">
            <form 
              className="flex w-full space-x-2" 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
              <Input 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..." 
                className="flex-1 bg-slate-950 border-slate-800 text-slate-200 focus-visible:ring-blue-500"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
