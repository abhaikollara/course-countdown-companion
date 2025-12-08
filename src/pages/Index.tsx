import { useMemo, useEffect, useState } from "react";
import { CalendarClock, GraduationCap, Loader2 } from "lucide-react";
import DeadlineCard from "@/components/DeadlineCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const SCHEDULE_URL = "/schedule.json";

interface ScheduleItem {
  item: string;
  due_date: string;
  weightage: string;
}

interface Schedule {
  course_name: string;
  items: ScheduleItem[];
}

interface ScheduleData {
  cohort: number;
  semester: number;
  term: number;
  schedules: Schedule[];
}

interface DeadlineItem {
  item: string;
  courseName: string;
  dueDate: string;
  weightage: string;
}

const Index = () => {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(SCHEDULE_URL)
      .then((res) => res.json())
      .then((data: ScheduleData) => {
        setScheduleData(data);
        // Initialize with all courses selected
        const allCourseNames = new Set(data.schedules.map((schedule) => schedule.course_name));
        setSelectedCourses(allCourseNames);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load schedule data");
        setLoading(false);
      });
  }, []);

  const courseNames = useMemo(() => {
    if (!scheduleData) return [];
    return scheduleData.schedules.map((schedule) => schedule.course_name);
  }, [scheduleData]);

  const sortedDeadlines = useMemo(() => {
    if (!scheduleData) return [];
    
    const allItems: DeadlineItem[] = [];

    scheduleData.schedules.forEach((schedule) => {
      schedule.items.forEach((item) => {
        allItems.push({
          item: item.item,
          courseName: schedule.course_name,
          dueDate: item.due_date,
          weightage: item.weightage,
        });
      });
    });

    return allItems.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [scheduleData]);

  const filteredDeadlines = useMemo(() => {
    return sortedDeadlines.filter((deadline) => selectedCourses.has(deadline.courseName));
  }, [sortedDeadlines, selectedCourses]);

  const toggleCourse = (courseName: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseName)) {
        // Prevent deselecting if it's the last selected course
        if (next.size <= 1) {
          return prev;
        }
        next.delete(courseName);
      } else {
        next.add(courseName);
      }
      return next;
    });
  };

  const fiveDaysFromNow = new Date().getTime() + 5 * 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  
  const isWithinFiveDays = (dueDate: string) => {
    const time = new Date(dueDate).getTime();
    return time > now && time <= fiveDaysFromNow;
  };

  const upcomingCount = filteredDeadlines.filter((d) => isWithinFiveDays(d.dueDate)).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="relative max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-primary/10 glow-primary">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">
                Deadline Tracker
              </h1>
              {scheduleData && (
                <p className="text-sm text-muted-foreground mt-1">
                  Cohort {scheduleData.cohort} • Semester {scheduleData.semester} • Term {scheduleData.term}
                </p>
              )}
            </div>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            <span>
              {upcomingCount} upcoming {upcomingCount === 1 ? "deadline" : "deadlines"} in the next 5 days
            </span>
          </p>
        </header>

        {/* Course Filter */}
        {!loading && !error && courseNames.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {courseNames.map((courseName) => (
                <div key={courseName} className="flex items-center space-x-2">
                  <Checkbox
                    id={courseName}
                    checked={selectedCourses.has(courseName)}
                    onCheckedChange={() => toggleCourse(courseName)}
                  />
                  <Label
                    htmlFor={courseName}
                    className="text-xs font-normal cursor-pointer text-foreground"
                  >
                    {courseName}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deadline Cards */}
        <div className="space-y-4">
          {filteredDeadlines.map((deadline, index) => (
            <DeadlineCard
              key={`${deadline.courseName}-${deadline.item}-${deadline.dueDate}`}
              item={deadline.item}
              courseName={deadline.courseName}
              dueDate={deadline.dueDate}
              weightage={deadline.weightage}
              index={index}
              highlighted={isWithinFiveDays(deadline.dueDate)}
            />
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-20">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredDeadlines.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              No deadlines found for selected subjects.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
