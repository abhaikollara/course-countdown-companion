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
import { Progress } from "@/components/ui/progress";
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
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [dontShowDisclaimer, setDontShowDisclaimer] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Record<string, number>>({});

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedShowPastDue = localStorage.getItem("showPastDue");
    if (savedShowPastDue !== null) {
      setShowPastDue(savedShowPastDue === "true");
    }

    const savedShowCompleted = localStorage.getItem("showCompleted");
    if (savedShowCompleted !== null) {
      setShowCompleted(savedShowCompleted === "true");
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

    const savedCompletedItems = localStorage.getItem("completedItems");
    if (savedCompletedItems) {
      try {
        const items = JSON.parse(savedCompletedItems);
        if (Array.isArray(items)) {
          setCompletedItems(new Set(items));
        }
      } catch (e) {
        // If parsing fails, ignore
      }
    }

    const savedScores = localStorage.getItem("scores");
    if (savedScores) {
      try {
        const parsedScores = JSON.parse(savedScores);
        if (parsedScores && typeof parsedScores === 'object') {
          setScores(parsedScores as Record<string, number>);
        }
      } catch (e) {
        // If parsing fails, ignore
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

  // Save showCompleted to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("showCompleted", String(showCompleted));
  }, [showCompleted]);

  // Save completedItems to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("completedItems", JSON.stringify(Array.from(completedItems)));
  }, [completedItems]);

  // Save scores to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("scores", JSON.stringify(scores));
  }, [scores]);

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

  const toggleCompleted = (id: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleScoreChange = (id: string, score: number) => {
    setScores((prev) => ({
      ...prev,
      [id]: score,
    }));
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
    let result = filteredDeadlines;

    if (!showPastDue) {
      result = result.filter((deadline) => !isPastDue(deadline.dueDate));
    }

    if (!showCompleted) {
      result = result.filter((deadline) => {
        const id = `${deadline.courseName}-${deadline.item}-${deadline.dueDate}`;
        return !completedItems.has(id);
      });
    }

    return result;
  }, [filteredDeadlines, showPastDue, showCompleted, completedItems]);

  const upcomingCount = filteredDeadlinesWithPastDue.filter((d) => isWithinFiveDays(d.dueDate)).length;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!scheduleData) return { overall: { total: 0, completed: 0, percentage: 0 }, courses: new Map() };

    const courses = new Map<string, { total: number; completed: number; percentage: number; grade: number }>();
    let overallTotal = 0;
    let overallCompleted = 0;

    scheduleData.schedules.forEach((schedule) => {
      let courseTotal = 0;
      let courseCompleted = 0;
      let courseWeightedScore = 0;

      schedule.items.forEach((item) => {
        courseTotal++;
        const id = `${schedule.course_name}-${item.item}-${item.due_date}`;
        if (completedItems.has(id)) {
          courseCompleted++;

          // Calculate weighted score
          const score = scores[id];
          if (score !== undefined) {
            const weightageStr = item.weightage.replace('%', '');
            const weightage = parseFloat(weightageStr);
            if (!isNaN(weightage)) {
              courseWeightedScore += (score / 100) * weightage;
            }
          }
        }
      });

      // Only add to overall stats if the course is selected
      if (selectedCourses.has(schedule.course_name)) {
        overallTotal += courseTotal;
        overallCompleted += courseCompleted;
      }

      courses.set(schedule.course_name, {
        total: courseTotal,
        completed: courseCompleted,
        percentage: courseTotal > 0 ? Math.round((courseCompleted / courseTotal) * 100) : 0,
        grade: parseFloat(courseWeightedScore.toFixed(2)),
      });
    });

    return {
      overall: {
        total: overallTotal,
        completed: overallCompleted,
        percentage: overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0,
      },
      courses,
    };
  }, [scheduleData, completedItems, selectedCourses, scores]);

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

          {/* Overall Progress */}
          {!loading && !error && (
            <div className="max-w-md">
              <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-1.5">
                <span>Overall Progress</span>
                <span className="font-medium text-foreground">{stats.overall.percentage}%</span>
              </div>
              <Progress value={stats.overall.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1.5">
                {stats.overall.completed} of {stats.overall.total} tasks completed
              </p>
            </div>
          )}
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
              <PopoverContent className="w-80 p-3" align="start">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select subjects</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {courseNames.map((courseName) => {
                      const courseStat = stats.courses.get(courseName);
                      return (
                        <div key={courseName} className="flex items-center space-x-2">
                          <Checkbox
                            id={courseName}
                            checked={selectedCourses.has(courseName)}
                            onCheckedChange={() => toggleCourse(courseName)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <Label
                                htmlFor={courseName}
                                className="text-sm font-normal cursor-pointer text-foreground block truncate"
                              >
                                {courseName}
                              </Label>
                              {courseStat && (
                                <span className="text-[10px] font-medium text-primary">
                                  Grade: {courseStat.grade}%
                                </span>
                              )}
                            </div>
                            {courseStat && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <Progress value={courseStat.percentage} className="h-1 flex-1" />
                                <span className="text-[10px] text-muted-foreground w-8 text-right">
                                  {courseStat.percentage}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="show-completed"
                  className="text-xs font-medium cursor-pointer text-foreground whitespace-nowrap"
                >
                  Show completed
                </Label>
                <Switch
                  id="show-completed"
                  checked={showCompleted}
                  onCheckedChange={setShowCompleted}
                />
              </div>
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
          {filteredDeadlinesWithPastDue.map((deadline, index) => {
            const id = `${deadline.courseName}-${deadline.item}-${deadline.dueDate}`;
            return (
              <DeadlineCard
                key={id}
                item={deadline.item}
                courseName={deadline.courseName}
                dueDate={deadline.dueDate}
                weightage={deadline.weightage}
                openDate={deadline.openDate}
                url={deadline.url}
                index={index}
                highlighted={isWithinFiveDays(deadline.dueDate)}
                isCompleted={completedItems.has(id)}
                onToggleCompleted={() => toggleCompleted(id)}
                score={scores[id]}
                onScoreChange={(score) => handleScoreChange(id, score)}
              />
            );
          })}
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
