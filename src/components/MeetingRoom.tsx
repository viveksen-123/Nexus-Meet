import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import Peer from "simple-peer";
import { User, Message, Participant } from "../types";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Users, ScreenShare, Hand, 
  Settings, MoreVertical, Send, X
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface MeetingRoomProps {
  roomId: string;
  user: User;
  onLeave: () => void;
}

interface PeerConnection {
  peerId: string;
  peer: Peer.Instance;
  stream?: MediaStream;
  name: string;
}

export function MeetingRoom({ roomId, user, onLeave }: MeetingRoomProps) {
  const [peers, setPeers] = useState<PeerConnection[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<PeerConnection[]>([]);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    socketRef.current = io();

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        socketRef.current?.emit("join-room", roomId, user.uid);

        socketRef.current?.on("user-connected", (userId: string) => {
          console.log("User connected:", userId);
          const peer = createPeer(userId, socketRef.current!.id!, stream);
          peersRef.current.push({
            peerId: userId,
            peer,
            name: "Guest", // In a real app, fetch name from DB
          });
          setPeers([...peersRef.current]);
        });

        socketRef.current?.on("signal", (data: { from: string; signal: any }) => {
          const item = peersRef.current.find((p) => p.peerId === data.from);
          if (item) {
            item.peer.signal(data.signal);
          } else {
            // If we receive a signal from someone we don't have a peer for, it's an incoming call
            const peer = addPeer(data.signal, data.from, stream);
            peersRef.current.push({
              peerId: data.from,
              peer,
              name: "Guest",
            });
            setPeers([...peersRef.current]);
          }
        });

        socketRef.current?.on("user-disconnected", (userId: string) => {
          const item = peersRef.current.find((p) => p.peerId === userId);
          if (item) {
            item.peer.destroy();
          }
          const remainingPeers = peersRef.current.filter((p) => p.peerId !== userId);
          peersRef.current = remainingPeers;
          setPeers(remainingPeers);
        });

        socketRef.current?.on("receive-message", (message: Message) => {
          setMessages((prev) => [...prev, message]);
        });

        socketRef.current?.on("user-raised-hand", (data: { userId: string; isRaised: boolean }) => {
          // Handle hand raise UI update
        });

      } catch (err) {
        console.error("Failed to get media devices:", err);
      }
    };

    initMedia();

    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      socketRef.current?.disconnect();
      peersRef.current.forEach((p) => p.peer.destroy());
    };
  }, [roomId]);

  const createPeer = (userToSignal: string, callerId: string, stream: MediaStream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current?.emit("signal", {
        to: userToSignal,
        from: callerId,
        signal,
      });
    });

    peer.on("stream", (remoteStream) => {
      const p = peersRef.current.find((p) => p.peerId === userToSignal);
      if (p) {
        p.stream = remoteStream;
        setPeers([...peersRef.current]);
      }
    });

    return peer;
  };

  const addPeer = (incomingSignal: any, callerId: string, stream: MediaStream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current?.emit("signal", {
        to: callerId,
        from: socketRef.current!.id!,
        signal,
      });
    });

    peer.on("stream", (remoteStream) => {
      const p = peersRef.current.find((p) => p.peerId === callerId);
      if (p) {
        p.stream = remoteStream;
        setPeers([...peersRef.current]);
      }
    });

    peer.signal(incomingSignal);
    return peer;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        peersRef.current.forEach((p) => {
          p.peer.replaceTrack(
            localStream!.getVideoTracks()[0],
            screenTrack,
            localStream!
          );
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      peersRef.current.forEach((p) => {
        p.peer.replaceTrack(
          screenTrackRef.current!,
          localStream!.getVideoTracks()[0],
          localStream!
        );
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      setIsScreenSharing(false);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const msg: Message = {
        id: Date.now().toString(),
        senderId: user.uid,
        senderName: user.displayName || "Anonymous",
        text: newMessage,
        timestamp: Date.now(),
      };
      socketRef.current?.emit("send-message", { roomId, message: msg });
      setNewMessage("");
    }
  };

  const toggleHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socketRef.current?.emit("raise-hand", { roomId, userId: user.uid, isRaised: newState });
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-white/10 rounded-full text-sm font-medium">
            {roomId}
          </div>
          <div className="h-4 w-px bg-white/20"></div>
          <span className="text-sm text-neutral-400">Nexus Meet Session</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
            className={cn("p-2 rounded-lg transition-colors", showParticipants ? "bg-blue-600 text-white" : "text-neutral-400 hover:bg-white/10")}
          >
            <Users className="w-5 h-5" />
          </button>
          <button 
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
            className={cn("p-2 rounded-lg transition-colors", showChat ? "bg-blue-600 text-white" : "text-neutral-400 hover:bg-white/10")}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className={cn(
            "grid gap-4 w-full h-full max-w-6xl max-h-[80vh]",
            peers.length === 0 ? "grid-cols-1" : 
            peers.length === 1 ? "grid-cols-1 md:grid-cols-2" :
            peers.length <= 3 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"
          )}>
            {/* Local Video */}
            <div className="relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden border-2 border-white/5 group">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={cn("w-full h-full object-cover", isVideoOff && "hidden")}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-neutral-700 flex items-center justify-center text-4xl font-bold">
                    {user.displayName?.[0] || "?"}
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg text-sm">
                {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                <span>You</span>
                {isHandRaised && <Hand className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
              </div>
            </div>

            {/* Remote Videos */}
            {peers.map((peer) => (
              <VideoTile key={peer.peerId} peer={peer} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {(showChat || showParticipants) && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="w-96 bg-neutral-800 border-l border-white/10 flex flex-col z-20"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold">{showChat ? "In-call messages" : "Participants"}</h3>
                <button onClick={() => { setShowChat(false); setShowParticipants(false); }} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {showChat ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-neutral-500 mt-10">
                        <p className="text-sm">Messages can only be seen by people in the call and are deleted when the call ends.</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-neutral-400">{msg.senderName}</span>
                            <span className="text-[10px] text-neutral-500">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm bg-white/5 p-2 rounded-lg inline-block self-start max-w-[90%]">
                            {msg.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
                      <input
                        type="text"
                        placeholder="Send a message"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                      />
                      <button type="submit" disabled={!newMessage.trim()} className="text-blue-500 disabled:opacity-50">
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                        {user.displayName?.[0]}
                      </div>
                      <span className="text-sm font-medium">{user.displayName} (You)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-neutral-400" />}
                    </div>
                  </div>
                  {peers.map((p) => (
                    <div key={p.peerId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold">
                          {p.name[0]}
                        </div>
                        <span className="text-sm font-medium">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <Mic className="w-4 h-4 text-neutral-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="px-6 py-6 bg-neutral-900 border-t border-white/10 flex items-center justify-between z-10">
        <div className="hidden md:block">
          <p className="text-sm font-medium text-neutral-400">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {roomId}</p>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={toggleMute}
            className={cn(
              "p-3 rounded-full transition-all",
              isMuted ? "bg-red-500 hover:bg-red-600" : "bg-neutral-800 hover:bg-neutral-700"
            )}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button 
            onClick={toggleVideo}
            className={cn(
              "p-3 rounded-full transition-all",
              isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-neutral-800 hover:bg-neutral-700"
            )}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
          <button 
            onClick={toggleScreenShare}
            className={cn(
              "p-3 rounded-full transition-all",
              isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-neutral-800 hover:bg-neutral-700"
            )}
          >
            <ScreenShare className="w-6 h-6" />
          </button>
          <button 
            onClick={toggleHand}
            className={cn(
              "p-3 rounded-full transition-all",
              isHandRaised ? "bg-yellow-500 hover:bg-yellow-600" : "bg-neutral-800 hover:bg-neutral-700"
            )}
          >
            <Hand className={cn("w-6 h-6", isHandRaised && "fill-white")} />
          </button>
          <button className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-all">
            <MoreVertical className="w-6 h-6" />
          </button>
          <button 
            onClick={onLeave}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-all px-6"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <button className="p-2 text-neutral-400 hover:bg-white/10 rounded-lg">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface VideoTileProps {
  peer: PeerConnection;
  key?: string | number;
}

const VideoTile = ({ peer }: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden border-2 border-white/5 group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      {!peer.stream && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse w-12 h-12 rounded-full bg-neutral-700"></div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg text-sm">
        <span>{peer.name}</span>
      </div>
    </div>
  );
}
