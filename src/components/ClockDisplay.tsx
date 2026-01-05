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

  const timeString = format(currentTime, "h:mm");
  const dateString = format(currentTime, "EEEE, MMMM d");

  return (
    <div className="gb-section flex-1 flex flex-col">
      <div className="gb-kicker">
        <span>Kitchen Display</span>
      </div>

      <div className="flex flex-col gap-3 flex-1 justify-center">
        <div className="gb-time" aria-label="Current time">
          {timeString}
        </div>
        <div className="gb-date" aria-label="Current date">
          <span className="gb-dot" aria-hidden="true"></span>
          <span>{dateString}</span>
        </div>
      </div>
    </div>
  );
};

export default ClockDisplay;
