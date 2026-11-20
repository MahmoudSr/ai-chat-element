# React and Next.js

Three things matter in React:

- **Properties** like `transport` are objects, so set them on the element in an
  effect, not as JSX attributes.
- **Events** have a colon in their name (`ai-chat:message`), so subscribe with
  `addEventListener`.
- **On a server-rendering framework** (Next.js), load the package on the client
  only.

```tsx
'use client'; // Next.js app router: this component runs on the client
import 'ai-chat-element';
import { functionAdapter } from 'ai-chat-element';
import type { AiChat } from 'ai-chat-element';
import { useEffect, useRef } from 'react';

export function Chat() {
  const ref = useRef<AiChat>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Talk to your own /api/chat route so the API key stays on the server.
    el.transport = functionAdapter(async function* (messages, signal) {
      const res = await fetch('/api/chat', {
        method: 'POST',
        signal,
        body: JSON.stringify(messages),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value);
      }
    });

    const onMessage = (e: Event) => console.log((e as CustomEvent).detail.message);
    el.addEventListener('ai-chat:message', onMessage);
    return () => el.removeEventListener('ai-chat:message', onMessage);
  }, []);

  return <ai-chat ref={ref} theme="dark" />;
}
```

## Next.js

`'use client'` isn't always enough: in the pages router, or anywhere a
component can still render on the server, import it with server rendering off:

```tsx
import dynamic from 'next/dynamic';

const Chat = dynamic(() => import('./Chat'), { ssr: false });
```

## TypeScript

For `<ai-chat>` to typecheck in JSX, augment `React.JSX` once:

```ts
import type { AiChat } from 'ai-chat-element';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ai-chat': DetailedHTMLProps<HTMLAttributes<AiChat>, AiChat> & {
        theme?: 'auto' | 'light' | 'dark';
        placeholder?: string;
        'show-header'?: boolean;
      };
    }
  }
}
```

Add the attributes you use. Unlisted ones still work at runtime; they just
aren't typed.
