/** Inline field errors for the public forms: the message sits under the field, which is marked invalid and focused. */
export function markField(form: HTMLFormElement, name: string, text: string) {
  const field = form.elements.namedItem(name) as HTMLInputElement | RadioNodeList | null;
  const target = field instanceof RadioNodeList ? field[0] as HTMLInputElement : field;
  if (!target) return;
  const box = (target.closest('[data-field]') ?? target.closest('.field') ?? target.parentElement)!;
  const error = box.querySelector<HTMLElement>('.field-error');
  if (error) error.textContent = text;
  const marked = field instanceof RadioNodeList ? box : target;
  marked.setAttribute('aria-invalid', 'true');
  target.focus();
}

/** Clears a field's error as soon as the visitor edits or picks a value. */
export function clearOnInput(form: HTMLFormElement) {
  const clear = (event: Event) => {
    const target = event.target as HTMLElement;
    const box = target.closest('[data-field]') ?? target.closest('.field');
    if (!box) return;
    box.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    if (box.hasAttribute('aria-invalid')) box.removeAttribute('aria-invalid');
    const error = box.querySelector<HTMLElement>('.field-error');
    if (error) error.textContent = '';
  };
  form.addEventListener('input', clear);
  form.addEventListener('change', clear);
  form.addEventListener('reset', () => form.querySelectorAll<HTMLElement>('.field-error').forEach(el => { el.textContent = ''; }));
}
