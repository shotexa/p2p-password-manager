import { EntriesList } from "@src/components/EntriesList";
import { DetailPanel } from "@src/components/DetailPanel";
import { useState, useEffect, useMemo, useRef } from "react";
import Corestore from "corestore";
import Hyperbee from "hyperbee";
import Hyperswarm from "hyperswarm";
import { v4 as uuidv4 } from "uuid";
import { useKeyPairSeed } from "@src/contexts/KeyPairContext";
import b4a from "b4a";

export const MainContent = ({ searchTerm }) => {
  const { keyPairSeed } = useKeyPairSeed();
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [entries, setEntries] = useState([]);

  const storeRef = useRef(null);
  const writableCoreRef = useRef(null);
  const writableBeeRef = useRef(null);
  const swarmRef = useRef(null);

  // peer publicKey (hex) -> { core, bee }
  const peerStoresRef = useRef(new Map());

  // Graceful shutdown
  Pear.teardown(async () => {
    if (swarmRef.current) await swarmRef.current.destroy();
    if (storeRef.current) await storeRef.current.close();
  });

  const updateEntriesFromAllSources = async () => {
    try {
      // Use a map to handle duplicates across cores, keeping the latest version.
      const allEntriesMap = new Map();

      const processBee = async (bee) => {
        if (!bee) return;
        await bee.ready();
        for await (const { value } of bee.createReadStream()) {
          try {
            const entry = JSON.parse(value);
            const existing = allEntriesMap.get(entry.id);
            // If entry doesn't exist or the new one is more recent, add/update it.
            if (
              !existing ||
              new Date(entry.updatedDate) > new Date(existing.updatedDate)
            ) {
              allEntriesMap.set(entry.id, entry);
            }
          } catch (e) {
            console.error("Failed to parse entry:", e, "Value:", value);
          }
        }
      };

      // 1. Process our own entries
      await processBee(writableBeeRef.current);

      // 2. Process all connected peer entries
      for (const { bee } of peerStoresRef.current.values()) {
        await processBee(bee);
      }

      // 3. Update the state with the combined list
      const combinedEntries = Array.from(allEntriesMap.values());
      setEntries(combinedEntries);
    } catch (error) {
      console.error("Error updating entries from all sources:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      const store = new Corestore(Pear.config.storage);
      storeRef.current = store;

      // Our own writable core and bee
      const core = store.get({ name: "passwords" });
      writableCoreRef.current = core;
      const bee = new Hyperbee(core, {
        keyEncoding: "utf-8",
        valueEncoding: "utf-8",
      });
      writableBeeRef.current = bee;
      await core.ready();

      // Update UI whenever our own data changes
      core.on("append", updateEntriesFromAllSources);

      // This event fires when any core is opened in the store,
      // including peer cores discovered through replication.
      store.on("core-open", (peerCore) => {
        // Ignore our own core
        if (b4a.equals(peerCore.key, core.key)) return;

        console.log(
          "Discovered a peer's core:",
          b4a.toString(peerCore.key, "hex")
        );

        const peerKeyHex = b4a.toString(peerCore.key, "hex");
        if (peerStoresRef.current.has(peerKeyHex)) return; // Already tracking

        const peerBee = new Hyperbee(peerCore, {
          keyEncoding: "utf-8",
          valueEncoding: "utf-8",
        });

        peerStoresRef.current.set(peerKeyHex, { core: peerCore, bee: peerBee });

        // When the peer's core gets new data, update our entries
        peerCore.on("append", () => {
          console.log(
            `Peer ${peerKeyHex.slice(0, 6)}... appended data, updating.`
          );
          updateEntriesFromAllSources();
        });

        // Also update when we first discover them
        updateEntriesFromAllSources();
      });

      const swarm = new Hyperswarm();
      swarmRef.current = swarm;

      swarm.on("connection", (socket) => {
        console.log("New peer connection.");
        // This single line handles all replication and key exchanges automatically.
        const stream = store.replicate(socket);

        stream.on("error", (error) => {
          console.error("Replication error:", error);
        });

        stream.on("close", () => {
          console.log("Replication closed.");
        });

        stream.on("end", () => {
          console.log("Replication ended.");
        });
      });

      // Join the swarm on a topic derived from the seed
      await swarm.join(keyPairSeed, { server: true, client: true });
      console.log(
        "Joined swarm with public key:",
        b4a.toString(swarm.keyPair.publicKey, "hex")
      );
      console.log("My core key is:", b4a.toString(core.key, "hex"));

      // Initial load of data
      await updateEntriesFromAllSources();
    };

    init();

    return () => {
      // Cleanup on component unmount
      if (swarmRef.current) swarmRef.current.destroy().catch(console.error);
      if (storeRef.current) storeRef.current.close().catch(console.error);
    };
  }, [keyPairSeed]); // Rerun if seed changes

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
    if (!writableBeeRef.current) {
      console.error("Store not initialized");
      return;
    }

    try {
      const id = uuidv4();
      const entryToSave = {
        id,
        ...newEntry,
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
      };

      await writableBeeRef.current.put(id, JSON.stringify(entryToSave));
      setIsCreatingNew(false);
    } catch (error) {
      console.error("Failed to save entry:", error);
    }
  };

  const handleCancel = () => {
    setIsCreatingNew(false);
  };

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
    if (!writableBeeRef.current) {
      console.error("Store not initialized");
      return;
    }

    try {
      const originalEntry = entries.find((e) => e.id === id);
      const entryToUpdate = {
        ...originalEntry,
        ...updatedData,
        updatedDate: new Date().toISOString(),
      };

      await writableBeeRef.current.put(id, JSON.stringify(entryToUpdate));
      setSelectedEntry(null);
    } catch (error) {
      console.error("Failed to update entry:", error);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!writableBeeRef.current) {
      console.error("Store not initialized");
      return;
    }

    try {
      await writableBeeRef.current.del(id);
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
