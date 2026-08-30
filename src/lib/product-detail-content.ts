export type ProductDetailContent = {
  subtitle: string;
  recommendedFor: string[];
  kitContents: { title: string; description: string }[];
  highlights: { label: string; value: string }[];
  preflight: string[];
  care: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
};

const commonFaqs = [
  { question: "아무 바다에나 심어도 되나요?", answer: "아니요. 서비스의 추천 해역과 계절 안내를 확인하고, 현지 어촌계·지자체의 최신 지침을 우선해서 따라야 합니다." },
  { question: "특별한 잠수 장비가 필요한가요?", answer: "이 MVP는 특별한 장비 없이 접근 가능한 참여를 목표로 합니다. 다만 파도와 수심 등 현장 조건이 안전하지 않다면 이식을 진행하지 마세요." },
  { question: "이식 후에는 무엇을 하나요?", answer: "키트의 고유 코드와 이식한 추천 해역을 선택해 인증 기록을 남길 수 있습니다. 현재는 위치와 사진을 수집하지 않습니다." },
];

const productDetails: Record<number, ProductDetailContent> = {
  1: {
    subtitle: "처음 바다 식목을 시작하는 사람을 위한 기본 구성",
    recommendedFor: ["바다 식목이 처음인 분", "간단한 구성으로 시작하고 싶은 분", "다시마 바다숲 회복에 관심 있는 분"],
    kitContents: [
      { title: "성게 패각 생태 블록", description: "어린 해조류가 자리 잡을 수 있도록 다공성 표면을 가진 기본 블록입니다." },
      { title: "다시마 포자 구성", description: "키트 목적에 맞는 다시마 포자 부착 구성을 제공합니다." },
      { title: "초보자 이식 안내", description: "준비부터 추천 해역 확인, 이식 기록까지의 순서를 안내합니다." },
      { title: "고유 인증 코드", description: "이식 후 참여 기록을 남길 때 사용하는 키트별 코드입니다." },
    ],
    highlights: [{ label: "추천 수준", value: "첫 참여" }, { label: "해조류", value: "다시마" }, { label: "핵심 목적", value: "바다숲 시작" }, { label: "기록", value: "코드 인증" }],
    preflight: ["추천 해역과 권장 계절을 다시 확인하기", "현지 어촌계·지자체의 최신 안내 확인하기", "파도와 날씨가 안전한지 확인하기", "키트 코드가 잘 보관되어 있는지 확인하기"],
    care: [{ title: "이식 전", description: "직사광선과 고온을 피하고, 구성품 상태를 확인한 뒤 안내 순서에 따라 준비해 주세요." }, { title: "현장에서", description: "무리해서 깊은 곳으로 들어가지 말고, 접근 가능한 안전한 범위에서만 진행하세요." }, { title: "이식 후", description: "남은 포장재는 회수하고 키트 코드로 참여 기록을 남겨 주세요." }],
    faqs: commonFaqs,
  },
  2: {
    subtitle: "겨울 해역의 감태 회복을 고려한 계절 추천 구성",
    recommendedFor: ["계절에 맞춘 이식을 계획하는 분", "감태 생태에 관심 있는 분", "지역 안내를 꼼꼼히 확인할 수 있는 분"],
    kitContents: [
      { title: "성게 패각 생태 블록 구성", description: "감태 포자가 자리 잡을 수 있도록 준비된 생태 블록 구성입니다." },
      { title: "감태 포자 구성", description: "겨울 바다 환경을 고려한 감태 중심 구성입니다." },
      { title: "계절별 확인 안내", description: "권장 시기와 해역별 주의사항을 확인하도록 돕습니다." },
      { title: "고유 인증 코드", description: "이식 해역과 참여일을 기록하는 데 사용합니다." },
    ],
    highlights: [{ label: "추천 수준", value: "계절 확인" }, { label: "해조류", value: "감태" }, { label: "핵심 목적", value: "겨울 회복" }, { label: "기록", value: "코드 인증" }],
    preflight: ["감태 권장 계절에 해당하는지 확인하기", "추천 해역의 파도·주의사항 확인하기", "블록과 포자 구성의 상태 확인하기", "현장 출입 가능 여부를 최신 안내로 확인하기"],
    care: [{ title: "계절 확인", description: "감태 구성은 시기와 해역 조건의 영향을 받으므로 권장 계절 안내를 우선해 주세요." }, { title: "이식 위치", description: "지정 구역 밖이나 출입이 제한된 해역에는 이식하지 마세요." }, { title: "기록 관리", description: "키트 구성을 추천 해역에 이식하고 고유 코드로 참여 기록을 남겨 주세요." }],
    faqs: commonFaqs,
  },
  3: {
    subtitle: "이식 뒤 변화를 기록하며 관찰하는 필드 키트",
    recommendedFor: ["바다 생태 변화를 기록하고 싶은 분", "관찰 노트를 함께 활용할 분", "가족·소규모 학습 활동을 준비하는 분"],
    kitContents: [
      { title: "성게 패각 생태 블록", description: "해조류가 자리 잡는 과정을 관찰할 수 있는 기본 블록입니다." },
      { title: "해조류 포자 구성", description: "추천 해역 안내와 함께 사용할 수 있는 관찰용 구성입니다." },
      { title: "필드 관찰 노트", description: "이식일과 해역, 이후 확인한 내용을 직접 기록할 수 있습니다." },
      { title: "고유 인증 코드", description: "첫 이식 기록을 서비스에 남길 때 사용합니다." },
    ],
    highlights: [{ label: "추천 수준", value: "관찰 활동" }, { label: "구성", value: "노트 포함" }, { label: "핵심 목적", value: "변화 기록" }, { label: "기록", value: "코드 인증" }],
    preflight: ["관찰 노트에 이식일과 해역을 적을 준비하기", "추천 해역의 현장 안내 확인하기", "안전한 관찰 동선 정하기", "생물을 임의로 채취하거나 훼손하지 않기"],
    care: [{ title: "기록 방법", description: "정확한 위치정보 대신 해역명과 날짜, 눈으로 확인한 변화를 중심으로 기록해 주세요." }, { title: "반복 관찰", description: "현장 안전과 출입 지침을 지키며 가능한 범위에서만 다시 방문하세요." }, { title: "생태 존중", description: "관찰 과정에서 해조류와 주변 생물을 옮기거나 채취하지 마세요." }],
    faqs: commonFaqs,
  },
};

const defaultDetail: ProductDetailContent = {
  subtitle: "성게 패각 생태 블록으로 시작하는 바다 식목 구성",
  recommendedFor: ["바다 식목 활동에 참여하고 싶은 분", "추천 해역 안내를 확인할 수 있는 분", "이식 후 참여 기록을 남기고 싶은 분"],
  kitContents: [
    { title: "성게 패각 생태 블록", description: "해조류가 자리 잡을 수 있는 다공성 기본 블록입니다." },
    { title: "해조류 포자 구성", description: "상품 목적에 맞는 해조류 포자 구성을 제공합니다." },
    { title: "이식 안내", description: "안전 확인과 추천 해역, 인증 순서를 안내합니다." },
    { title: "고유 인증 코드", description: "이식 참여 기록을 남길 때 사용합니다." },
  ],
  highlights: [{ label: "추천 수준", value: "안내 확인" }, { label: "재료", value: "성게 패각" }, { label: "핵심 목적", value: "바다 식목" }, { label: "기록", value: "코드 인증" }],
  preflight: ["추천 해역과 계절 확인하기", "현지 최신 안내 확인하기", "날씨와 파도 확인하기", "키트 구성과 코드 확인하기"],
  care: [{ title: "준비", description: "구성품 상태와 안내를 확인한 뒤 이동해 주세요." }, { title: "안전", description: "접근하기 어려운 수심이나 날씨에는 진행하지 마세요." }, { title: "정리", description: "포장재를 회수하고 참여 기록을 남겨 주세요." }],
  faqs: commonFaqs,
};

export function getProductDetailContent(id: number): ProductDetailContent {
  return productDetails[id] ?? defaultDetail;
}
