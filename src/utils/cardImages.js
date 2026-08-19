const imageModules = import.meta.glob('../assets/images/Cards/*.png', {
    eager: true,
    import: 'default',
});

const normalizeName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim();

const cardImageMap = Object.fromEntries(
    Object.entries(imageModules).map(([path, imageUrl]) => {
        const fileName = path.split('/').pop().replace(/\.png$/i, '');
        return [normalizeName(fileName), imageUrl];
    })
);

export const getCardImage = (card) =>
    cardImageMap[normalizeName(card?.cardName)] ?? card?.cardImageUrl ?? '';
