import { GET } from "./axios";

// 공공데이터포털
const PUBLIC_DATA_URL = "https://apis.data.go.kr";

// 한국관광공사 국문 관광정보 서비스 API
const KOR_TOUR_INFO_BASE_URL = "/B551011/KorService2";

// 한국관광공사 무장애 여행 정보 API
const BRFR_TOUR_INFO_BASE_URL = "/B551011/KorWithService2";

const tourDefaultParams = (): Record<string, string> => ({
  serviceKey: process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY ?? "",
  MobileOS: "WIN",
  MobileApp: "Dadaeyu",
  _type: "json"
});

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
