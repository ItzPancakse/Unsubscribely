(() => {
    const toc = document.querySelector('.toc');
    if (!toc) return;

    const details = toc.querySelector('details');
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const desktop = window.matchMedia('(min-width: 900px)');

    if (details) {
        details.open = desktop.matches;
        desktop.addEventListener('change', (e) => {
            if (e.matches) details.open = true;
        });

        links.forEach((link) => {
            link.addEventListener('click', () => {
                if (desktop.matches) details.open = true;
            });
        });
    }

    const linkById = new Map(
      links.map((a) => [decodeURIComponent(a.getAttribute('href').slice(1)), a])
    );
    const sections = [...linkById.keys()]
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    if (!sections.length || !('IntersectionObserver' in window)) return;

    const setCurrent = (id) => {
        links.forEach((a) => a.removeAttribute('aria-current'));
        linkById.get(id)?.setAttribute('aria-current', 'true');
    };

    const inBand = new Set();
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) inBand.add(entry.target.id);
                else inBand.delete(entry.target.id);
            });
            const current = sections.find((s) => inBand.has(s.id));
            if (current) setCurrent(current.id);
        },
        { rootMargin: '-15% 0px -70% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
    setCurrent(sections[0].id);
})();