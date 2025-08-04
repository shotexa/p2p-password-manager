import { useEffect, useState } from "react";
import { Button } from "@src/components/ui/button";
import { PasswordInput } from "@src/components/ui/PasswordInput";
import { RecoveryWords } from "@src/components/ui/RecoveryWords";
import { generateMnemonic, mnemonicToEntropy } from "web-bip39";
import wordlist from "web-bip39/wordlists/english";
import { getKeyPairSeed } from "@src/lib/utils";
import { useKeyPairSeed } from "@src/contexts/KeyPairContext";

const Setup = ({ onSetupComplete }) => {
  const { setKeyPairSeed } = useKeyPairSeed();
  const [setupMode, setSetupMode] = useState(null); // "new", "existing", null
  const [recoveryWords, setRecoveryWords] = useState([]); // when setupMode is existing and we have recovery words from the user
  const [password, setPassword] = useState("");
  const [generatedWords, setGeneratedWords] = useState([]); // when setupMode is new and we generate new mnemonic

  const onSubmit = async (e) => {
    e.preventDefault();
    
    const words = setupMode === "new" ? generatedWords : recoveryWords;
    const seed = await mnemonicToEntropy(words.join(" "), wordlist);
    const seedHex = Buffer.from(seed).toString("hex");
    localStorage.setItem("seed", seedHex);

    const keyPairSeed = await getKeyPairSeed(seedHex, password);
    setKeyPairSeed(keyPairSeed);
    onSetupComplete();
  };

  useEffect(() => {
    if (setupMode === "new") {
      generateMnemonic(wordlist).then((mnemonic) => {
        setGeneratedWords(mnemonic.split(" "));
      });
    }
  }, [setupMode]);

  if (setupMode === null) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">
              Welcome to Password Manager
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose how you want to get started
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Button
              variant="outline"
              className="h-24"
              onClick={() => setSetupMode("new")}
            >
              <div className="text-left">
                <div className="font-semibold">Create New Account</div>
                <div className="text-sm text-muted-foreground">
                  Set up a new password manager account
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-24"
              onClick={() => setSetupMode("existing")}
            >
              <div className="text-left">
                <div className="font-semibold">Use Existing Account</div>
                <div className="text-sm text-muted-foreground">
                  Restore your account using recovery words
                </div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  } else
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">
              {setupMode === "new"
                ? "Your Recovery Words"
                : "Enter Recovery Words"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {setupMode === "new"
                ? "Save these words in a secure place. You'll need them to recover your account."
                : "Enter your 12 recovery words in the correct order."}
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-6">
            <RecoveryWords
              mode={setupMode === "new" ? "display" : "input"}
              words={setupMode === "new" ? generatedWords : recoveryWords}
              onChange={setupMode === "new" ? undefined : setRecoveryWords}
            />
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Create Password</h2>
                <p className="text-sm text-muted-foreground">
                  This password will be used to unlock your vault on this device
                </p>
              </div>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <Button type="submit" className="w-full">
                Complete Setup
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
};

export default Setup;
