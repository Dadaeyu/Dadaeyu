import { GET } from "./axios";

// 공공데이터포털
const PUBLIC_DATA_URL = "https://apis.data.go.kr";

const tourDefaultParams = (): Record<string, string> => ({
  serviceKey: process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY ?? "",
  MobileOS: "WIN",
  MobileApp: "Dadaeyu",
  _type: "json"
});

// 한국관광공사 국문 관광정보 서비스 API
const KOR_TOUR_INFO_BASE_URL = "/B551011/KorService2";

export const korTourInfoApi = {
  // 지역기반 관광정보 조회 (areaBasedList2)
  areaBasedList: <T>(params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...tourDefaultParams(), ...params });
    return GET<T>(`${PUBLIC_DATA_URL}${KOR_TOUR_INFO_BASE_URL}/areaBasedList2?${query.toString()}`);
  },

  // 공통정보 조회 (detailCommon2) — contentId 필수
  detailCommon: <T>(params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...tourDefaultParams(), ...params });
    return GET<T>(`${PUBLIC_DATA_URL}${KOR_TOUR_INFO_BASE_URL}/detailCommon2?${query.toString()}`);
  },

  // 소개정보 조회 (detailIntro2) — contentId, contentTypeId 필수
  detailIntro: <T>(params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...tourDefaultParams(), ...params });
    return GET<T>(`${PUBLIC_DATA_URL}${KOR_TOUR_INFO_BASE_URL}/detailIntro2?${query.toString()}`);
  }
};

// 한국관광공사 무장애 여행 정보 API
const BRFR_TOUR_INFO_BASE_URL = "/B551011/KorWithService2";

export const brfrTourInfoApi = {
  // 지역기반 관광정보 조회 (areaBasedList2)
  areaBasedList: <T>(params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...tourDefaultParams(), ...params });
    return GET<T>(
      `${PUBLIC_DATA_URL}${BRFR_TOUR_INFO_BASE_URL}/areaBasedList2?${query.toString()}`
    );
  },

  // 지역코드 조회 (areaCode2)
  areaCode: <T>(params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...tourDefaultParams(), ...params });
    return GET<T>(`${PUBLIC_DATA_URL}${BRFR_TOUR_INFO_BASE_URL}/areaCode2?${query.toString()}`);
  },

  // 무장애 여행 상세정보 조회 (detailWithTour2) — contentId 필수
  detailWithTour: <T>(params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...tourDefaultParams(), ...params });
    return GET<T>(
      `${PUBLIC_DATA_URL}${BRFR_TOUR_INFO_BASE_URL}/detailWithTour2?${query.toString()}`
    );
  }
};

// 한국천문연구원 특일 정보 API (공휴일 / 국경일)
// 관광정보 API 와 달리 MobileOS/MobileApp 이 없고 serviceKey + _type 만 쓴다.
const SPCDE_INFO_BASE_URL = "/B090041/openapi/service/SpcdeInfoService";

const spcdeDefaultParams = (): Record<string, string> => ({
  serviceKey: process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY ?? "",
  _type: "json"
});

export const spcdeInfoApi = {
  // 공휴일 정보조회 (getRestDeInfo) — solYear 필수
  restDeInfo: <T>(params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...spcdeDefaultParams(), ...params });
    return GET<T>(`${PUBLIC_DATA_URL}${SPCDE_INFO_BASE_URL}/getRestDeInfo?${query.toString()}`);
  },

  // 국경일 정보조회 (getHoliDeInfo) — solYear 필수
  holiDeInfo: <T>(params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...spcdeDefaultParams(), ...params });
    return GET<T>(`${PUBLIC_DATA_URL}${SPCDE_INFO_BASE_URL}/getHoliDeInfo?${query.toString()}`);
  }
};

// 행정안전부 식품 제과점영업 조회 서비스 API
const BAKERY_INFO_BASE_URL = "/1741000/bakeries/info";

export const bakeryInfoApi = {
  // 제과점영업 정보 조회 (info)
  // 관광정보 API 와 파라미터 규격이 달라 tourDefaultParams 를 쓰지 않는다.
  //  - _type 대신 returnType=json 사용
  //  - cond[컬럼::연산자]=값 형태의 필터 파라미터를 그대로 넘긴다.
  //    (URLSearchParams 가 [ ] : 를 퍼센트 인코딩해도 게이트웨이가 정상 파싱한다)
  info: <T>(params: Record<string, string> = {}) => {
    const query = new URLSearchParams({
      serviceKey: process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY ?? "",
      returnType: "json",
      ...params
    });
    return GET<T>(`${PUBLIC_DATA_URL}${BAKERY_INFO_BASE_URL}?${query.toString()}`);
  }
};
