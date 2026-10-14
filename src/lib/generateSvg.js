import { GoogleGenerativeAI } from '@google/generative-ai';

const SVG_SYSTEM_PROMPT = `You are an expert SVG diagram generator for technical documentation. Generate clean, professional SVG diagrams.

RULES:
- Return ONLY raw SVG code. No markdown fences, no explanation, no wrapping text.
- Use viewBox="0 0 680 H" where H fits content (typically 300-600).
- Use professional colors: Blues #3b82f6 #2563eb, Purples #8b5cf6, Greens #10b981, Ambers #f59e0b, Grays #64748b #1e293b, Backgrounds #f8fafc #f1f5f9.
- Use rx="8" on rects, font-family="Inter, system-ui, sans-serif", text-anchor="middle", dominant-baseline="central".
- Use stroke-width="1" for borders, stroke-width="2" for connectors.
- Include a subtle background rect with fill="#f8fafc" rx="12".
- Keep text 12-14px for labels, 16-18px for headings.
- Define arrowhead markers in <defs> if using arrows.`;

export async function generateSvgDiagram(prompt, context) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('AI service not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  let userPrompt = `Generate an SVG diagram: ${prompt}`;
  if (context) userPrompt += `\n\nContext: ${context}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: SVG_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
  });

  let svgText = result.response.text();
  svgText = svgText.replace(/```svg\n?/g, '').replace(/```xml\n?/g, '').replace(/```\n?/g, '').trim();

  const svgMatch = svgText.match(/<svg[\s\S]*<\/svg>/);
  if (!svgMatch) throw new Error('Could not extract valid SVG');

  return svgMatch[0];
}
