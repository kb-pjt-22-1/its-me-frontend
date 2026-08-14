// 브라우저는 <img src="data:image/svg+xml,...">로 쓰인 SVG 안에서 <image href="외부 URL">로
// 참조하는 이미지를 보안상 아예 안 불러온다(같은 오리진이어도) - "SVG를 이미지로 쓸 때는
// 그 안에서 추가 네트워크 요청을 안 한다"는 브라우저 정책 때문이다. 지도 핀(Map.vue)이
// 브랜드 로고/카테고리 아이콘을 SVG 안에 넣어 MarkerImage로 쓰는데, 바로 이 문제로 핀 안
// 이미지가 깨진 아이콘으로만 뜨고 있었다. 이미지를 미리 fetch해서 base64로 통째로
// 박아 넣으면(외부 참조가 아니라 SVG 자체에 데이터가 들어있으니) 이 제약을 피할 수 있다.
const cache = new Map()

export function toDataUri(url) {
  if (!url) return Promise.resolve(null)
  if (cache.has(url)) return cache.get(url)

  const promise = fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        }),
    )
    .catch(() => null)

  cache.set(url, promise)
  return promise
}
