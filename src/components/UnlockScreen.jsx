import * as React from "react";
import { Button } from "@src/components/ui/button";
import { PasswordInput } from "@src/components/ui/PasswordInput";
import { getAppWideSeed } from "@src/lib/utils";
import { useAppWideSeed } from "@src/contexts/AppWideSeedContext";

const UnlockScreen = ({ onUnlock }) => {
  const { setAppWideSeed } = useAppWideSeed();
  const [password, setPassword] = React.useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
   
    const seed = localStorage.getItem("seed");
    const appWideSeed = await getAppWideSeed(seed, password);

    setAppWideSeed(appWideSeed);
    onUnlock();
  };

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your password to unlock your vault
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          <Button type="submit" className="w-full">
            Unlock
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UnlockScreen;