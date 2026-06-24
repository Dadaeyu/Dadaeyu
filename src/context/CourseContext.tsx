"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useOptionalAuth } from "@/context/AuthContext";
import { fetchMyCourses } from "@/lib/supabase/courses";

export interface CoursePlace {
  id: number;
  name: string;
  time: string;
  duration: string;
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
}

interface CourseContextValue {
  myCourses: MyCourse[];
  addPlaceToCourse: (courseId: number, placeName: string) => void;
  updateCourse: (course: MyCourse) => void;
  addCourse: (course: MyCourse) => void;
}

const CourseContext = createContext<CourseContextValue | null>(null);

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
          { id: 1, name: "성심당", time: "09:00", duration: "1시간" },
          { id: 2, name: "한밭수목원", time: "11:00", duration: "2시간" },
          { id: 3, name: "유성온천", time: "16:00", duration: "2시간" },
        ],
      },
      {
        day: 2,
        places: [
          { id: 4, name: "대청호 오백리길", time: "10:00", duration: "3시간" },
        ],
      },
    ],
  },
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
            days: [{ day: 1, places: [] }],
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
    setMyCourses(prev =>
      prev.map(course => {
        if (course.id !== courseId) return course;
        const newPlace: CoursePlace = {
          id: Date.now(),
          name: placeName,
          time: "09:00",
          duration: "1시간",
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
    setMyCourses(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  const addCourse = (course: MyCourse) => {
    setMyCourses(prev => [...prev, course]);
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
