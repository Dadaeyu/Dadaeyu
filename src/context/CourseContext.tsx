"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useOptionalAuth } from "@/context/AuthContext";
import { courseDurationLabel, fetchMyCourses, isCoursePublic } from "@/lib/supabase/courses";
import type { TourismMyCourse } from "@/lib/supabase/types";

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

function formatDetailTime(raw: string | null): string {
  if (!raw) return "09:00";
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "09:00";
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul"
  });
}

function toMyCourse(course: TourismMyCourse): MyCourse {
  const byDay = new Map<number, CoursePlace[]>();
  for (const p of course.places) {
    const list = byDay.get(p.day) ?? [];
    list.push({
      id: p.place_id,
      name: p.title,
      time: formatDetailTime(p.starttime),
      duration: ""
    });
    byDay.set(p.day, list);
  }
  const days: CourseDay[] =
    byDay.size > 0
      ? [...byDay.entries()].sort(([a], [b]) => a - b).map(([day, places]) => ({ day, places }))
      : [{ day: 1, places: [] }];

  return {
    id: course.course_id,
    title: course.course_nm,
    duration: courseDurationLabel(course),
    isPrivate: !isCoursePublic(course),
    rating: 0,
    likes: 0,
    tags: [],
    days
  };
}

export function CourseProvider({ children }: { children: ReactNode }) {
  const auth = useOptionalAuth();
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);

  useEffect(() => {
    if (!auth?.user) {
      queueMicrotask(() => setMyCourses([]));
      return;
    }
    let cancelled = false;
    fetchMyCourses(auth.user.id)
      .then((rows) => {
        if (!cancelled) setMyCourses(rows.map(toMyCourse));
      })
      .catch(() => {
        if (!cancelled) setMyCourses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [auth?.user]);

  const addPlaceToCourse = (courseId: number, placeName: string) => {
    setMyCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        const newPlace: CoursePlace = {
          id: Date.now(),
          name: placeName,
          time: "09:00",
          duration: "1시간"
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
