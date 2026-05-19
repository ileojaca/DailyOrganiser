import Anthropic from '@anthropic-ai/sdk';

export type AIProvider = 'auto' | 'anthropic' | 'openrouter';

export interface AICallOptions {
  provider?: AIProvider;
  model?: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

export const ANTHROPIC_MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku (Fast)' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet (Balanced)' },
  { id: 'claude-opus-4-7', name: 'Claude Opus (Most Capable)' },
];

export const OPENROUTER_MODELS = [
  { id: 'anthropic/claude-haiku-4-5', name: 'Claude Haiku (via OpenRouter)' },
  { id: 'anthropic/claude-sonnet-4-6', name: 'Claude Sonnet (via OpenRouter)' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)' },
];

export async function callAI(options: AICallOptions): Promise<string | null> {
  const { prompt, systemPrompt, maxTokens = 400 } = options;
  const provider = options.provider || 'auto';

  const tryAnthropic = async (model: string) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    const client = new Anthropic({ apiKey });
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    };
    if (systemPrompt) params.system = systemPrompt;
    const msg = await client.messages.create(params);
    return msg.content[0].type === 'text' ? msg.content[0].text : null;
  };

  const tryOpenRouter = async (model: string) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null;
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });
    const res = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'DailyOrganiser',
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  };

  if (provider === 'anthropic') {
    return tryAnthropic(options.model || 'claude-haiku-4-5-20251001');
  }

  if (provider === 'openrouter') {
    return tryOpenRouter(options.model || 'meta-llama/llama-3.1-8b-instruct:free');
  }

  // auto: try Anthropic first, then OpenRouter
  const anthropicResult = await tryAnthropic(options.model || 'claude-haiku-4-5-20251001').catch(() => null);
  if (anthropicResult) return anthropicResult;

  return tryOpenRouter(options.model || 'meta-llama/llama-3.1-8b-instruct:free').catch(() => null);
}
