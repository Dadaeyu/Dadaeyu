import { GET, POST } from "./axios";

// const BASE_URL = process.env.EXTERNAL_API_BASE_URL ?? "";
// const defaultHeaders = (): Record<string, string> => ({
//   Authorization: `Bearer ${process.env.EXTERNAL_API_KEY ?? ""}`
// });

// export const externalApi = {
//   GET: <T>(path: string) => GET<T>(`${BASE_URL}${path}`, { headers: defaultHeaders() }),

//   POST: <T>(path: string, body: unknown) =>
//     POST<T>(`${BASE_URL}${path}`, body, { headers: defaultHeaders() })
// };

// 공공데이터포털
const PUBLIC_DATA_URL = "https://apis.data.go.kr";

// 한국관광공사 무장애 여행 정보 API
const BRFR_TOUR_INFO_BASE_URL = "/B551011/KorWithService2";

const tourDefaultParams = (): Record<string, string> => ({
  serviceKey: process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY ?? "",
  MobileOS: "WIN",
  MobileApp: "Dadaeyu",
  _type: "json"
});

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
  }
};
