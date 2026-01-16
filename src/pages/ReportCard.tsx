import { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap, Trophy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SCHEDULE_URL = "/schedule.json";

interface ScheduleItem {
    item: string;
    due_date: string;
    weightage: string;
    open_date?: string;
    url?: string;
    is_compre?: boolean;
}

interface Schedule {
    course_name: string;
    course_name_short: string;
    credits?: number;
    items: ScheduleItem[];
}

interface DeadlineItem {
    item: string;
    courseName: string;
    dueDate: string;
    weightage: string;
    openDate?: string;
    url?: string;
    isCompre?: boolean;
}

interface ScheduleData {
    cohort: number;
    semester: number;
    term: number;
    schedules: Schedule[];
}

const ReportCard = () => {
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
    const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
    const [scores, setScores] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    // Load data and checking local storage
    useEffect(() => {
        // Fetch schedule
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
                            // Fallback to default
                            const allCourseNames = new Set(
                                data.schedules
                                    .map((schedule) => schedule.course_name)
                                    .filter((name) => name !== "General Physics")
                            );
                            setSelectedCourses(allCourseNames);
                        }
                    } catch (e) {
                        // Fallback to default
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
                console.error("Failed to load schedule", err);
                setLoading(false);
            });

        // Load completed items
        const savedCompletedItems = localStorage.getItem("completedItems");
        if (savedCompletedItems) {
            try {
                const items = JSON.parse(savedCompletedItems);
                if (Array.isArray(items)) {
                    setCompletedItems(new Set(items));
                }
            } catch (e) {
                // ignore
            }
        }

        // Load scores
        const savedScores = localStorage.getItem("scores");
        if (savedScores) {
            try {
                const parsedScores = JSON.parse(savedScores);
                if (parsedScores && typeof parsedScores === 'object') {
                    setScores(parsedScores as Record<string, number>);
                }
            } catch (e) {
                // ignore
            }
        }
    }, []);

    useEffect(() => {
        if (selectedCourses.size > 0) {
            localStorage.setItem("selectedCourses", JSON.stringify(Array.from(selectedCourses)));
        }
    }, [selectedCourses]);

    // Flatten and sort deadlines for the modal
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
                    isCompre: item.is_compre,
                });
            });
        });

        return allItems.sort((a, b) => {
            // Place compre items last
            if (a.isCompre && !b.isCompre) return 1;
            if (!a.isCompre && b.isCompre) return -1;
            if (a.isCompre && b.isCompre) return 0;

            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
    }, [scheduleData]);

    // Calculate statistics (reused logic)
    const stats = useMemo(() => {
        if (!scheduleData) return { overall: { total: 0, completed: 0, percentage: 0, gpa: 0, totalCredits: 0 }, courses: [] };

        let overallTotal = 0;
        let overallCompleted = 0;
        let totalWeightedScore = 0;
        let totalCredits = 0;
        let totalGradePoints = 0; // For GPA calculation if needed, though simple average might be enough for now

        const courseStats = scheduleData.schedules.map((schedule) => {
            let courseTotal = 0;
            let courseCompleted = 0;
            let courseWeightedScore = 0;
            let courseTotalWeightage = 0;

            schedule.items.forEach((item) => {
                courseTotal++;

                // Parse weightage
                const weightageStr = item.weightage.replace('%', '');
                const weightage = parseFloat(weightageStr);
                if (!isNaN(weightage)) {
                    courseTotalWeightage += weightage;
                }

                const id = `${schedule.course_name}-${item.item}-${item.due_date}`;
                if (completedItems.has(id)) {
                    courseCompleted++;

                    // Calculate weighted score
                    const score = scores[id];
                    if (score !== undefined) {
                        if (!isNaN(weightage)) {
                            courseWeightedScore += (score / 100) * weightage;
                        }
                    }
                }
            });

            const credits = schedule.credits || 0;
            totalCredits += credits;
            // Assuming course grade is out of 100
            // Contribution to GPA = (Grade / 10) * Credits (Standard 10-point scale rough approximation)
            // Or just a weighted average of percentages for now.

            // Let's stick to percentage for now as 'GPA' calculation varies.
            // But user asked for "Report Card", so maybe a Grade Letter would be cool.

            const percentage = courseTotal > 0 ? Math.round((courseCompleted / courseTotal) * 100) : 0;
            const currentGrade = parseFloat(courseWeightedScore.toFixed(2));

            // Add to overall stats
            overallTotal += courseTotal;
            overallCompleted += courseCompleted;

            return {
                name: schedule.course_name,
                shortName: schedule.course_name_short,
                credits: credits,
                totalItems: courseTotal,
                completedItems: courseCompleted,
                progress: percentage,
                currentGrade: currentGrade,
                maxPossibleGrade: courseTotalWeightage // Should be 100 ideally
            };
        });

        const filteredCourseStats = courseStats.filter(c => selectedCourses.has(c.name));

        // Calculate overall stats based ONLY on selected courses
        filteredCourseStats.forEach(c => {
            overallTotal += c.totalItems;
            overallCompleted += c.completedItems;
        });

        // Calculate overall weighted average if needed, or just progress
        const overallPercentage = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

        // CGPA Calculation (Approximate: Grade/10 * Credits) / Total Credits
        // Only counts if credits > 0
        let totalGradePointsSum = 0;
        let totalCreditsForGpa = 0;

        filteredCourseStats.forEach(c => {
            if (c.credits > 0) {
                // Convert percentage to 10 point scale (simply / 10 for now)
                const gp = (c.currentGrade / 10);
                totalGradePointsSum += gp * c.credits;
                totalCreditsForGpa += c.credits;
            }
        });

        const gpa = totalCreditsForGpa > 0 ? (totalGradePointsSum / totalCreditsForGpa).toFixed(2) : "0.00";

        return {
            overall: {
                total: overallTotal,
                completed: overallCompleted,
                percentage: overallPercentage,
                gpa,
                totalCredits: totalCreditsForGpa
            },
            courses: filteredCourseStats
        };
    }, [scheduleData, completedItems, scores, selectedCourses]);

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

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            {/* Grade Sheet Modal */}
            <Dialog open={selectedSubject !== null} onOpenChange={(open) => !open && setSelectedSubject(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            {selectedSubject}
                        </DialogTitle>
                        <DialogDescription>
                            Grade sheet and task breakdown
                            {scheduleData?.schedules.find(s => s.course_name === selectedSubject)?.credits && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                    {scheduleData.schedules.find(s => s.course_name === selectedSubject)?.credits} Credits
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSubject && (
                        <div className="mt-4">
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr className="border-b">
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Task</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground hidden sm:table-cell">Due Date</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground hidden sm:table-cell">Weightage</th>
                                            <th className="h-10 px-4 text-center font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedDeadlines
                                            .filter(d => d.courseName === selectedSubject)
                                            .map((deadline) => {
                                                const id = `${deadline.courseName}-${deadline.item}-${deadline.dueDate}`;
                                                const isCompleted = completedItems.has(id);
                                                const score = scores[id];

                                                return (
                                                    <tr key={id} className={cn("border-b last:border-0 transition-colors hover:bg-muted/50", isCompleted && "bg-muted/20")}>
                                                        <td className={cn("p-4 font-medium", isCompleted && "text-muted-foreground line-through")}>
                                                            {deadline.item}
                                                        </td>
                                                        <td className="p-4 text-muted-foreground hidden sm:table-cell">
                                                            {deadline.isCompre ? (
                                                                <span className="italic">Comprehensive Exam</span>
                                                            ) : (
                                                                deadline.dueDate ? new Date(deadline.dueDate).toLocaleDateString() : "-"
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right font-mono hidden sm:table-cell">
                                                            {deadline.weightage}
                                                        </td>
                                                        <td className="p-4 text-center hidden sm:table-cell">
                                                            {isCompleted ? (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                                                                    Done
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">
                                                                    Pending
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right font-mono">
                                                            {score !== undefined ? `${score}%` : "-"}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex flex-col sm:flex-row justify-between gap-4 bg-muted/30 p-4 rounded-lg">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Weightage</p>
                                    <p className="text-2xl font-bold">
                                        {sortedDeadlines
                                            .filter(d => d.courseName === selectedSubject)
                                            .reduce((acc, curr) => acc + parseFloat(curr.weightage.replace('%', '')), 0)}%
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Current Grade</p>
                                    <p className="text-2xl font-bold text-primary">
                                        {stats.courses.find(c => c.name === selectedSubject)?.currentGrade ?? 0}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link to="/">
                        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Report Card</h1>
                        <p className="text-muted-foreground mt-1">
                            Semester Performance Summary
                        </p>
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-between text-xs h-9">
                                <span>
                                    {selectedCourses.size === 0
                                        ? "Select courses"
                                        : selectedCourses.size + " selected"}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3" align="end">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Select subjects</Label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {scheduleData?.schedules.map((schedule) => (
                                        <div key={schedule.course_name} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`rc-${schedule.course_name}`}
                                                checked={selectedCourses.has(schedule.course_name)}
                                                onCheckedChange={() => toggleCourse(schedule.course_name)}
                                            />
                                            <Label
                                                htmlFor={`rc-${schedule.course_name}`}
                                                className="text-sm font-normal cursor-pointer text-foreground block truncate"
                                            >
                                                {schedule.course_name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>


                </div>

                <div className="grid gap-6">
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <div className="p-6 bg-muted/10 border-b">
                            <h2 className="font-semibold flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-primary" />
                                Course Breakdown
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                    <tr>
                                        <th className="px-6 py-4">Subject</th>
                                        <th className="px-6 py-4 text-center">Credits</th>
                                        <th className="px-6 py-4 text-center">Progress</th>
                                        <th className="px-6 py-4 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {stats.courses.map((course) => (
                                        <tr key={course.name} className="hover:bg-muted/30 transition-colors">
                                            <td
                                                className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors group"
                                                onClick={() => setSelectedSubject(course.name)}
                                            >
                                                <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                                    {course.name}
                                                    <BookOpen className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {course.completedItems} / {course.totalItems} tasks completed
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {course.credits > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-medium">
                                                        {course.credits}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3 justify-center min-w-[120px]">
                                                    <Progress value={course.progress} className="h-1.5 w-16" />
                                                    <span className="text-xs text-muted-foreground w-8 text-right">{course.progress}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-mono font-medium">
                                                    {course.currentGrade.toFixed(2)}%
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    of {course.maxPossibleGrade}%
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportCard;
