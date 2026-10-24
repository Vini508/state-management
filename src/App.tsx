import { Dashboard } from "./components/Dashboard";
import { SensorProvider } from "./state/SensorContext";

export default function App() {
  return (
    <SensorProvider>
      <Dashboard />
    </SensorProvider>
  );
}
