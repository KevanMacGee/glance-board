import { useState, useEffect } from "react";
import { format } from "date-fns";

const worldClocks = [
  { label: "UK", timeZone: "Europe/London" },
  { label: "NZ", timeZone: "Pacific/Auckland" },
].map(({ label, timeZone }) => ({
  label,
  formatter: new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }),
}));

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

  return (
    <div className="gb-section flex-1 flex flex-col justify-center py-0">
      <div className="gb-blink-source flex flex-col gap-2">
        <div className="gb-time-xl" aria-label="Current time">
          {hours}
          <span className="animate-blink">:</span>
          {minutes}
        </div>
        <div className="gb-date-xl flex flex-col gap-0" aria-label={`Current date: ${dateLabel}`}>
          <div className="gb-date-line flex items-center gap-3">
            <span>{dateLabel}</span>
          </div>
          <div className="gb-world-times">
            {worldClocks.map(({ label, formatter }) => {
              const time = formatter.format(currentTime).replace(/\s/g, "").toLowerCase();
              const [hour, minuteAndPeriod] = time.split(":");
              return (
                <div key={label} aria-label={`${label} time: ${time}`}>
                  <span className="gb-world-time-label">{label}:</span>{" "}
                  {hour}<span className="animate-blink">:</span>{minuteAndPeriod}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockDisplay;
