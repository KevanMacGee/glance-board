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
  const dayOfWeek = format(currentTime, "EEEE,");
  const monthAndDay = format(currentTime, "MMMM d");

  return (
    <div className="gb-section flex-1 flex flex-col justify-center py-0">
      <div className="flex flex-col gap-2">
        <div className="gb-time-xl" aria-label="Current time">
          {hours}
          <span className="animate-blink">:</span>
          {minutes}
        </div>
        <div className="gb-date-xl flex items-center gap-3" aria-label="Current date">
          <span className="gb-dot-lg" aria-hidden="true"></span>
          <span>{dayOfWeek}</span>
          <span>{monthAndDay}</span>
        </div>
      </div>
    </div>
  );
};

export default ClockDisplay;
