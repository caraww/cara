(() => {
  const rail = document.getElementById('caraJournalRail');
  if (!rail) return;
  const cards = [...rail.querySelectorAll('[data-cara-post]')];
  const reader = document.getElementById('caraJournalReader');
  const content = document.getElementById('caraJournalContent');
  const close = document.getElementById('caraJournalClose');
  let active = null;

  document.querySelectorAll('[data-journal-scroll]').forEach(button => {
    button.addEventListener('click', () => {
      const sign = button.dataset.journalScroll === 'next' ? -1 : 1;
      rail.scrollBy({ left: sign * Math.min(rail.clientWidth * .78, 500), behavior: 'smooth' });
    });
  });

  cards.forEach(card => {
    card.setAttribute('aria-controls', 'caraJournalReader');
    card.setAttribute('aria-expanded', 'false');
    card.addEventListener('click', async event => {
      event.preventDefault();
      if (active) {
        active.classList.remove('is-active');
        active.setAttribute('aria-expanded', 'false');
      }
      active = card;
      active.classList.add('is-active');
      active.setAttribute('aria-expanded', 'true');
      reader.hidden = false;
      reader.setAttribute('aria-busy', 'true');
      content.innerHTML = '<p class="cara-journal__loading">دارم پست رو باز می‌کنم…</p>';
      reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        const response = await fetch(card.getAttribute('href'));
        if (!response.ok) throw new Error('post unavailable');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const article = doc.querySelector('.blog-article');
        if (!article) throw new Error('article not found');
        content.innerHTML = article.innerHTML;
      } catch (error) {
        const link = document.createElement('a');
        link.href = card.getAttribute('href');
        link.textContent = 'از اینجا مستقیم مقاله رو بخون.';
        const message = document.createElement('p');
        message.className = 'cara-journal__loading';
        message.append('این پست باز نشد. ', link);
        content.replaceChildren(message);
      } finally {
        reader.setAttribute('aria-busy', 'false');
      }
    });
  });

  function closeReader() {
    reader.hidden = true;
    if (active) {
      active.classList.remove('is-active');
      active.setAttribute('aria-expanded', 'false');
      active.focus();
      active = null;
    }
  }
  close.addEventListener('click', closeReader);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !reader.hidden) closeReader();
  });
})();