/**
 * Main entry point. Importing this registers the <ai-chat> custom element
 * (via the @customElement decorator side effect) and re-exports the public API.
 */
import './ai-chat.js';

export { AiChat } from './ai-chat.js';
export type {
  ChatMessage,
  ChatTransport,
  StreamChunk,
  Role,
} from './types.js';

// Adapters are also available from the dedicated `./adapters` entry point,
// but re-exported here for convenience.
export {
  openAIAdapter,
  anthropicAdapter,
  functionAdapter,
} from './adapters/index.js';
export type {
  OpenAIAdapterOptions,
  AnthropicAdapterOptions,
} from './adapters/index.js';
