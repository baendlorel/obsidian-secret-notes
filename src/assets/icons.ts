export const lockIcon = (el: HTMLElement) => {
  el.createSvg('svg', { cls: 'secret-notes-card__icon', attr: { viewBox: '0 0 16 16' } }, (svg) => {
    svg.createSvg('path', {
      attr: {
        'fill-rule': 'evenodd',
        d: 'M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4M4.5 7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7zM8 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3',
      },
    });
  });
};

export const unlockIcon = (el: HTMLElement) => {
  el.createSvg('svg', { cls: 'secret-notes-card__icon', attr: { viewBox: '0 0 16 16' } }, (svg) => {
    svg.createSvg('path', {
      attr: {
        'fill-rule': 'evenodd',
        d: 'M12 0a4 4 0 0 1 4 4v2.5h-1V4a3 3 0 1 0-6 0v2h.5A2.5 2.5 0 0 1 12 8.5v5A2.5 2.5 0 0 1 9.5 16h-7A2.5 2.5 0 0 1 0 13.5v-5A2.5 2.5 0 0 1 2.5 6H8V4a4 4 0 0 1 4-4M2.5 7A1.5 1.5 0 0 0 1 8.5v5A1.5 1.5 0 0 0 2.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 9.5 7z',
      },
    });
  });
};

export const searchIcon = (el: HTMLElement) => {
  el.createSvg('svg', { cls: 'secret-notes-searcher__trigger-icon', attr: { viewBox: '0 0 16 16' } }, (svg) => {
    svg.createSvg('path', {
      attr: {
        d: 'M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0',
      },
    });
  });
};
