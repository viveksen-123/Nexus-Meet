import React, { useState } from "react";
import { User } from "../types";
import { Video, Keyboard, Plus, ArrowRight } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface JoinMeetingProps {
  onJoin: (roomId: string) => void;
  user: User;
}

export function JoinMeeting({ onJoin, user }: JoinMeetingProps) {
  const [inputRoomId, setInputRoomId] = useState("");

  const handleCreateMeeting = () => {
    const newRoomId = uuidv4().substring(0, 8);
    onJoin(newRoomId);
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRoomId.trim()) {
      onJoin(inputRoomId.trim());
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-16">
      <div className="flex-1 text-center lg:text-left">
        <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 tracking-tight">
          Premium video meetings. <br />
          <span className="text-blue-500">Built for developers.</span>
        </h1>
        <p className="text-xl text-neutral-400 mb-10 max-w-2xl">
          A secure, high-performance video conferencing platform with a 3D coding environment aesthetic.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
          <button
            onClick={handleCreateMeeting}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New meeting
          </button>
          
          <form onSubmit={handleJoinMeeting} className="flex items-center gap-2 relative">
            <div className="relative">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                placeholder="Enter a code or link"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                className="pl-11 pr-4 py-3 bg-neutral-900/50 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 backdrop-blur-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!inputRoomId.trim()}
              className="p-3 text-blue-400 hover:bg-blue-500/10 disabled:opacity-50 disabled:hover:bg-transparent rounded-lg transition-colors"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </form>
        </div>
        
        <div className="mt-12 pt-12 border-t border-white/5">
          <p className="text-sm text-neutral-500">
            <span className="text-blue-500 font-medium hover:underline cursor-pointer">View documentation</span> | <span className="text-blue-500 font-medium hover:underline cursor-pointer">API Reference</span>
          </p>
        </div>
      </div>
      
      <div className="flex-1 w-full max-w-xl">
        <div className="relative aspect-video bg-neutral-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden group">
          <img 
            src="https://picsum.photos/seed/coding/800/450" 
            alt="Meeting preview" 
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <h3 className="text-xl font-semibold mb-1">Secure by default</h3>
            <p className="text-sm text-neutral-400">End-to-end encryption and advanced security features for every meeting.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
