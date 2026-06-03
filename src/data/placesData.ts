// ── 장소 데이터 ──────────────────────────────────────────
export interface Review { id: number; user: string; rating: number; content: string; date: string; }
export interface PlaceDetail {
  description: string;
  tags: string[];
  address: string;
  hours: string;
  phone: string;
  reviews: Review[];
}
export interface Place {
  id: number; name: string; cx: number; cy: number;
  color: string; bg: string; category: string;
  rating: number; accessibility: string[]; distance: string;
  emoji: string; hot: boolean;
}

export const PLACES: Place[] = [
  { id: 1, name: "대전 엑스포 과학공원", cx: 557, cy: 165, color: "#7c3aed", bg: "#ede9fe", category: "과학", rating: 4.8, accessibility: ["시각", "보행", "청각"], distance: "2.3km", emoji: "🔬", hot: true },
  { id: 2, name: "성심당", cx: 440, cy: 315, color: "#dc2626", bg: "#fee2e2", category: "빵지순례", rating: 4.9, accessibility: ["보행", "고령자"], distance: "1.5km", emoji: "🥐", hot: true },
  { id: 3, name: "한밭수목원", cx: 337, cy: 237, color: "#16a34a", bg: "#dcfce7", category: "자연힐링", rating: 4.7, accessibility: ["시각", "보행", "영유아"], distance: "3.2km", emoji: "🌿", hot: true },
  { id: 4, name: "유성온천", cx: 175, cy: 360, color: "#d97706", bg: "#fef3c7", category: "문화예술", rating: 4.5, accessibility: ["보행", "고령자"], distance: "5.1km", emoji: "♨️", hot: false },
  { id: 5, name: "대청호 오백리길", cx: 800, cy: 435, color: "#2563eb", bg: "#dbeafe", category: "자연힐링", rating: 4.6, accessibility: ["보행"], distance: "12.4km", emoji: "🏞️", hot: true },
];

export const PLACE_DETAILS: Record<number, PlaceDetail> = {
  1: {
    description: "1993년 대전 세계박람회 개최지를 공원으로 조성한 복합 테마파크입니다. 총 27만㎡ 규모에 한빛탑, 4D 영상관, 신기한 나라 등 다양한 과학 체험시설을 갖추고 있습니다. 전 구역에 경사로와 엘리베이터가 설치되어 있으며, 전동 휠체어 대여 서비스도 운영합니다.",
    tags: ["과학관", "야외공원", "가족여행", "무료주차", "휠체어 대여"],
    address: "대전 유성구 대덕대로 480",
    hours: "09:00 – 18:00 (월요일 휴관)",
    phone: "042-866-5114",
    reviews: [
      { id: 1, user: "여행러버", rating: 5, content: "휠체어를 빌려서 구경했는데 경사로가 잘 되어 있어서 편하게 다닐 수 있었어요!", date: "2025.04.12" },
      { id: 2, user: "대전시민", rating: 4, content: "아이들이랑 오기 좋고 무장애 화장실도 곳곳에 있어서 좋았습니다.", date: "2025.03.28" },
    ],
  },
  2: {
    description: "1956년 창업한 대전 최고의 빵집으로, 튀김소보로와 판타롱 부추빵 등으로 유명합니다. 본점은 중구 은행동에 위치하며 1층 매장으로 구성되어 휠체어 접근이 용이합니다. 주변에 대형 주차장이 있으며, 장애인 전용 주차공간도 마련되어 있습니다.",
    tags: ["베이커리", "대전명물", "포장가능", "1층매장"],
    address: "대전 중구 대종로480번길 15",
    hours: "07:30 – 22:00 (연중무휴)",
    phone: "042-253-9395",
    reviews: [
      { id: 1, user: "빵순이", rating: 5, content: "휠체어로도 입장 가능하고 직원분들이 친절하게 도와주셔서 편하게 쇼핑했어요.", date: "2025.05.01" },
      { id: 2, user: "대전여행", rating: 5, content: "대전 오면 무조건 들려야 하는 곳! 장애인 주차공간도 있어요.", date: "2025.04.20" },
    ],
  },
  3: {
    description: "도심 속 88만㎡의 광활한 수목원으로, 동원과 서원으로 나뉩니다. 전 구간 평탄한 산책로가 조성되어 있어 휠체어와 유모차 이용이 편리합니다. 입장료 없이 연중무휴 운영하며, 곳곳에 무장애 화장실이 설치되어 있습니다.",
    tags: ["무료입장", "산책로", "유모차 가능", "반려동물 불가"],
    address: "대전 서구 둔산대로 169",
    hours: "05:00 – 22:00 (연중무휴)",
    phone: "042-270-8452",
    reviews: [
      { id: 1, user: "산책왕", rating: 5, content: "평탄한 길이라 유모차 끌고 다니기 너무 좋아요. 접근성이 최고입니다!", date: "2025.04.15" },
      { id: 2, user: "힐링여행", rating: 4, content: "무장애 화장실이 여러 곳에 있어서 좋고, 경치도 너무 예뻐요.", date: "2025.03.10" },
    ],
  },
  4: {
    description: "충남·세종·충북 지역에서 가장 유명한 온천 지역으로, 알칼리성 중탄산나트륨 온천수가 특징입니다. 주변에 다양한 온천 호텔과 찜질방이 있으며, 대부분 장애인 편의시설을 갖추고 있습니다. 고령자와 보행 불편자를 위한 수중 리프트도 운영합니다.",
    tags: ["온천", "피로회복", "수중리프트", "고령자 친화"],
    address: "대전 유성구 온천로 일대",
    hours: "시설마다 상이",
    phone: "042-611-5420",
    reviews: [
      { id: 1, user: "온천마니아", rating: 4, content: "수중 리프트가 있어서 보행이 불편한 부모님도 온천 즐기실 수 있었어요.", date: "2025.02.14" },
      { id: 2, user: "주말여행", rating: 5, content: "고령자 편의시설이 잘 갖춰져 있고 직원분들이 매우 친절했습니다.", date: "2025.01.28" },
    ],
  },
  5: {
    description: "대청호를 따라 걷는 240km 구간의 트레킹 코스입니다. 호수 전망이 아름답고 일부 구간은 데크로드로 조성되어 평탄합니다. 전동 휠체어보다는 수동 휠체어나 도보 이용을 권장하며, 출발점에 무료 주차장과 화장실이 마련되어 있습니다.",
    tags: ["트레킹", "호수뷰", "데크로드", "주차무료"],
    address: "대전 동구 추동로 일대",
    hours: "상시 개방",
    phone: "042-606-6264",
    reviews: [
      { id: 1, user: "걷기좋아", rating: 4, content: "데크 구간은 휠체어로도 이동 가능해요. 경치가 너무 아름다워요!", date: "2025.04.05" },
      { id: 2, user: "자연인", rating: 5, content: "봄에 방문했는데 벚꽃이 만발해서 정말 예뻤어요. 주차도 편했습니다.", date: "2025.03.22" },
    ],
  },
};

export const ACCESSIBILITY_LABELS: Record<string, { icon: string; desc: string }> = {
  시각: { icon: "👁️", desc: "시각장애인 안내 서비스 제공" },
  보행: { icon: "♿", desc: "휠체어 및 경사로 완비" },
  청각: { icon: "🦻", desc: "청각장애인 편의시설 제공" },
  고령자: { icon: "🧓", desc: "고령자 우선 편의시설" },
  영유아: { icon: "👶", desc: "유모차 이동 가능" },
};
