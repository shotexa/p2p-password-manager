export const PasswordEntry = ({ title, username, isSelected, onClick }) => {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
        isSelected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-entry-bg hover:bg-entry-hover border-border"
      }`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-medium truncate ${
            isSelected ? "text-primary-foreground" : "text-foreground"
          }`}
        >
          {title}
        </div>

        <div
          className={`text-xs truncate ${
            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {username}
        </div>
      </div>
    </div>
  );
};
