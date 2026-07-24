import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, mount, until, tick, controllable } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';

/**
 * Attachments run in a real browser on purpose: FileReader, ClipboardEvent,
 * DataTransfer, and <img> painting are all real-DOM behaviours a fake DOM fakes
 * wrong. Files are injected through the REAL entry points (drop / paste / the
 * file input) rather than a private method, so these test what a user does.
 */

const PNG = 'data:image/png;base64,iVBORw0KGgo='; // tiny but valid enough to decode a header
function imageFile(name = 'shot.png'): File {
  // A real File with image bytes + type. Content doesn't need to be a full PNG
  // for our logic (we read it to a data URL); the type drives kind detection.
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });
}
function textFile(name = 'notes.txt'): File {
  return new File(['hello'], name, { type: 'text/plain' });
}

/** Drop files onto the composer box via a real DragEvent + DataTransfer. */
function drop(el: AiChat, files: File[]) {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  const box = el.shadowRoot!.querySelector('.composer__box')!;
  box.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}

/** Paste files (or nothing) onto the textarea via a real ClipboardEvent. */
function paste(el: AiChat, files: File[]) {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  const ta = el.shadowRoot!.querySelector('textarea')!;
  ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}

const chips = (el: AiChat) =>
  [...el.shadowRoot!.querySelectorAll('.attachment-chip')];

describe('attachments — composer', () => {
  afterEach(cleanupAll);

  it('is off by default: no attach button, drops ignored', async () => {
    const el = mount('<ai-chat></ai-chat>');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[part="attach-button"]')).toBeNull();
    drop(el, [imageFile()]);
    await tick(20);
    expect(chips(el).length).toBe(0);
  });

  it('shows the attach button when enabled', async () => {
    const el = mount('<ai-chat allow-attachments></ai-chat>');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[part="attach-button"]')).not.toBeNull();
  });

  it('hide-attach-button removes the button but paste/drop still work', async () => {
    const el = mount('<ai-chat allow-attachments hide-attach-button></ai-chat>');
    await el.updateComplete;
    // Button gone...
    expect(el.shadowRoot!.querySelector('[part="attach-button"]')).toBeNull();
    // ...but the capability is intact: a drop still stages a chip.
    drop(el, [imageFile('still-works.png')]);
    await until(() => chips(el).length === 1);
  });

  it('a dropped image becomes a preview chip that actually paints', async () => {
    const el = mount('<ai-chat allow-attachments></ai-chat>');
    await el.updateComplete;
    drop(el, [imageFile('cat.png')]);

    const chip = await until(() => chips(el)[0]);
    // Assertion that can FAIL: the thumbnail is a real <img> with layout width,
    // not an empty node. (An unfilled node would false-pass a mere existence check.)
    const img = chip.querySelector('img.attachment-chip__thumb') as HTMLImageElement;
    expect(img, 'image attachment should render an <img> thumb').not.toBeNull();
    await until(() => img.getBoundingClientRect().width > 0);
    expect(chip.textContent).toContain('cat.png');
  });

  it('remove (×) takes the chip back out of the tray', async () => {
    const el = mount('<ai-chat allow-attachments></ai-chat>');
    await el.updateComplete;
    drop(el, [imageFile()]);
    await until(() => chips(el).length === 1);

    const remove = chips(el)[0].querySelector('[part="attachment-remove"]') as HTMLButtonElement;
    remove.click();
    await until(() => chips(el).length === 0);
  });

  it('sending attaches to the user message, clears the tray, and (image + no text) is allowed', async () => {
    const el = mount('<ai-chat allow-attachments></ai-chat>');
    const c = controllable();
    el.transport = c.transport;
    await el.updateComplete;

    drop(el, [imageFile('pic.png')]);
    await until(() => chips(el).length === 1);

    // No text typed — an image alone is a valid turn. Submit the form.
    const form = el.shadowRoot!.querySelector('form.composer') as HTMLFormElement;
    form.requestSubmit();

    // A user message with the attachment lands, tray clears, transport starts.
    const user = await until(() => el.messages.find((m) => m.role === 'user'));
    expect(user.attachments?.length).toBe(1);
    expect(user.attachments![0].kind).toBe('image');
    expect(chips(el).length).toBe(0);
    await until(() => c.started);
  });

  it('renders a sent image attachment inside the message', async () => {
    const el = mount('<ai-chat allow-attachments></ai-chat>');
    el.transport = controllable().transport;
    el.messages = [
      {
        id: 'u1',
        role: 'user',
        content: 'look',
        createdAt: Date.now(),
        attachments: [
          { id: 'a1', kind: 'image', mimeType: 'image/png', name: 'p.png', size: 4, url: PNG },
        ],
      },
    ];
    await el.updateComplete;
    const img = el.shadowRoot!.querySelector(
      '[part="message-attachments"] img.message__attachment--image',
    ) as HTMLImageElement;
    expect(img, 'sent image should render inline').not.toBeNull();
    expect(img.getAttribute('src')).toBe(PNG);
  });
});

describe('attachments — paste', () => {
  afterEach(cleanupAll);

  it('pasting an image adds an attachment (with a synthesized name for nameless blobs)', async () => {
    const el = mount('<ai-chat allow-attachments></ai-chat>');
    await el.updateComplete;
    // A pasted screenshot arrives nameless.
    const nameless = new File([new Uint8Array([137, 80])], '', { type: 'image/png' });
    paste(el, [nameless]);

    const chip = await until(() => chips(el)[0]);
    // Synthesized a sensible name rather than showing an empty chip.
    expect(chip.textContent).toMatch(/pasted-image-\d+\.png/);
  });

  it('pasting plain TEXT adds no attachment (normal paste is untouched)', async () => {
    const el = mount('<ai-chat allow-attachments></ai-chat>');
    await el.updateComplete;
    // A text-only clipboard: no files. The handler must not preventDefault or add a chip.
    const dt = new DataTransfer();
    dt.setData('text/plain', 'just words');
    const ta = el.shadowRoot!.querySelector('textarea')!;
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    ta.dispatchEvent(ev);
    await tick(20);
    expect(chips(el).length).toBe(0);
    // Distinguish from the image case: the event was NOT consumed by us.
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('attachments — rejection + events', () => {
  afterEach(cleanupAll);

  it('rejects a wrong type against `accept` and fires ai-chat:attach-rejected', async () => {
    const el = mount('<ai-chat allow-attachments accept="image/*"></ai-chat>');
    await el.updateComplete;
    let rejected: any = null;
    el.addEventListener('ai-chat:attach-rejected', (e) => (rejected = (e as CustomEvent).detail));

    drop(el, [textFile('notes.txt')]); // not an image
    await until(() => rejected);
    expect(rejected.reason).toBe('type');
    expect(chips(el).length).toBe(0); // nothing staged
  });

  it('rejects an oversize file against max-attachment-size', async () => {
    const el = mount('<ai-chat allow-attachments max-attachment-size="2"></ai-chat>');
    await el.updateComplete;
    let rejected: any = null;
    el.addEventListener('ai-chat:attach-rejected', (e) => (rejected = (e as CustomEvent).detail));

    drop(el, [imageFile()]); // 4 bytes > 2
    await until(() => rejected);
    expect(rejected.reason).toBe('size');
    expect(chips(el).length).toBe(0);
  });

  it('caps at max-attachments', async () => {
    const el = mount('<ai-chat allow-attachments max-attachments="1"></ai-chat>');
    await el.updateComplete;
    drop(el, [imageFile('a.png'), imageFile('b.png')]);
    await until(() => chips(el).length === 1);
    await tick(20);
    expect(chips(el).length).toBe(1); // second one rejected as too-many
  });

  it('fires a cancelable ai-chat:attach; preventDefault drops the staged files', async () => {
    const el = mount('<ai-chat allow-attachments></ai-chat>');
    await el.updateComplete;
    let seen: any = null;
    el.addEventListener('ai-chat:attach', (e) => {
      seen = (e as CustomEvent).detail;
      e.preventDefault(); // consumer takes over entirely
    });

    drop(el, [imageFile()]);
    await until(() => seen);
    expect(seen.attachments.length).toBe(1);
    await tick(20);
    // preventDefault removed them from the tray.
    expect(chips(el).length).toBe(0);
  });
});
