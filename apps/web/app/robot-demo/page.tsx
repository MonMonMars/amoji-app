'use client';
// Live demo of the Amoji Robot Face engine (the B2B product).
// Open /robot-demo, type anything — the face shows the matching emotion.
import { useEffect, useRef, useState } from 'react';
import { AmojiFace, ledFrame, LED_SIZE } from '../../lib/robot-face';

const EMOTION_BUTTONS = ['joy', 'love', 'excitement', 'surprise', 'confusion', 'sadness', 'anger', 'fear'];

const SNIPPET = `import { AmojiFace, HttpDriver } from '@amoji/robot-face';

// any robot with a screen or LED face — Unitree, Tesla-bot builds, DIY
const face = new AmojiFace({
  driver: new HttpDriver('http://ROBOT_IP:8080/api/face'), // your bridge
});
face.start();

// that's it. she feels what she says:
face.say('你好！見到你真好！');   // → smiling face + speech
face.say('今日有啲攰……');        // → drooping eyes, slow bob
face.setEmotion('surprise', 1);  // direct control from your stack`;

export default function RobotDemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ledRef = useRef<HTMLCanvasElement>(null);
  const faceRef = useRef<AmojiFace | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    const face = new AmojiFace({ canvas: canvasRef.current, holdMs: 4000 });
    face.start();
    faceRef.current = face;
    // LED-matrix preview (16×16 buffer scaled up, pixelated)
    let raf = 0;
    const loop = () => {
      const led = ledRef.current;
      if (led) {
        const ctx = led.getContext('2d');
        if (ctx) {
          const frame = ledFrame(face.current, performance.now() / 1000, LED_SIZE);
          const img = ctx.createImageData(LED_SIZE, LED_SIZE);
          for (let i = 0; i < LED_SIZE * LED_SIZE; i++) {
            img.data[i * 4] = frame[i * 3];
            img.data[i * 4 + 1] = frame[i * 3 + 1];
            img.data[i * 4 + 2] = frame[i * 3 + 2];
            img.data[i * 4 + 3] = 255;
          }
          ctx.putImageData(img, 0, 0);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); face.stop(); };
  }, []);

  const speak = () => {
    const t = text.trim();
    if (t) faceRef.current?.say(t);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center gap-5 bg-[#0b0b0f] px-4 py-8 text-white">
      <a href="./setup" className="self-start text-white/50">←</a>
      <h1 className="text-2xl font-bold">🤖 Amoji Robot Face</h1>
      <p className="-mt-3 text-sm text-white/50">B2B demo — the emotion engine your robot can plug into</p>

      <canvas ref={canvasRef} width={360} height={300} className="w-full max-w-sm rounded-3xl border border-white/10 bg-black" />

      <div className="flex items-center gap-3">
        <canvas ref={ledRef} width={LED_SIZE} height={LED_SIZE} className="h-28 w-28 rounded-xl border border-white/10" style={{ imageRendering: 'pixelated' }} />
        <p className="max-w-[10rem] text-xs text-white/40">LED-matrix preview — same buffer your robot receives (16×16 RGB)</p>
      </div>

      <div className="flex w-full max-w-sm flex-wrap justify-center gap-2">
        {EMOTION_BUTTONS.map((e) => (
          <button
            key={e}
            onClick={() => faceRef.current?.setEmotion(e, 1)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs capitalize hover:bg-white/15"
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex w-full max-w-sm gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && speak()}
          placeholder="Type anything… the face feels it"
          className="h-11 flex-1 rounded-full border border-white/10 bg-black/40 px-4 text-white placeholder-white/30 outline-none focus:border-white/40"
        />
        <button onClick={speak} className="h-11 rounded-full bg-[#7c6cff] px-5 text-sm font-semibold">➤</button>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="mb-2 text-sm font-bold">Plug-and-use — 3 lines on your robot</p>
        <pre className="overflow-x-auto whitespace-pre text-[11px] leading-relaxed text-emerald-300/90">{SNIPPET}</pre>
      </div>

      <p className="text-center text-xs text-white/40">
        Same engine as the companion app — monitor display, LED matrix, or robotic face.<br />
        Emotion + lipsync + body expression from one API.
      </p>
    </main>
  );
}
