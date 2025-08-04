import { Header } from "@src/components/Header";
import { useState } from "react";
import { MainContent } from "@src/components/MainContent";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <Header onSearch={handleSearch} />
      <div className="flex flex-1 overflow-hidden">
        <MainContent searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default Index;
