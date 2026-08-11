import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, mount, tick } from './helpers.ts';

// A real 64x64 solid-blue PNG data URL (valid, decodable, has intrinsic size).
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACLSURBVHhe7dAxAQAgEIDAT2ImY38r3akAwy2MzLn7zIbBpgEMNg1gsGkAg00DGGwawGDTAAabBjDYNIDBpgEMNg1gsGkAg00DGGwawGDTAAabBjDYNIDBpgEMNg1gsGkAg00DGGwawGDTAAabBjDYNIDBpgEMNg1gsGkAg00DGGwawGDTAAabBjDYfOLdUg6Nh+IhAAAAAElFTkSuQmCC';

const imgAttachment = (id = 'a1') => ({
  id,
  kind: 'image' as const,
  mimeType: 'image/png',
  name: 'shot.png',
  size: 68,
  url: PNG,
});

/**
 * Attachments render OUTSIDE the bubble (iMessage/ChatGPT style): the image
 * floats with its own rounded corners; text (if any) gets its own bubble BELOW;
 * an image-only turn renders NO bubble at all. These are the user's exact
 * complaints from the in-bubble layout, pinned as geometry assertions.
 */
describe('sent-message attachment layout', () => {
  afterEach(cleanupAll);

  const now = Date.now();

  it('image-only user turn: image paints, right-aligned, and NO bubble renders', async () => {
    const el = mount();
    el.messages = [
      {
        id: 'u1',
        role: 'user',
        content: '',
        createdAt: now,
        attachments: [imgAttachment()],
      },
    ];
    await tick(60);
    const row = el.shadowRoot!.querySelector('.message--user')!;
    const img = row.querySelector('.message__attachment--image') as HTMLImageElement;
    expect(img, 'image did not render').toBeTruthy();
    await img.decode(); // ensure the data URL has painted before measuring
    expect(img.getBoundingClientRect().width, 'image does not paint').toBeGreaterThan(0);
    // No bubble for an image-only turn.
    expect(row.querySelector('.message__body')).toBeFalsy();
    // Right-aligned: the attachment block hugs the column's right edge.
    const col = row.querySelector('.message__col')!;
    const att = row.querySelector('.message__attachments')!;
    const colR = col.getBoundingClientRect();
    const attR = att.getBoundingClientRect();
    expect(Math.abs(attR.right - colR.right), 'attachments not right-aligned').toBeLessThan(3);
  });

  it('image + text: text renders in a bubble BELOW the image, not wrapping it', async () => {
    const el = mount();
    el.messages = [
      {
        id: 'u1',
        role: 'user',
        content: 'what do you see here',
        createdAt: now,
        attachments: [imgAttachment()],
      },
    ];
    await tick(60);
    const row = el.shadowRoot!.querySelector('.message--user')!;
    const att = row.querySelector('.message__attachments')!;
    const bubble = row.querySelector('.message__body')!;
    expect(att).toBeTruthy();
    expect(bubble, 'text bubble missing').toBeTruthy();
    // The attachment block is NOT inside the bubble.
    expect(bubble.contains(att)).toBe(false);
    // And it sits ABOVE the bubble.
    const attR = att.getBoundingClientRect();
    const bubR = bubble.getBoundingClientRect();
    expect(attR.bottom, 'image should sit above the text bubble').toBeLessThanOrEqual(
      bubR.top + 1,
    );
    // The bubble still shows the text.
    expect(bubble.textContent).toContain('what do you see here');
  });

  it('text-only user turn is unaffected: bubble renders, no attachment block', async () => {
    const el = mount();
    el.messages = [
      { id: 'u1', role: 'user', content: 'plain text', createdAt: now },
    ];
    await tick(60);
    const row = el.shadowRoot!.querySelector('.message--user')!;
    expect(row.querySelector('.message__body')).toBeTruthy();
    expect(row.querySelector('.message__attachments')).toBeFalsy();
    // Bubble hugs the right edge as always.
    const col = row.querySelector('.message__col')!;
    const bub = row.querySelector('.message__body')!;
    expect(
      Math.abs(bub.getBoundingClientRect().right - col.getBoundingClientRect().right),
    ).toBeLessThan(3);
  });

  it('a screenshot-sized image hugs the RIGHT edge above the bubble (the real-paste case)', async () => {
    // A real pasted screenshot has a huge natural width (1600px+). During
    // intrinsic sizing that stretches every fit-content wrapper to the full
    // column width, and the 320px display cap only applies to the img — so
    // without margin-left:auto ON THE IMG it sat on the LEFT of the stretched
    // column. Tiny test images never trigger this, which is how it slipped
    // past the earlier geometry tests.
    const c = document.createElement('canvas');
    c.width = 1600;
    c.height = 900;
    const g = c.getContext('2d')!;
    g.fillStyle = '#1e50c8';
    g.fillRect(0, 0, 1600, 900);
    const big = c.toDataURL('image/png');

    const el = mount();
    (el as unknown as HTMLElement).style.width = '700px';
    el.messages = [
      {
        id: 'u1', role: 'user', content: 'what do you see here', createdAt: now,
        attachments: [{ id: 'a1', kind: 'image', mimeType: 'image/png', name: 'shot.png', size: 999, url: big }],
      },
    ];
    await tick(100);
    const row = el.shadowRoot!.querySelector('.message--user')!;
    const img = row.querySelector('.message__attachment--image') as HTMLImageElement;
    await img.decode();
    await tick(50);
    const col = row.querySelector('.message__col')!;
    const bub = row.querySelector('.message__body')!;
    const imgR = img.getBoundingClientRect();
    const colR = col.getBoundingClientRect();
    const bubR = bub.getBoundingClientRect();
    // Capped, right-aligned, and sitting ABOVE the right-aligned bubble.
    expect(imgR.width).toBeLessThanOrEqual(321);
    expect(Math.abs(imgR.right - colR.right), 'image not hugging the right edge').toBeLessThan(3);
    expect(Math.abs(bubR.right - colR.right), 'bubble not hugging the right edge').toBeLessThan(3);
    expect(imgR.bottom).toBeLessThanOrEqual(bubR.top + 1);
  });

  it('clicking a sent image opens the preview; Esc closes it', async () => {
    const el = mount();
    el.messages = [
      { id: 'u1', role: 'user', content: '', createdAt: now, attachments: [imgAttachment()] },
    ];
    await tick(60);
    expect(el.shadowRoot!.querySelector('.preview'), 'preview open too early').toBeFalsy();
    const btn = el.shadowRoot!.querySelector('.message__image-btn') as HTMLButtonElement;
    expect(btn, 'sent image is not clickable').toBeTruthy();
    btn.click();
    await tick(30);
    const overlay = el.shadowRoot!.querySelector('.preview')!;
    expect(overlay, 'preview did not open').toBeTruthy();
    const big = overlay.querySelector('.preview__img') as HTMLImageElement;
    expect(big.src).toBe(PNG);
    // Esc closes it.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await tick(30);
    expect(el.shadowRoot!.querySelector('.preview'), 'Esc did not close preview').toBeFalsy();
  });

  it('ai-chat:preview is cancelable — preventDefault suppresses the built-in overlay', async () => {
    const el = mount();
    el.messages = [
      { id: 'u1', role: 'user', content: '', createdAt: now, attachments: [imgAttachment()] },
    ];
    await tick(60);
    let seen: any = null;
    el.addEventListener('ai-chat:preview', (e) => {
      seen = (e as CustomEvent).detail;
      e.preventDefault(); // consumer opens their own lightbox
    });
    (el.shadowRoot!.querySelector('.message__image-btn') as HTMLButtonElement).click();
    await tick(30);
    expect(seen?.attachment?.id).toBe('a1');
    expect(el.shadowRoot!.querySelector('.preview'), 'overlay should be suppressed').toBeFalsy();
  });

  it('editing still opens in the bubble for a message that has an image', async () => {
    const el = mount('<ai-chat show-edit></ai-chat>');
    el.messages = [
      {
        id: 'u1',
        role: 'user',
        content: 'caption to edit',
        createdAt: now,
        attachments: [imgAttachment()],
      },
    ];
    await tick(60);
    const btn = el.shadowRoot!.querySelector(
      '.message__action[part~="edit-button"]',
    ) as HTMLButtonElement;
    expect(btn, 'edit button missing').toBeTruthy();
    btn.click();
    await tick(30);
    const ta = el.shadowRoot!.querySelector('.message__edit textarea') as HTMLTextAreaElement;
    expect(ta, 'edit textarea missing').toBeTruthy();
    expect(ta.value).toBe('caption to edit');
    // The edit form has real width to type in (was rendering ~collapsed once).
    expect(ta.getBoundingClientRect().width).toBeGreaterThan(200);
  });
});
