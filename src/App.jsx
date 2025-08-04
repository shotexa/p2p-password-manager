import { useState, useEffect } from "react";
import Index from "@src/pages/Index";
import Setup from "@src/pages/Setup";
import UnlockScreen from "@src/components/UnlockScreen";
import { KeyPairSeedProvider } from "@src/contexts/KeyPairContext";
import "@src/App.css";

function App() {
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const seed = localStorage.getItem("seed");
    if (seed === null) setSetupNeeded(true);
  }, []);

  return (
    <KeyPairSeedProvider>
      {isUnlocked ? (
        <Index />
      ) : setupNeeded ? (
        <Setup
          onSetupComplete={(keyPairSeed) => {
            setIsUnlocked(true);
          }}
        />
      ) : (
        <UnlockScreen
          onUnlock={(keyPairSeed) => {
            setIsUnlocked(true);
          }}
        />
      )}
    </KeyPairSeedProvider>
  );
}

export default App;
