import { useState, useEffect } from "react";
import { format } from "date-fns";

const ClockDisplay = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = format(currentTime, "h");
  const minutes = format(currentTime, "mm");
  const month = format(currentTime, "MMM");
  const abbreviatedMonth = month === "Sep" ? "Sept" : month;
  const dateLabel = `${format(currentTime, "EEEE")}, ${abbreviatedMonth} ${format(currentTime, "do")}`;
  const englandTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(currentTime);

  return (
    <div className="gb-section flex-1 flex flex-col justify-center py-0">
      <div className="flex flex-col gap-2">
        <div className="gb-time-xl" aria-label="Current time">
          {hours}
          <span className="animate-blink">:</span>
          {minutes}
        </div>
        <div className="gb-date-xl flex flex-col gap-0" aria-label={`Current date: ${dateLabel}`}>
          <div className="gb-date-line flex items-center gap-3">
            <span className="gb-dot-lg" aria-hidden="true"></span>
            <span>{dateLabel}</span>
          </div>
          <div className="gb-england-time" aria-label={`England time: ${englandTime}`}>
            <span className="gb-england-time-label">England</span>
            <span>{englandTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockDisplay;
