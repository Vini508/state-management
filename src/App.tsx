import { Profiler } from "react";
import { Dashboard } from "./components/Dashboard";
import { SimulationClock } from "./components/SimulationClock";
import { onAppRender } from "./measurement";
import { SensorProvider } from "./state";

export default function App() {
  return (
    // O Profiler só informa as renderizações no build de profiling.
    <Profiler id="app" onRender={onAppRender}>
      <SensorProvider>
        <SimulationClock />
        <Dashboard />
      </SensorProvider>
    </Profiler>
  );
}
