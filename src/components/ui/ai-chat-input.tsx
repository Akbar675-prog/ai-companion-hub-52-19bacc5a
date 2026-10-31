"use client";

/**
 * Chat input entry point. The implementation keeps the existing model, plugin,
 * attachment, document, and stop-response integrations used by the chat route.
 */
export {
  PromptBox as PromptInput,
  type PromptBoxProps as PromptInputProps,
} from "./chatgpt-prompt-input";
