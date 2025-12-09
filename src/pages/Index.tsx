import { useMemo, useEffect, useState } from "react";
import { CalendarClock, GraduationCap, Loader2, ChevronDown } from "lucide-react";
import DeadlineCard from "@/components/DeadlineCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer-text";

const SCHEDULE_URL = "/schedule.json";

interface ScheduleItem {
  item: string;
  due_date: string;
  weightage: string;
  open_date: string;
  url?: string;
}

interface Schedule {
  course_name: string;
  course_name_short: string;
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
  openDate: string;
  url?: string;
}

const Index = () => {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [showPastDue, setShowPastDue] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [dontShowDisclaimer, setDontShowDisclaimer] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedShowPastDue = localStorage.getItem("showPastDue");
    if (savedShowPastDue !== null) {
      setShowPastDue(savedShowPastDue === "true");
    }

    const savedSelectedCourses = localStorage.getItem("selectedCourses");
    if (savedSelectedCourses) {
      try {
        const courses = JSON.parse(savedSelectedCourses) as string[];
        setSelectedCourses(new Set(courses));
      } catch (e) {
        // If parsing fails, use default
      }
    }

    // Check if disclaimer should be shown
    const disclaimerDismissed = localStorage.getItem("disclaimerDismissed");
    if (disclaimerDismissed !== "true") {
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        setShowDisclaimer(true);
      }, 100);
    }
  }, []);

  useEffect(() => {
    fetch(SCHEDULE_URL)
      .then((res) => res.json())
      .then((data: ScheduleData) => {
        setScheduleData(data);
        // Initialize with saved courses or default (all except General Physics)
        const savedSelectedCourses = localStorage.getItem("selectedCourses");
        if (savedSelectedCourses) {
          try {
            const courses = JSON.parse(savedSelectedCourses) as string[];
            const validCourses = courses.filter((name) =>
              data.schedules.some((schedule) => schedule.course_name === name)
            );
            if (validCourses.length > 0) {
              setSelectedCourses(new Set(validCourses));
            } else {
              // Fallback to default if saved courses are invalid
              const allCourseNames = new Set(
                data.schedules
                  .map((schedule) => schedule.course_name)
                  .filter((name) => name !== "General Physics")
              );
              setSelectedCourses(allCourseNames);
            }
          } catch (e) {
            // If parsing fails, use default
            const allCourseNames = new Set(
              data.schedules
                .map((schedule) => schedule.course_name)
                .filter((name) => name !== "General Physics")
            );
            setSelectedCourses(allCourseNames);
          }
        } else {
          // No saved courses, use default
          const allCourseNames = new Set(
            data.schedules
              .map((schedule) => schedule.course_name)
              .filter((name) => name !== "General Physics")
          );
          setSelectedCourses(allCourseNames);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load schedule data");
        setLoading(false);
      });
  }, []);

  // Save selectedCourses to localStorage whenever it changes
  useEffect(() => {
    if (selectedCourses.size > 0) {
      localStorage.setItem("selectedCourses", JSON.stringify(Array.from(selectedCourses)));
    }
  }, [selectedCourses]);

  // Save showPastDue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("showPastDue", String(showPastDue));
  }, [showPastDue]);

  const courseNames = useMemo(() => {
    if (!scheduleData) return [];
    return scheduleData.schedules.map((schedule) => schedule.course_name);
  }, [scheduleData]);

  const courseNameMap = useMemo(() => {
    if (!scheduleData) return new Map<string, string>();
    const map = new Map<string, string>();
    scheduleData.schedules.forEach((schedule) => {
      map.set(schedule.course_name, schedule.course_name_short);
    });
    return map;
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
          openDate: item.open_date,
          url: item.url,
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

  const isPastDue = (dueDate: string) => {
    return new Date(dueDate).getTime() <= now;
  };

  const filteredDeadlinesWithPastDue = useMemo(() => {
    if (showPastDue) {
      return filteredDeadlines;
    }
    return filteredDeadlines.filter((deadline) => !isPastDue(deadline.dueDate));
  }, [filteredDeadlines, showPastDue]);

  const upcomingCount = filteredDeadlinesWithPastDue.filter((d) => isWithinFiveDays(d.dueDate)).length;

  const handleDisclaimerClose = () => {
    if (dontShowDisclaimer) {
      localStorage.setItem("disclaimerDismissed", "true");
    }
    setShowDisclaimer(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Disclaimer Dialog */}
      <Dialog open={showDisclaimer} onOpenChange={(open) => {
        if (!open) {
          handleDisclaimerClose();
        }
      }} modal={true}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6 z-[100]">
          <DialogHeader>
            <DialogTitle>Disclaimer</DialogTitle>
            <DialogDescription className="text-base text-foreground whitespace-pre-line pt-2">
              {DISCLAIMER_TEXT}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="dont-show-disclaimer"
              checked={dontShowDisclaimer}
              onCheckedChange={(checked) => setDontShowDisclaimer(checked === true)}
            />
            <Label
              htmlFor="dont-show-disclaimer"
              className="text-sm font-normal cursor-pointer text-foreground"
            >
              I understand, don't show this next time
            </Label>
          </div>
          <DialogFooter>
            <Button onClick={handleDisclaimerClose} className="w-full sm:w-auto">I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="relative max-w-3xl mx-auto px-4 py-6 sm:py-12">
        {/* Header */}
        <header className="mb-6 sm:mb-10">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              B.Sc Computer Science
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-2">
              BITS Pilani via Coursera
            </p>
            {scheduleData && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Cohort {scheduleData.cohort} • Semester {scheduleData.semester} • Term {scheduleData.term}
              </p>
            )}
          </div>
          </header>

        {/* Course Filter */}
        {!loading && !error && courseNames.length > 0 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto justify-between text-xs h-9">
                  <span>
                    {selectedCourses.size === 0
                      ? "Select courses"
                      : Array.from(selectedCourses)
                          .map((name) => courseNameMap.get(name) || name)
                          .join(", ")}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select subjects</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {courseNames.map((courseName) => (
                      <div key={courseName} className="flex items-center space-x-2">
                        <Checkbox
                          id={courseName}
                          checked={selectedCourses.has(courseName)}
                          onCheckedChange={() => toggleCourse(courseName)}
                        />
                        <Label
                          htmlFor={courseName}
                          className="text-sm font-normal cursor-pointer text-foreground flex-1"
                        >
                          {courseName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="show-past-due"
                  className="text-xs font-medium cursor-pointer text-foreground whitespace-nowrap"
                >
                  Show past due
                </Label>
                <Switch
                  id="show-past-due"
                  checked={showPastDue}
                  onCheckedChange={setShowPastDue}
                />
              </div>
            </div>
          </div>
        )}

        {/* Deadline Cards */}
        <div className="space-y-4">
          {filteredDeadlinesWithPastDue.map((deadline, index) => (
            <DeadlineCard
              key={`${deadline.courseName}-${deadline.item}-${deadline.dueDate}`}
              item={deadline.item}
              courseName={deadline.courseName}
              dueDate={deadline.dueDate}
              weightage={deadline.weightage}
              openDate={deadline.openDate}
              url={deadline.url}
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
        {!loading && !error && filteredDeadlinesWithPastDue.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {showPastDue 
                ? "No deadlines found for selected subjects." 
                : "No upcoming deadlines found. Try enabling 'Show past due' to see past deadlines."}
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-xs text-muted-foreground">
            Made with ❤️ in God's own country
          </p>
          <p className="text-center text-xs text-muted-foreground mt-1">
            <a
              href="https://abhai.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              abhai.dev
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
