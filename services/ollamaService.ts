import OpenAI from "openai";
import { ContentType, ContentIdea, DetailedOutline, AudienceKeyword, TrendingKeyword } from "../types";

// Ollama Pro configuration
const OLLAMA_BASE_URL = "https://ollama.com/v1";
const OLLAMA_API_KEY = "e2292209591e4e62ba9d379d275d9aac.Lz_TnimPZH8PiUTzIzgCcTyH";
const MODEL = "minimax-m2.7";

const getClient = () => new OpenAI({
  baseURL: OLLAMA_BASE_URL,
  apiKey: OLLAMA_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>, retries = 2, backoff = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if ((error?.status === 429 || error?.message?.includes('rate_limit')) && retries > 0) {
      await delay(backoff);
      return withRetry(fn, retries - 1, backoff * 2);
    }
    throw error;
  }
};

// Robust JSON parser that handles markdown code blocks
const robustParseJson = (text: string): any => {
  if (!text) return null;
  const cleanText = text.replace(/```json\n?|```/g, '').trim();
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try { return JSON.parse(arrayMatch[0]); } catch (e2) {}
    }
    const objectMatch = cleanText.match(/\[[\s\S]*\}/);
    if (objectMatch) {
      try { return JSON.parse(objectMatch[0]); } catch (e3) {}
    }
    return null;
  }
};

// Helper to build messages array for OpenAI format
const buildMessages = (system: string, userPrompt: string) => [
  { role: "system", content: system },
  { role: "user", content: userPrompt }
];

// --- Content Generation Functions ---

export const generateTrendingKeywords = async (location: string): Promise<TrendingKeyword[]> => {
  const systemInstruction = "You are a market analyst. Output ONLY a valid JSON array of objects with fields: keyword, category, searchVolumeContext. No markdown, no explanation.";
  const prompt = `Find the top 15 trending search topics, SEO keywords, and rising business interests in ${location} right now. Return a JSON array with 15 objects.`;

  try {
    const client = getClient();
    const response = await withRetry(() => client.chat.completions.create({
      model: MODEL,
      messages: buildMessages(systemInstruction, prompt),
      temperature: 0.7,
      max_tokens: 2000,
    }));
    const text = response.choices[0]?.message?.content || "";
    const result = robustParseJson(text);
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    if (error?.status === 429) throw new Error("QUOTA_EXCEEDED");
    console.error("Error generating trending keywords:", error);
    return [];
  }
};

export const generateKeywordsFromAudience = async (audience: string): Promise<AudienceKeyword[]> => {
  const systemInstruction = "You are an audience psychologist. Output ONLY a valid JSON array of objects with fields: keyword, painPoint. No markdown, no explanation.";
  const prompt = `Perform a deep audience analysis for: "${audience}". Identify 15 high-intent keywords as a JSON array of objects with 'keyword' and 'painPoint' fields.`;

  try {
    const client = getClient();
    const response = await withRetry(() => client.chat.completions.create({
      model: MODEL,
      messages: buildMessages(systemInstruction, prompt),
      temperature: 0.7,
      max_tokens: 2000,
    }));
    const text = response.choices[0]?.message?.content || "";
    const result = robustParseJson(text);
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    if (error?.status === 429) throw new Error("QUOTA_EXCEEDED");
    console.error("Error generating keywords from audience:", error);
    return [];
  }
};

export const generateContentIdeas = async (
  keyword: string,
  contentType: ContentType
): Promise<ContentIdea[]> => {
  let systemInstruction = "You are a world-class digital publishing expert. Output ONLY a raw JSON array matching the schema. No markdown, no explanation.";
  let prompt = `Build a high-revenue content strategy for the keyword: "${keyword}". Generate 8 high-value, unique ideas for the format: "${contentType}". Focus on items that can be sold or used to build a massive audience. Return a JSON array with objects containing: title, subtitle, description, targetAudience, painPointSolved, monetizationAngle.`;

  if (contentType === ContentType.AD_SNIPPETS) {
    systemInstruction = "You are a direct-response copywriting legend like Eugene Schwartz. Every output must be punchy, psychological, and perfectly formatted. Output ONLY a JSON array with 8 objects.";
    prompt = `Create 8 PERSUASIVE AD SNIPPETS for the keyword: "${keyword}".
CONSTRAINTS FOR EACH SNIPPET:
1. TITLE: Exactly 4 words. Punchy, curiosity-driven, and bold.
2. SUBTITLE: A compelling hook that promises a specific transformation.
3. DESCRIPTION: Exactly 25 words. Highly persuasive, emotional, and calls to action.
4. targetAudience: Who specifically is this for?
5. painPointSolved: What burning real-life problem does this solve?
6. monetizationAngle: How can this generate revenue?
Output ONLY a JSON array with 12 objects.`;
  }

  if (contentType === ContentType.TOP_WEBSITES) {
    systemInstruction = "You are a web research expert. For the keyword: " + keyword + ", identify 8 high-authority websites and resources. Output ONLY a JSON array.";
    prompt = `Find the top 8 best websites, tools, and high-authority resources for: "${keyword}". Return a JSON array with objects containing: title, description, targetAudience, painPointSolved, monetizationAngle (as "Resource Reference"), url.`;
  }

  try {
    const client = getClient();
    const response = await withRetry(() => client.chat.completions.create({
      model: MODEL,
      messages: buildMessages(systemInstruction, prompt),
      temperature: 0.85,
      max_tokens: 12000,
    }));
    const text = response.choices[0]?.message?.content || "";
    const parsed = robustParseJson(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error?.status === 429) throw new Error("QUOTA_EXCEEDED");
    console.error("Error generating content ideas:", error);
    return [];
  }
};

export const generateDetailedOutline = async (
  idea: ContentIdea,
  type: ContentType
): Promise<DetailedOutline | null> => {
  if (type === ContentType.TOP_WEBSITES) return null;

  let prompt = `Create a detailed and actionable outline for a ${type} titled: "${idea.title}".
Target Audience: ${idea.targetAudience}
Pain Point: ${idea.painPointSolved}
Description: ${idea.description}`;

  if (type === ContentType.CREW_AI) {
    prompt = `Create a comprehensive CrewAI Agent Manifest for: "${idea.title}". List 3-4 specialized agents. Context: ${idea.description}`;
  } else if (type === ContentType.WEB_APP || type === ContentType.MOBILE_APP) {
    prompt = `Create a technical MVP feature spec and user flow for the app idea: "${idea.title}". ${idea.description}`;
  } else if (type === ContentType.AI_AGENT) {
    prompt = `Create a System Instruction and persona for a specialized AI Agent: "${idea.title}". ${idea.description}`;
  }

  const systemInstruction = "You are an expert product architect. Provide a detailed plan in JSON format with fields: title, introHook, cta, modules (array of objects with title and points arrays).";

  try {
    const client = getClient();
    const response = await withRetry(() => client.chat.completions.create({
      model: MODEL,
      messages: buildMessages(systemInstruction, prompt),
      temperature: 0.7,
      max_tokens: 3000,
    }));
    const text = response.choices[0]?.message?.content || "";
    return robustParseJson(text);
  } catch (error: any) {
    if (error?.status === 429) throw new Error("QUOTA_EXCEEDED");
    console.error("Error generating outline:", error);
    return null;
  }
};

export const generateExpertPrompt = async (
  idea: ContentIdea,
  type: ContentType
): Promise<string> => {
  const prompt = `TASK: Create the ultimate "Mega-Prompt" for a content creator.
CREW PERSONA: Act as a crew of expert Prompt Engineers and CrewAI Specialists.
OBJECTIVE: Generate a single, detailed, highly structured prompt that a user can paste into an LLM to fully execute the following idea:

CONTENT TYPE: ${type}
TITLE: ${idea.title}
TARGET AUDIENCE: ${idea.targetAudience}
KEY PROBLEM SOLVED: ${idea.painPointSolved}
CORE CONCEPT: ${idea.description}

THE GENERATED PROMPT MUST INCLUDE:
- Act as [Specific Expert Persona]
- Contextual background
- Step-by-step instructions
- Style guidelines (tone, vocabulary, formatting)
- Specific constraints and output structure
- A "Call to Excellence" finishing instruction.

OUTPUT: Just the prompt text. Use professional Markdown.`;

  const systemInstruction = "You are the world's leading Prompt Engineering Crew. You write prompts that get 10/10 results. No conversation, just the generated prompt.";

  try {
    const client = getClient();
    const response = await withRetry(() => client.chat.completions.create({
      model: MODEL,
      messages: buildMessages(systemInstruction, prompt),
      temperature: 0.8,
      max_tokens: 4000,
    }));
    return response.choices[0]?.message?.content || "Failed to generate prompt.";
  } catch (error: any) {
    if (error?.status === 429) throw new Error("QUOTA_EXCEEDED");
    console.error("Error generating expert prompt:", error);
    return "Error generating expert prompt. Please try again.";
  }
};
