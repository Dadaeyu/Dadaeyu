"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useOptionalAuth } from "@/context/AuthContext";
import { fetchMyCourses } from "@/lib/supabase/courses";

export interface CoursePlace {
  id: number; // 코스 내 행 식별용 로컬 id
  name: string;
  startHour: number; // 0~23 (분 없음)
  endHour: number; // 0~23 (분 없음)
  placeId?: number; // 원본 장소 id (현재 mock PLACES.id, 추후 tb_place.place_id) — tb_course_detail.place_id 로 저장
  lat?: number; // 장소 검색으로 추가된 경우의 좌표 (지도 마커·경로선 표시용)
  lng?: number;
  contentId?: number; // tb_place.contentid (TourAPI id) — /api/tourism/detail 조회용. placeId(내부 PK)와는 다른 값.
}

export interface CourseDay {
  day: number;
  places: CoursePlace[];
}

export interface MyCourse {
  id: number;
  title: string;
  duration: string;
  isPrivate: boolean;
  rating: number;
  likes: number;
  tags: string[];
  days: CourseDay[];
  startDate?: string; // 시작일 (DB: startdate)
  endDate?: string; // 종료일 (DB: enddate)
}

interface CourseContextValue {
  myCourses: MyCourse[];
  addPlaceToCourse: (courseId: number, placeName: string) => void;
  updateCourse: (course: MyCourse) => void;
  addCourse: (course: MyCourse) => void;
}

const CourseContext = createContext<CourseContextValue | null>(null);

// 1시간 뒤 시각(0~23, 자정 넘어가면 랩어라운드). 새 장소의 기본 종료시각 계산용.
function addOneHour(hour: number): number {
  return (((hour + 1) % 24) + 24) % 24;
}

const INITIAL_COURSES: MyCourse[] = [
  {
    id: 10,
    title: "내 여행 계획",
    duration: "2일",
    isPrivate: true,
    rating: 0,
    likes: 0,
    tags: ["자연힐링", "먹거리"],
    days: [
      {
        day: 1,
        places: [
          { id: 1, name: "성심당", startHour: 9, endHour: 10 },
          { id: 2, name: "한밭수목원", startHour: 11, endHour: 13 },
          { id: 3, name: "유성온천", startHour: 16, endHour: 18 }
        ]
      },
      {
        day: 2,
        places: [{ id: 4, name: "대청호 오백리길", startHour: 10, endHour: 13 }]
      }
    ]
  }
];

export function CourseProvider({ children }: { children: ReactNode }) {
  const auth = useOptionalAuth();
  const [myCourses, setMyCourses] = useState<MyCourse[]>(INITIAL_COURSES);

  useEffect(() => {
    if (!auth?.user) return;
    fetchMyCourses(auth.user.id)
      .then((dbCourses) => {
        if (dbCourses.length === 0) return;
        setMyCourses((prev) => {
          const dbAsMy: MyCourse[] = dbCourses.map((c) => ({
            id: c.id,
            title: c.title,
            duration: c.duration_label ?? "1일",
            isPrivate: !c.is_public,
            rating: 0,
            likes: c.like_count,
            tags: [],
            days: [{ day: 1, places: [] }]
          }));
          const merged = [...dbAsMy];
          for (const local of prev) {
            if (!merged.some((m) => m.id === local.id)) merged.push(local);
          }
          return merged;
        });
      })
      .catch(() => {});
  }, [auth?.user]);

  const addPlaceToCourse = (courseId: number, placeName: string) => {
    setMyCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        // 기본 시작시각: Day1 마지막 장소의 종료시각(없으면 9시). 종료시각은 시작+1시간.
        const lastPlace = course.days[0]?.places[course.days[0].places.length - 1];
        const startHour = lastPlace ? lastPlace.endHour : 9;
        const newPlace: CoursePlace = {
          id: Date.now(),
          name: placeName,
          startHour,
          endHour: addOneHour(startHour)
        };
        const updatedDays =
          course.days.length > 0
            ? course.days.map((day, i) =>
                i === 0 ? { ...day, places: [...day.places, newPlace] } : day
              )
            : [{ day: 1, places: [newPlace] }];
        return { ...course, days: updatedDays };
      })
    );
  };

  const updateCourse = (updated: MyCourse) => {
    setMyCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const addCourse = (course: MyCourse) => {
    setMyCourses((prev) => [...prev, course]);
  };

  return (
    <CourseContext.Provider value={{ myCourses, addPlaceToCourse, updateCourse, addCourse }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourseContext() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourseContext must be used within CourseProvider");
  return ctx;
}
