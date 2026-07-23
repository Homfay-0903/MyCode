import { anthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import {
  findSupportedChatModel,
  type SupportedChatModel,
  type SupportedChatModelId,
  type SupportedProvider,
} from "@mycode/shared";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { LanguageModel } from "ai";

type AnthropicModelId = Extract<SupportedChatModel, { provider: "anthropic" }>["id"];
type OpenAIModelId = Extract<SupportedChatModel, { provider: "openai" }>["id"];
type ZhipuModelId = Extract<SupportedChatModel, { provider: "zhipu" }>["id"];
type DeepSeekModelId = Extract<SupportedChatModel, { provider: "deepseek" }>["id"];

export type ResolvedModel = {
  model: LanguageModel;
  provider: SupportedProvider;
  modelId: SupportedChatModelId;
  providerOptions?: ProviderOptions;
};

const ANTHROPIC_PROVIDER_OPTIONS: Partial<Record<AnthropicModelId, ProviderOptions>> = {
  "claude-opus-4-6": {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: 10000,
      }
    },
  },
  "claude-sonnet-4-6": {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: 10000,
      },
    },
  },
};

const OPENAI_PROVIDER_OPTIONS: Partial<Record<OpenAIModelId, ProviderOptions>> = {
  "gpt-5.4": {
    openai: {
      thinking: {
        reasoningSummary: "detailed",
      }
    },
  },
};

// Create Zhipu provider (GLM models)
// Uses .chat() to target the /v1/chat/completions endpoint
// because GLM API does not support OpenAI's /v1/responses endpoint.
const zhipu = createOpenAI({
  apiKey: process.env.GLM_API_KEY,
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
});

// Create DeepSeek provider
// Uses .chat() to target the /v1/chat/completions endpoint
// because DeepSeek API does not support OpenAI's /v1/responses endpoint.
const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

function assertUnsupportedProvider(provider: never): never {
  throw new Error(`Unsupported provider: ${provider}`);
};

function resolveAnthropicModel(modelId: AnthropicModelId): ResolvedModel {
  return {
    model: anthropic(modelId),
    provider: "anthropic",
    modelId,
    providerOptions: ANTHROPIC_PROVIDER_OPTIONS[modelId],
  };
};

function resolveOpenAIModel(modelId: OpenAIModelId): ResolvedModel {
  return {
    model: openai(modelId),
    provider: "openai",
    modelId,
    providerOptions: OPENAI_PROVIDER_OPTIONS[modelId],
  };
};

function resolveZhipuModel(modelId: ZhipuModelId): ResolvedModel {
  return {
    // Use .chat() because GLM API only supports /v1/chat/completions
    model: zhipu.chat(modelId),
    provider: "zhipu",
    modelId,
  };
};

function resolveDeepSeekModel(modelId: DeepSeekModelId): ResolvedModel {
  return {
    // Use .chat() because DeepSeek API only supports /v1/chat/completions
    model: deepseek.chat(modelId),
    provider: "deepseek",
    modelId,
  };
};

function resolveSupportedChatModel(model: SupportedChatModel): ResolvedModel {
  const provider = model.provider;

  switch (provider) {
    case "anthropic":
      return resolveAnthropicModel(model.id);
    case "openai":
      return resolveOpenAIModel(model.id);
    case "zhipu":
      return resolveZhipuModel(model.id);
    case "deepseek":
      return resolveDeepSeekModel(model.id);
    default:
      return assertUnsupportedProvider(provider);
  }
};

export function isSupportedChatModel(modelId: string): modelId is SupportedChatModelId {
  return findSupportedChatModel(modelId) != null;
};

export function resolveChatModel(modelId: string): ResolvedModel {
  const model = findSupportedChatModel(modelId);
  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  return resolveSupportedChatModel(model);
};
