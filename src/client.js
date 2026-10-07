(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        nav.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const cards = [...document.querySelectorAll('[data-treatment-card]')];
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const categoryJumps = [...document.querySelectorAll('[data-category-jump]')];
  const search = document.querySelector('#treatment-search');
  const emptyState = document.querySelector('#empty-state');
  let activeFilter = 'all';

  function applyFilters() {
    const query = (search?.value || '').trim().toLowerCase();
    let shown = 0;
    cards.forEach(card => {
      const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
      const searchMatch = !query || (card.dataset.search || '').includes(query);
      const visible = categoryMatch && searchMatch;
      card.hidden = !visible;
      if (visible) shown++;
    });
    if (emptyState) emptyState.hidden = shown !== 0;
  }

  function setFilter(filter) {
    activeFilter = filter || 'all';
    filterButtons.forEach(button => button.classList.toggle('is-active', button.dataset.filter === activeFilter));
    applyFilters();
  }

  filterButtons.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  search?.addEventListener('input', applyFilters);

  categoryJumps.forEach(tile => {
    tile.addEventListener('click', () => {
      setFilter(tile.dataset.categoryJump);
      setTimeout(() => document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    });
  });
})();
