import { Dashboard } from "./components/Dashboard";
import { SimulationClock } from "./components/SimulationClock";
import { SensorProvider } from "./state";

export default function App() {
  return (
    <SensorProvider>
      <SimulationClock />
      <Dashboard />
    </SensorProvider>
  );
}
