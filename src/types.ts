export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Participant {
  userId: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
}
