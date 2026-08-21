const imageModules = import.meta.glob('../assets/images/Cards/*.png', {
    eager: true,
    import: 'default',
});

// card_image_url은 'Cards/ALL 카드.png' 또는 '/Cards/ALL 카드.png'처럼 src/images/ 밑
// 상대 경로를 담고 있습니다(앞 슬래시 유무는 인프라 쪽 값에 따라 둘 다 올 수 있어 무시하고
// 매칭). 매칭되는 파일이 없으면(값이 비었거나 아직 이미지가 없는 카드) 빈 문자열을 돌려주며,
// 호출 쪽에서 v-if로 걸러내면 됩니다 - 필수값이 아닙니다.
export function getCardImage(card) {
    const cardImageUrl = card?.cardImageUrl;
    if (!cardImageUrl) return '';
    const normalized = cardImageUrl.replace(/^\/+/, '');
    const entry = Object.entries(imageModules).find(([path]) => path.endsWith(`/${normalized}`));
    return entry?.[1] ?? '';
}
const normalizeName = (name) =>
    String(name ?? '')
        .normalize('NFC')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const cardImageMap = Object.fromEntries(
    Object.entries(imageModules).map(([path, imageUrl]) => {
        const fileName = path.split('/').pop().replace(/\.png$/i, '');
        return [normalizeName(fileName), imageUrl];
    })
);

export const getCardImage = (card) =>
    cardImageMap[normalizeName(card?.cardName)] ?? card?.cardImageUrl ?? '';
