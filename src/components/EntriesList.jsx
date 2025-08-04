import { PasswordEntry } from "@src/components/PasswordEntry";

export const EntriesList = ({ selectedEntryId, onEntrySelect, onNewEntry, entriesArray }) => {
  return (
    <div className="flex-1 flex flex-col border-r border-border">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {entriesArray.map((entry) => (
          <PasswordEntry
            key={entry.id}
            title={entry.title}
            username={entry.username}
            isSelected={selectedEntryId === entry.id}
            onClick={() => onEntrySelect(entry)}
          />
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <button 
          onClick={onNewEntry}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <span className="text-2xl">+</span>
          <span>Add New Entry</span>
        </button>
      </div>
    </div>
  );
};