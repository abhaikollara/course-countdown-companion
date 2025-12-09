import { useEffect, useState } from "react";
import { Clock, BookOpen, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeadlineCardProps {
  item: string;
  courseName: string;
  dueDate: string;
  weightage: string;
  openDate: string;
  url?: string;
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

const DeadlineCard = ({ item, courseName, dueDate, weightage, openDate, url, index, highlighted }: DeadlineCardProps) => {
  // Calculate time left for both open and due dates
  const [openTimeLeft, setOpenTimeLeft] = useState<TimeLeft>(() => 
    openDate && openDate.trim() !== "" ? calculateTimeLeft(openDate) : { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  );
  const [dueTimeLeft, setDueTimeLeft] = useState<TimeLeft>(calculateTimeLeft(dueDate));

  // Update immediately when dates change
  useEffect(() => {
    if (openDate && openDate.trim() !== "") {
      setOpenTimeLeft(calculateTimeLeft(openDate));
    }
    setDueTimeLeft(calculateTimeLeft(dueDate));
  }, [openDate, dueDate]);

  // Update every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (openDate && openDate.trim() !== "") {
        setOpenTimeLeft(calculateTimeLeft(openDate));
      }
      setDueTimeLeft(calculateTimeLeft(dueDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [openDate, dueDate]);

  // Calculate urgency based on due date
  const urgency = getUrgencyLevel(dueTimeLeft);
  
  // Parse weightage and check if it's high (>= 10%)
  const weightageValue = parseFloat(weightage.replace('%', ''));
  const isHighWeightage = weightageValue >= 10;

  // Check if item is currently open (after open_date and before due_date)
  const now = new Date().getTime();
  const isOpenNow = openDate && openDate.trim() !== "" && 
    new Date(openDate).getTime() <= now && 
    new Date(dueDate).getTime() > now;

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

  const formatTimeRemaining = (timeLeft: TimeLeft): string => {
    if (timeLeft.total <= 0) return "Past due";
    
    if (timeLeft.days > 0) {
      if (timeLeft.hours > 0) {
        return `${timeLeft.days} day${timeLeft.days !== 1 ? "s" : ""}, ${timeLeft.hours} hour${timeLeft.hours !== 1 ? "s" : ""}`;
      }
      return `${timeLeft.days} day${timeLeft.days !== 1 ? "s" : ""}`;
    }
    
    if (timeLeft.hours > 0) {
      if (timeLeft.minutes > 0) {
        return `${timeLeft.hours} hour${timeLeft.hours !== 1 ? "s" : ""}, ${timeLeft.minutes} min${timeLeft.minutes !== 1 ? "s" : ""}`;
      }
      return `${timeLeft.hours} hour${timeLeft.hours !== 1 ? "s" : ""}`;
    }
    
    if (timeLeft.minutes > 0) {
      return `${timeLeft.minutes} minute${timeLeft.minutes !== 1 ? "s" : ""}`;
    }
    
    return `${timeLeft.seconds} second${timeLeft.seconds !== 1 ? "s" : ""}`;
  };

  const handleClick = () => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={cn(
        "glass-card rounded-lg p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-fade-in",
        urgencyStyles[urgency],
        highlighted && "ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.3)]",
        url && "cursor-pointer"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={handleClick}
      role={url ? "button" : undefined}
      tabIndex={url ? 0 : undefined}
      onKeyDown={(e) => {
        if (url && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
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
          
          <div className="space-y-1">
            {openDate && openDate.trim() !== "" && (
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                Opens: {formatDate(openDate)}
              </p>
            )}
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Due: {formatDate(dueDate)}
            </p>
          </div>
        </div>

        {urgency === "expired" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Past Due</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 shrink-0 items-end">
            {openDate && openDate.trim() !== "" && (
              <div className="flex flex-col items-end">
                {isOpenNow ? (
                  <>
                    <span className="text-xs text-muted-foreground mb-1">Status:</span>
                    <span className="text-sm font-semibold text-green-600">
                      Open now
                    </span>
                  </>
                ) : openTimeLeft.total > 0 ? (
                  <>
                    <span className="text-xs text-muted-foreground mb-1">Opens in:</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatTimeRemaining(openTimeLeft)}
                    </span>
                  </>
                ) : null}
              </div>
            )}
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground mb-1">Due in:</span>
              <div className="flex items-center gap-2">
                {urgency === "critical" && (
                  <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {formatTimeRemaining(dueTimeLeft)}
                </span>
              </div>
            </div>
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
