import { Eye, EyeOff, Copy, Edit, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import { PasswordInput } from "@src/components/ui/PasswordInput";

export const DetailPanel = ({ item, onSave, onCancel, onDelete, isNew = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(isNew);
  const [formData, setFormData] = useState({
    title: item.title,
    username: item.username,
    password: item.password,
  });

  if (!item) {
    return null;
  }

  const handleEdit = () => {
    setFormData({
      title: item.title,
      username: item.username,
      password: item.password,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <div className="w-80 bg-background border-l border-border p-6 flex flex-col">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-6">
        ITEM INFORMATION
      </h2>

      <div className="space-y-6 flex-1">
        <div>
          <label className="text-sm text-muted-foreground block mb-2">Name</label>
          <input
            type="text"
            value={isEditing ? formData.title : item.title}
            onChange={handleChange("title")}
            disabled={!isEditing}
            className="w-full bg-transparent border rounded p-2 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-2">Username</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={isEditing ? formData.username : item.username}
              onChange={handleChange("username")}
              disabled={!isEditing}
              className="flex-1 bg-transparent border rounded p-2 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-2">Password</label>
          <div className="flex items-center gap-2">
            <input
              type={showPassword ? "text" : "password"}
              value={isEditing ? formData.password : item.password}
              onChange={handleChange("password")}
              disabled={!isEditing}
              className="flex-1 bg-transparent border rounded p-2 text-foreground font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 hover:bg-muted rounded"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-6">
        {isEditing || isNew ? (
          <>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={isNew ? onCancel : handleCancel}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-muted text-muted-foreground rounded hover:bg-muted/90 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
};