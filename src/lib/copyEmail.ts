// "Copy address" next to the public email: for visitors without a mail client set up.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy-email]')) {
  const status = button.nextElementSibling as HTMLElement | null;
  if (!navigator.clipboard) continue;
  button.hidden = false;
  let timer: number | undefined;
  button.addEventListener('click', async () => {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(button.dataset.copyEmail!);
      if (status) status.textContent = button.dataset.done!;
    } catch {
      const range = document.createRange();
      range.selectNodeContents(button.previousElementSibling!);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    }
    timer = window.setTimeout(() => { if (status) status.textContent = ''; }, 3000);
  });
}
