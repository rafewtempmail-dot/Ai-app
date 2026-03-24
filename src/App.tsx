/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  Upload, 
  Send, 
  Trash2, 
  Sparkles, 
  LayoutGrid, 
  MessageSquare, 
  Image as ImageIcon,
  Loader2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

// Initialize Gemini API lazily
let genAIInstance: any = null;
const getGenAI = () => {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }
  return genAIInstance;
};

interface Message {
  role: "user" | "model";
  text: string;
  image?: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hello! I'm your AI Organization Assistant. Upload a photo of any room, and I'll help you declutter and organize it effectively.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    console.log("DeclutterAI mounted successfully");
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64.split(",")[1]);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      role: "user",
      text: input,
      image: imagePreview || undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const model = "gemini-3.1-pro-preview";
      const ai = getGenAI();
      
      // Construct contents from history
      const contents = newMessages.map(msg => {
        const parts: any[] = [{ text: msg.text || "Analyze this" }];
        return {
          role: msg.role,
          parts
        };
      });

      // Add the current image to the last user message parts if it exists
      if (selectedImage) {
        const lastMsgParts = contents[contents.length - 1].parts;
        lastMsgParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: selectedImage,
          },
        });
      }

      const result = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: "You are a professional home organizer and decluttering expert. Your goal is to provide practical, aesthetic, and efficient organization tips based on photos of rooms. Be encouraging, specific, and prioritize high-impact changes. If no image is provided, ask the user to upload one for better advice.",
        }
      });

      const responseText = result.text || "I couldn't analyze the request. Please try again.";
      
      setMessages((prev) => [
        ...prev,
        { role: "model", text: responseText },
      ]);
      
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "Sorry, I encountered an error. Please check your connection and try again." },
      ]);
    } finally {
      setIsLoading(false);
      clearImage();
    }
  };

  if (!isMounted) return <div className="p-8 text-center">Loading DeclutterAI...</div>;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-[#E0E0E0]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[#1A1A1A] p-2 rounded-xl">
            <LayoutGrid className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">DeclutterAI</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#666666]">
          <span className="hidden sm:inline">Professional Home Organization</span>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 gap-6">
        {/* Chat Area */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5E5] flex flex-col h-[70vh] overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] space-y-2`}>
                    {msg.image && (
                      <div className="mb-2 rounded-2xl overflow-hidden border border-[#E5E5E5]">
                        <img 
                          src={msg.image} 
                          alt="Uploaded room" 
                          className="w-full max-h-64 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div 
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user" 
                          ? "bg-[#1A1A1A] text-white" 
                          : "bg-[#F9F9F9] border border-[#EEEEEE] text-[#333333]"
                      }`}
                    >
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-[#F9F9F9] border border-[#EEEEEE] p-4 rounded-2xl flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-[#666666]" />
                  <span className="text-sm text-[#666666]">Analyzing your space...</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[#E5E5E5] bg-white">
            <AnimatePresence>
              {imagePreview && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-4 relative inline-block"
                >
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="h-24 w-24 object-cover rounded-xl border border-[#E5E5E5]"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-white border border-[#E5E5E5] rounded-full p-1 shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2">
              <div className="flex-1 relative bg-[#F9F9F9] rounded-2xl border border-[#E5E5E5] focus-within:border-[#1A1A1A] transition-colors">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about your room or describe your goals..."
                  className="w-full p-4 pr-12 bg-transparent border-none focus:ring-0 text-sm resize-none min-h-[56px] max-h-32"
                  rows={1}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-[#666666] hover:bg-[#EEEEEE] rounded-xl transition-colors"
                    title="Upload photo"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="p-4 bg-[#1A1A1A] text-white rounded-2xl hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-center text-[#999999] uppercase tracking-widest font-medium">
              Powered by Gemini 3.1 Pro
            </p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Trash2, title: "Declutter", desc: "Identify items to donate or discard." },
            { icon: LayoutGrid, title: "Organize", desc: "Smart storage solutions for every room." },
            { icon: MessageSquare, title: "Advice", desc: "Expert tips on maintaining order." },
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-[#E5E5E5] shadow-sm hover:shadow-md transition-shadow">
              <item.icon className="w-6 h-6 mb-3 text-[#1A1A1A]" />
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-[#666666] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center border-t border-[#E5E5E5]">
        <p className="text-xs text-[#999999]">© 2026 DeclutterAI. Your space, reimagined.</p>
      </footer>
    </div>
  );
}
