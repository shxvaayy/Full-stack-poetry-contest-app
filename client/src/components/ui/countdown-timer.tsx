import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string; // ISO string
  onComplete?: () => void;
}

export default function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        onComplete?.();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  return (
    <div className="flex justify-center space-x-1 md:space-x-4 text-center flex-wrap">
      <div className="bg-primary text-white rounded-lg p-2 md:p-4 m-1 min-w-[60px] md:min-w-[80px]">
        <div className="text-lg md:text-2xl font-bold">{timeLeft.days}</div>
        <div className="text-xs md:text-sm">Days</div>
      </div>
      <div className="bg-primary text-white rounded-lg p-2 md:p-4 m-1 min-w-[60px] md:min-w-[80px]">
        <div className="text-lg md:text-2xl font-bold">{timeLeft.hours}</div>
        <div className="text-xs md:text-sm">Hours</div>
      </div>
      <div className="bg-primary text-white rounded-lg p-2 md:p-4 m-1 min-w-[60px] md:min-w-[80px]">
        <div className="text-lg md:text-2xl font-bold">{timeLeft.minutes}</div>
        <div className="text-xs md:text-sm">Minutes</div>
      </div>
      <div className="bg-primary text-white rounded-lg p-2 md:p-4 m-1 min-w-[60px] md:min-w-[80px]">
        <div className="text-lg md:text-2xl font-bold">{timeLeft.seconds}</div>
        <div className="text-xs md:text-sm">Seconds</div>
      </div>
    </div>
  );
}
