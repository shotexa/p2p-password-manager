import { useState, useEffect } from "react";
import Index from "@src/pages/Index";
import Setup from "@src/pages/Setup";
import UnlockScreen from "@src/components/UnlockScreen";
import { AppWideSeedProvider } from "@src/contexts/AppWideSeedContext";
import "@src/App.css";

function App() {
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const seed = localStorage.getItem("seed");
    if (seed === null) setSetupNeeded(true);
  }, []);

  return (
    <AppWideSeedProvider>
      {isUnlocked ? (
        <Index />
      ) : setupNeeded ? (
        <Setup
          onSetupComplete={(appWideSeed) => {
            setIsUnlocked(true);
          }}
        />
      ) : (
        <UnlockScreen
          onUnlock={(appWideSeed) => {
            setIsUnlocked(true);
          }}
        />
      )}
    </AppWideSeedProvider>
  );
}

export default App;
