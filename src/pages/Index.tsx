import { useMemo, useEffect, useState } from "react";
import { CalendarClock, GraduationCap, Loader2 } from "lucide-react";
import DeadlineCard from "@/components/DeadlineCard";

const SCHEDULE_URL = "https://gist.githubusercontent.com/abhaikollara/ac11036abf3ef43738bb708744d0ff87/raw/5e0d97fdf8b21fbaf9b97b3e52bf8c0fa74196e3/cohort-5-s2-t2.json";

interface ScheduleItem {
  item: string;
  due_date: string;
}

interface Schedule {
  course_name: string;
  items: ScheduleItem[];
}

interface ScheduleData {
  schedules: Schedule[];
}

interface DeadlineItem {
  item: string;
  courseName: string;
  dueDate: string;
}

const Index = () => {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(SCHEDULE_URL)
      .then((res) => res.json())
      .then((data) => {
        setScheduleData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load schedule data");
        setLoading(false);
      });
  }, []);

  const sortedDeadlines = useMemo(() => {
    if (!scheduleData) return [];
    
    const allItems: DeadlineItem[] = [];

    scheduleData.schedules.forEach((schedule) => {
      schedule.items.forEach((item) => {
        allItems.push({
          item: item.item,
          courseName: schedule.course_name,
          dueDate: item.due_date,
        });
      });
    });

    return allItems.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [scheduleData]);

  const fiveDaysFromNow = new Date().getTime() + 5 * 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  
  const isWithinFiveDays = (dueDate: string) => {
    const time = new Date(dueDate).getTime();
    return time > now && time <= fiveDaysFromNow;
  };

  const upcomingCount = sortedDeadlines.filter((d) => isWithinFiveDays(d.dueDate)).length;

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
            <h1 className="text-3xl font-bold text-foreground">
              Deadline Tracker
            </h1>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            <span>
              {upcomingCount} upcoming {upcomingCount === 1 ? "deadline" : "deadlines"} in the next 5 days
            </span>
          </p>
        </header>

        {/* Deadline Cards */}
        <div className="space-y-4">
          {sortedDeadlines.map((deadline, index) => (
            <DeadlineCard
              key={`${deadline.courseName}-${deadline.item}-${deadline.dueDate}`}
              item={deadline.item}
              courseName={deadline.courseName}
              dueDate={deadline.dueDate}
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
        {!loading && !error && sortedDeadlines.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No deadlines found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
