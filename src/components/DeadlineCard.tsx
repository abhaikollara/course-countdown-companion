import { useEffect, useState } from "react";
import { Clock, BookOpen, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeadlineCardProps {
  item: string;
  courseName: string;
  dueDate: string;
  index: number;
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

const DeadlineCard = ({ item, courseName, dueDate, index }: DeadlineCardProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(dueDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(dueDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [dueDate]);

  const urgency = getUrgencyLevel(timeLeft);

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
    return new Date(dateString).toLocaleDateString("en-US", {
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
        "glass-card rounded-lg p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-fade-in",
        urgencyStyles[urgency]
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("w-2 h-2 rounded-full", urgencyIndicator[urgency])} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" />
              {courseName}
            </span>
          </div>
          
          <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
            {item}
          </h3>
          
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(dueDate)}
          </p>
        </div>

        {urgency === "expired" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Past Due</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
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
  <div className="flex flex-col items-center min-w-[2.5rem]">
    <span className="text-xl font-bold text-foreground tabular-nums">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
      {label}
    </span>
  </div>
);

export default DeadlineCard;
