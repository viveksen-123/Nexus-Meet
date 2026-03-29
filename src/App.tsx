import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { JoinMeeting } from "./components/JoinMeeting";
import { MeetingRoom } from "./components/MeetingRoom";
import { CodeBackground } from "./components/CodeBackground";
import { User } from "./types";
import { LogOut, Video, Terminal } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          email: firebaseUser.email,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRoomId(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 overflow-hidden">
        <CodeBackground />
        <div className="w-full max-w-md p-8 bg-neutral-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-500/20 rounded-full border border-blue-500/30">
              <Terminal className="w-10 h-10 text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Nexus Meet</h1>
          <p className="text-neutral-400 mb-8">Secure, high-quality video conferencing for everyone.</p>
          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {!roomId ? (
        <>
          <CodeBackground />
          <nav className="flex items-center justify-between px-6 py-4 bg-neutral-900/50 backdrop-blur-md border-b border-white/5 relative z-10">
            <div className="flex items-center gap-2">
              <Terminal className="w-8 h-8 text-blue-500" />
              <span className="text-xl font-bold text-white tracking-tight">Nexus Meet</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-white/10" alt={user.displayName || ""} />
                <span className="text-sm font-medium text-neutral-300 hidden sm:block">{user.displayName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </nav>
          <div className="relative z-10">
            <JoinMeeting onJoin={setRoomId} user={user} />
          </div>
        </>
      ) : (
        <MeetingRoom roomId={roomId} user={user} onLeave={() => setRoomId(null)} />
      )}
    </div>
  );
}
