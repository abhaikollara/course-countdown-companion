import { useEffect, useState } from "react";
import { Clock, BookOpen, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeadlineCardProps {
  item: string;
  courseName: string;
  dueDate: string;
  weightage: string;
  index: number;
  highlighted?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calculateTimeLeft = (dueDate: string): TimeLeft => {
  const difference = new Date(dueDate).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
};

const getUrgencyLevel = (timeLeft: TimeLeft): "critical" | "warning" | "normal" | "expired" => {
  if (timeLeft.total <= 0) return "expired";
  if (timeLeft.days < 1) return "critical";
  if (timeLeft.days < 3) return "warning";
  return "normal";
};

const DeadlineCard = ({ item, courseName, dueDate, weightage, index, highlighted }: DeadlineCardProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(dueDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(dueDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [dueDate]);

  const urgency = getUrgencyLevel(timeLeft);
  
  // Parse weightage and check if it's high (>= 10%)
  const weightageValue = parseFloat(weightage.replace('%', ''));
  const isHighWeightage = weightageValue >= 10;

  const urgencyStyles = {
    critical: "border-destructive/50 bg-destructive/5",
    warning: "border-warning/50 bg-warning/5",
    normal: "border-primary/30 bg-primary/5",
    expired: "border-muted/50 bg-muted/10 opacity-60",
  };

  const urgencyIndicator = {
    critical: "bg-destructive animate-pulse-glow",
    warning: "bg-warning",
    normal: "bg-primary",
    expired: "bg-muted-foreground",
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={cn(
        "glass-card rounded-lg p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-fade-in",
        urgencyStyles[urgency],
        highlighted && "ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={cn("w-2 h-2 rounded-full shrink-0", urgencyIndicator[urgency])} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" />
              {courseName}
            </span>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded",
              isHighWeightage 
                ? "text-amber-600 bg-amber-500/20 border border-amber-500/30" 
                : "text-primary bg-primary/10"
            )}>
              {weightage}
            </span>
          </div>
          
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 break-words">
            {item}
          </h3>
          
          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {formatDate(dueDate)}
          </p>
        </div>

        {urgency === "expired" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Past Due</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            {urgency === "critical" && (
              <AlertTriangle className="w-4 h-4 text-destructive mr-2 animate-pulse" />
            )}
            <TimeUnit value={timeLeft.days} label="d" />
            <span className="text-muted-foreground">:</span>
            <TimeUnit value={timeLeft.hours} label="h" />
            <span className="text-muted-foreground">:</span>
            <TimeUnit value={timeLeft.minutes} label="m" />
            <span className="text-muted-foreground">:</span>
            <TimeUnit value={timeLeft.seconds} label="s" />
          </div>
        )}
      </div>
    </div>
  );
};

const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center min-w-[1.75rem] sm:min-w-[2.5rem]">
    <span className="text-base sm:text-xl font-bold text-foreground tabular-nums">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">
      {label}
    </span>
  </div>
);

export default DeadlineCard;
