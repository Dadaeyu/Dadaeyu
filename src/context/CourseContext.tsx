"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { genId } from "@/utils/id";

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
          { id: 3, name: "유성온천", time: "16:00", duration: "2시간" }
        ]
      },
      {
        day: 2,
        places: [{ id: 4, name: "대청호 오백리길", time: "10:00", duration: "3시간" }]
      }
    ]
  }
];

export function CourseProvider({ children }: { children: ReactNode }) {
  const [myCourses, setMyCourses] = useState<MyCourse[]>(INITIAL_COURSES);

  const addPlaceToCourse = (courseId: number, placeName: string) => {
    setMyCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        const newPlace: CoursePlace = {
          id: genId(),
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
