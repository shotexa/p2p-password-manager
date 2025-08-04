import { EntriesList } from "@src/components/EntriesList";
import { DetailPanel } from "@src/components/DetailPanel";
import { useState, useEffect, useMemo, useRef } from "react";
import Corestore from "corestore";
import Hyperbee from "hyperbee";
import Hyperswarm from "hyperswarm";
import { v4 as uuidv4 } from "uuid";
import { useKeyPairSeed } from "@src/contexts/KeyPairContext";

export const MainContent = ({ searchTerm }) => {
  const { keyPairSeed } = useKeyPairSeed();
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [entries, setEntries] = useState([]);
  const storeRef = useRef(null);
  const beeRef = useRef(null);
  const swarmRef = useRef(null);

  Pear.teardown(async () => {
    await Promise.all([storeRef.current?.close(), swarmRef.current?.destroy()]);
  });

  useEffect(() => {
    const initStore = async () => {
      try {
        const newStore = new Corestore(Pear.config.storage, {
          primaryKey: keyPairSeed,
        });
        const newCore = newStore.get({ name: "passwords" }); // TODO: needs encryption

        const newBee = new Hyperbee(newCore, {
          keyEncoding: "utf-8",
          valueEncoding: "utf-8",
        });

        const swarm = new Hyperswarm();
        swarm.on("connection", (conn) => store.replicate(conn));

        await newCore.ready();

        const topic = newCore.discoveryKey;
        console.log("Joining swarm with topic:", newCore.discoveryKey);
        swarm.join(topic, { server: true, client: true });

        newCore.on("append", async () => {
          const updatedEntries = await findEntriesByTitle(newBee);
          setEntries(updatedEntries);
        });

        storeRef.current = newStore;
        beeRef.current = newBee;
        swarmRef.current = swarm;

        // Load initial entries
        const initialEntries = await findEntriesByTitle(newBee);
        setEntries(initialEntries);
      } catch (error) {
        console.error("Failed to initialize store:", error);
      }
    };

    initStore();

    return () => {
      if (storeRef.current) storeRef.current.close().catch(console.error);
      if (swarmRef.current) swarmRef.current.destroy().catch(console.error);
    };
  }, []);

  const findEntriesByTitle = async (beeInstance = beeRef.current) => {
    if (!beeInstance) return [];

    const entries = [];
    for await (const { key, value } of beeInstance.createReadStream()) {
      const entry = JSON.parse(value);
      entries.push({ id: key, ...entry });
    }
    return entries;
  };

  const handleEntrySelect = (entry) => {
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry(null);
    } else {
      setSelectedEntry(entry);
      setIsCreatingNew(false);
    }
  };

  const handleNewEntry = () => {
    setSelectedEntry(null);
    setIsCreatingNew(true);
  };

  const handleSaveNewEntry = async (newEntry) => {
    if (!beeRef.current) {
      console.error("Store not initialized");
      return;
    }

    try {
      const id = uuidv4();
      const entryToSave = {
        id: id,
        ...newEntry,
      };

      await beeRef.current.put(id, JSON.stringify(entryToSave));
      setIsCreatingNew(false);
    } catch (error) {
      console.error("Failed to save entry:", error);
      // You might want to show an error message to the user here
    }
  };

  const handleCancel = () => {
    setIsCreatingNew(false);
  };

  // Filter entries when search term changes
  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return entries;

    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(term) ||
        entry.username.toLowerCase().includes(term)
    );
  }, [searchTerm, entries]);

  const handleUpdateEntry = async (id, updatedData) => {
    if (!beeRef.current) {
      console.error("Store not initialized");
      return;
    }

    try {
      const entryToUpdate = {
        id,
        ...updatedData,
        updatedDate: new Date().toISOString(),
      };

      await beeRef.current.put(id, JSON.stringify(entryToUpdate));
      setSelectedEntry(null);
    } catch (error) {
      console.error("Failed to update entry:", error);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!beeRef.current) {
      console.error("Store not initialized");
      return;
    }

    try {
      await beeRef.current.del(id);
      setSelectedEntry(null);
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <EntriesList
        entriesArray={filteredEntries || []}
        selectedEntryId={selectedEntry?.id || null}
        onEntrySelect={handleEntrySelect}
        onNewEntry={handleNewEntry}
      />

      {selectedEntry && (
        <DetailPanel
          item={{
            title: selectedEntry.title,
            username: selectedEntry.username,
            password: selectedEntry.password,
          }}
          onSave={(updatedData) =>
            handleUpdateEntry(selectedEntry.id, updatedData)
          }
          onDelete={() => handleDeleteEntry(selectedEntry.id)}
        />
      )}

      {isCreatingNew && (
        <DetailPanel
          item={{
            title: "",
            username: "",
            password: "",
          }}
          isNew={true}
          onSave={handleSaveNewEntry}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};
