// ============================================================
// INTEGRATION FILE 2/5: AI plant identify
// Demo/mock me ek nakli (demo) jawab aata hai. Asli mode me aapka Supabase Edge Function call hota hai
// (Gemini ki key sirf us Edge Function me rahegi, kabhi browser me nahi).
// Kya badalna hai: .env me VITE_AI_PROVIDER=edge aur VITE_AI_EDGE_URL=<aapka function URL>.
// Function ko {image: "data:image/jpeg;base64,..."} milega aur ye JSON wapas dena hai:
//   { suggestions: [{ name: string, confidence: number(0-1), care: string }] }
// ============================================================
import { config } from '../config';

export interface PlantGuess { name: string; confidence: number; care: string }
export interface IdentifyResult { suggestions: PlantGuess[]; demo: boolean }

const MOCK: PlantGuess[] = [
  { name: 'Tulsi (Holy Basil)', confidence: 0.82, care: 'Roz paani, poori dhoop. Phool aate hi todo.' },
  { name: 'Money Plant', confidence: 0.74, care: 'Halki dhoop, hafte me 2 baar paani.' },
  { name: 'Aloe Vera', confidence: 0.71, care: 'Kam paani, achhi dhoop.' },
  { name: 'Snake Plant', confidence: 0.69, care: 'Bahut kam paani; kam roshni me bhi theek.' },
];

export async function identifyPlant(imageDataUrl: string): Promise<IdentifyResult> {
  if (config.aiProvider === 'edge' && config.aiEdgeUrl) {
    const res = await fetch(config.aiEdgeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: imageDataUrl }) });
    if (!res.ok) throw new Error('AI service ne jawab nahi diya');
    const json = (await res.json()) as { suggestions?: PlantGuess[] };
    return { suggestions: json.suggestions ?? [], demo: false };
  }
  await new Promise((r) => setTimeout(r, 900));
  const start = imageDataUrl.length % MOCK.length;
  return { suggestions: [MOCK[start], MOCK[(start + 1) % MOCK.length]], demo: true };
}
