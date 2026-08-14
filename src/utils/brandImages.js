// src/images/Brands/**를 빌드 시점에 번들링해서, DB brand_logo 값으로 바로 찾아 쓸 수 있게 합니다.
// 외부(raw.githubusercontent.com 등)에서 안 불러오고 로컬 에셋을 쓰는 이유는, 프론트엔드
// 레포 안에 이미 있는 파일이라 굳이 네트워크를 안 타도 되고, Vite가 해시/캐싱까지 붙여주기 때문입니다.
const brandImageModules = import.meta.glob('@/images/Brands/*.png', { eager: true, import: 'default' })

// brand_logo는 'Brands/starbucks.png' 또는 '/Brands/starbucks.png'처럼 src/images/ 밑
// 상대 경로를 담고 있습니다(앞 슬래시 유무는 인프라 쪽 값에 따라 둘 다 올 수 있어 무시하고
// 매칭). brand_code에서 슬러그를 유추하지 않는 이유는 mega-mgc-coffee.png나 한글
// 파일명처럼 규칙이 안 맞는 케이스가 있어서 - DB에 실제 파일명을 정확히 저장해두고 그대로
// 매칭합니다. 매칭되는 파일이 없으면(값이 비었거나 오타 등) null을 돌려주며, 호출 쪽에서
// 카테고리 아이콘 등으로 폴백하면 됩니다 - 필수값이 아닙니다.
export function getBrandImage(brandLogo) {
  if (!brandLogo) return null
  const normalized = brandLogo.replace(/^\/+/, '')
  const entry = Object.entries(brandImageModules).find(([path]) => path.endsWith(`/${normalized}`))
  return entry?.[1] ?? null
}
