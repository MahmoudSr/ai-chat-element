---
description: "Use ai-chat-element in Angular: add CUSTOM_ELEMENTS_SCHEMA, set the transport through ViewChild, and bind the dash form of events like (ai-chat-message)."
---

# Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the component (or the `NgModule`) whose
template uses `<ai-chat>`, so Angular accepts the tag:

```ts
import 'ai-chat-element';
import { openAIAdapter } from 'ai-chat-element';
import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-chat',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<ai-chat #chat theme="light" (ai-chat-message)="onMessage($event)"></ai-chat>`,
})
export class ChatComponent implements AfterViewInit {
  @ViewChild('chat') chat!: ElementRef;

  ngAfterViewInit() {
    this.chat.nativeElement.transport = openAIAdapter({
      model: 'llama3.2',
      baseURL: 'http://localhost:11434/v1/chat/completions',
    });
  }

  onMessage(e: Event) {
    console.log((e as CustomEvent).detail.message);
  }
}
```

Bind the **dash** form of events, `(ai-chat-message)`. Angular reads
`(ai-chat:message)` as a global target like `(window:resize)` and refuses to
compile it. Every event fires in both forms, so nothing is lost.
