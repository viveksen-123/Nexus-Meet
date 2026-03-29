import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Float, Stars } from "@react-three/drei";
import * as THREE from "three";

function CodeLine({ position, text, speed }: { position: [number, number, number]; text: string; speed: number }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y -= speed;
      if (ref.current.position.y < -15) {
        ref.current.position.y = 15;
      }
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={ref} position={position}>
        <Text
          fontSize={0.4}
          color="#3b82f6"
          font="https://fonts.gstatic.com/s/jetbrainsmono/v18/t63v2oZ6uS765J2Gc_p7.woff"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.3}
        >
          {text}
        </Text>
      </group>
    </Float>
  );
}

function CodingGrid() {
  const lines = useMemo(() => {
    const codeSnippets = [
      "const meet = new NexusMeet();",
      "import { io } from 'socket.io';",
      "peer.on('signal', (data) => {",
      "socket.emit('join-room', roomId);",
      "await navigator.mediaDevices.getUserMedia();",
      "export default function App() {",
      "return <MeetingRoom />;",
      "const [peers, setPeers] = useState([]);",
      "useEffect(() => { initMedia(); }, []);",
      "peer.signal(incomingSignal);",
      "io.to(roomId).emit('message', msg);",
      "const stream = await getDisplayMedia();",
    ];
    
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20 - 10,
      ] as [number, number, number],
      text: codeSnippets[Math.floor(Math.random() * codeSnippets.length)],
      speed: 0.01 + Math.random() * 0.03,
    }));
  }, []);

  return (
    <group>
      {lines.map((line) => (
        <CodeLine key={line.id} {...line} />
      ))}
      <gridHelper args={[100, 50, 0x1e293b, 0x0f172a]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -15]} />
    </group>
  );
}

export function CodeBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#020617]">
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <CodingGrid />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617]/80"></div>
    </div>
  );
}
