import { useMemo } from "react";
import { CalendarClock, GraduationCap } from "lucide-react";
import DeadlineCard from "@/components/DeadlineCard";

const scheduleData = {
  schedules: [
    {
      course_name: "General Physics",
      items: [
        { item: "Quiz Week 1 & 2", due_date: "2025-12-17T23:59:00" },
        { item: "Quiz Week 3 & 4", due_date: "2025-12-31T23:59:00" },
        { item: "Graded Assignment 1", due_date: "2026-01-08T03:24:00" },
        { item: "Quiz Week 5 & 6", due_date: "2026-01-14T23:59:00" },
        { item: "Quiz Week 7 & 8", due_date: "2026-01-27T23:59:00" },
        { item: "Quiz Week 9 & 10", due_date: "2026-02-11T01:54:00" },
        { item: "Graded Assignment 2", due_date: "2026-02-21T03:24:00" },
      ],
    },
    {
      course_name: "Command Line Interfaces & Scripting",
      items: [
        { item: "Quiz Week 1 & 2", due_date: "2025-12-17T23:59:00" },
        { item: "Quiz Week 3 & 4", due_date: "2025-12-31T23:59:00" },
        { item: "Quiz Week 5 & 6", due_date: "2026-01-14T23:59:00" },
        { item: "Graded Assignment 1", due_date: "2026-01-21T03:24:00" },
        { item: "Quiz Week 7 & 8", due_date: "2026-01-27T23:59:00" },
        { item: "Quiz Week 9 & 10", due_date: "2026-02-11T03:25:00" },
        { item: "Graded Assignment 2", due_date: "2026-02-14T03:25:00" },
      ],
    },
    {
      course_name: "General Biology",
      items: [
        { item: "Quiz Week 1 & 2", due_date: "2025-12-17T23:59:00" },
        { item: "Quiz Week 3 & 4", due_date: "2025-12-31T23:59:00" },
        { item: "Graded Assignment 1", due_date: "2026-01-09T04:24:00" },
        { item: "Quiz Week 5 & 6", due_date: "2026-01-14T23:59:00" },
        { item: "Quiz Week 7 & 8", due_date: "2026-01-27T23:59:00" },
        { item: "Graded Assignment 2", due_date: "2026-02-06T04:24:00" },
        { item: "Quiz Week 9 & 10", due_date: "2026-02-11T23:59:00" },
      ],
    },
    {
      course_name: "Data Structures & Algorithms",
      items: [
        { item: "Quiz Week 1 & 2", due_date: "2025-12-17T23:59:00" },
        { item: "Quiz Week 3 & 4", due_date: "2025-12-31T23:59:00" },
        { item: "Quiz Week 5 & 6", due_date: "2026-01-14T23:59:00" },
        { item: "Quiz Week 7 & 8", due_date: "2026-01-27T23:59:00" },
        { item: "Graded Assignment 1", due_date: "2026-02-02T03:26:00" },
        { item: "Graded Assignment 2", due_date: "2026-02-09T03:26:00" },
        { item: "Quiz Week 9 & 10", due_date: "2026-02-11T23:59:00" },
      ],
    },
  ],
};

interface DeadlineItem {
  item: string;
  courseName: string;
  dueDate: string;
}

const Index = () => {
  const sortedDeadlines = useMemo(() => {
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
  }, []);

  const upcomingCount = sortedDeadlines.filter(
    (d) => new Date(d.dueDate).getTime() > new Date().getTime()
  ).length;

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
              {upcomingCount} upcoming {upcomingCount === 1 ? "deadline" : "deadlines"}
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
            />
          ))}
        </div>

        {/* Empty state */}
        {sortedDeadlines.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No deadlines found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
