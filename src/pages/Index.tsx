import ClockDisplay from "@/components/ClockDisplay";
import WeatherDisplay from "@/components/WeatherDisplay";
import AppointmentsList from "@/components/AppointmentsList";

const Index = () => {
  return (
    <main 
      className="h-screen p-7 grid gap-[22px]"
      style={{ gridTemplateColumns: "0.44fr 0.56fr" }}
      aria-label="Glance Board - Kitchen wall calendar"
    >
      {/* Left Column - Clock & Weather */}
      <section className="gb-panel flex flex-col gap-[18px] p-[22px]" aria-label="Status column">
        <ClockDisplay />
        <WeatherDisplay />
      </section>

      {/* Right Column - Appointments */}
      <AppointmentsList />
    </main>
  );
};

export default Index;
