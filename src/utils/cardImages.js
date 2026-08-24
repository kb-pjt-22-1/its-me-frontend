const imageModules = import.meta.glob('../assets/images/Cards/*.png', {
    eager: true,
    import: 'default',
});

const normalizeName = (name) =>
    String(name ?? '')
        .normalize('NFC')
        .replace(/[:：]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const cardImageMap = Object.fromEntries(
    Object.entries(imageModules).map(([path, imageUrl]) => {
        const fileName = path.split('/').pop().replace(/\.png$/i, '');
        return [normalizeName(fileName), imageUrl];
    })
);

// card_image_url은 'Cards/ALL 카드.png' 또는 '/Cards/ALL 카드.png'처럼 src/images/ 밑
// 상대 경로를 담고 있을 수 있습니다(앞 슬래시 유무는 인프라 쪽 값에 따라 둘 다 올 수 있어 무시
// 하고 매칭). 추천 카드처럼 cardName이 없거나 매핑에 없는 카드도 있어, 우선 card_image_url
// 경로 매칭을 시도하고 안 되면 cardName 매칭으로, 그래도 안 되면 원본 cardImageUrl을 그대로
// 대체값으로 씁니다.
export function getCardImage(card) {
    const cardImageUrl = card?.cardImageUrl;
    if (cardImageUrl) {
        const normalized = cardImageUrl.replace(/^\/+/, '');
        const entry = Object.entries(imageModules).find(([path]) => path.endsWith(`/${normalized}`));
        if (entry) return entry[1];
    }
    return cardImageMap[normalizeName(card?.cardName)] ?? cardImageUrl ?? '';
}
