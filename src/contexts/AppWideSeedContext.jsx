import { createContext, useContext, useState } from "react";

const AppWideSeedContext = createContext(null);

export const AppWideSeedProvider = ({ children }) => {
  const [appWideSeed, setAppWideSeed] = useState(null);

  return (
    <AppWideSeedContext.Provider value={{ appWideSeed, setAppWideSeed }}>
      {children}
    </AppWideSeedContext.Provider>
  );
};

export const useAppWideSeed = () => {
  const context = useContext(AppWideSeedContext);
  if (!context) {
    throw new Error("useAppWideSeed must be used within a AppWideSeedProvider");
  }
  return context;
};