import { createContext, useContext, useState } from "react";

const KeyPairSeedContext = createContext(null);

export const KeyPairSeedProvider = ({ children }) => {
  const [keyPairSeed, setKeyPairSeed] = useState(null);

  return (
    <KeyPairSeedContext.Provider value={{ keyPairSeed, setKeyPairSeed }}>
      {children}
    </KeyPairSeedContext.Provider>
  );
};

export const useKeyPairSeed = () => {
  const context = useContext(KeyPairSeedContext);
  if (!context) {
    throw new Error("useKeyPairSeed must be used within a KeyPairSeedProvider");
  }
  return context;
};