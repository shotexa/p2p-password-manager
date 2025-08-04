import * as React from "react";
import { cn } from "@src/lib/utils";

const RecoveryWords = React.forwardRef(
  ({ mode = "input", words = [], onChange, className, ...props }, ref) => {
    const handleWordChange = (index, value) => {
      if (mode === "input" && onChange) {
        const newWords = [...words];
        newWords[index] = value;
        onChange(newWords);
      }
    };

    return (
      <div
        className={cn(
          "grid grid-cols-3 gap-4 p-4 rounded-lg border border-input",
          className
        )}
        {...props}
        ref={ref}
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-6">
              {index + 1}.
            </span>
            {mode === "input" ? (
              <input
                type="text"
                value={words[index] || ""}
                onChange={(e) => handleWordChange(index, e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter word"
              />
            ) : (
              <div className="flex h-10 w-full items-center rounded-md bg-muted px-3 py-2 text-sm font-mono">
                {words[index] || ""}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

RecoveryWords.displayName = "RecoveryWords";

export { RecoveryWords };
