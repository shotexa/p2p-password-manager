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

  // peer publicKey -> { core, bee }
  const peerStoresRef = useRef(new Map());

  Pear.teardown(async () => {
    for (const { core } of peerStoresRef.current.values()) {
      await core.close().catch(console.error);
    }
    await Promise.all([storeRef.current?.close(), swarmRef.current?.destroy()]);
  });

  const handlePeerKeyExchange = async (socket, peerInfo) => {
    try {
      const ourPubKey = writableCoreRef.current.key;
      socket.write(ourPubKey);

      const peerPubKey = await new Promise((resolve) => {
        socket.once("data", (data) => resolve(data));
      });

      const peerCore = await storeRef.current.get({
        key: peerPubKey,
      });

      const peerBee = new Hyperbee(peerCore, {
        keyEncoding: "utf-8",
        valueEncoding: "utf-8",
      });

      peerStoresRef.current.set(b4a.toString(peerPubKey, "hex"), {
        core: peerCore,
        bee: peerBee,
      });

      peerCore.replicate(socket);
      writableCoreRef.current.replicate(socket);

      peerCore.on("append", async () => {
        console.log("received new data from the peer");
      });

      for await (const data of peerCore.createReadStream()) {
        console.log("peer Data:", b4a.toString(data, "utf8"));
      }
    } catch (error) {
      console.error("Error in peer key exchange:", error);
    }
  };

  useEffect(() => {
    const initStore = async () => {
      try {
        const newStore = new Corestore(Pear.config.storage);

        const writableCore = newStore.get({ name: "passwords" });
        const writableBee = new Hyperbee(writableCore, {
          keyEncoding: "utf-8",
          valueEncoding: "utf-8",
        });

        const swarm = new Hyperswarm();

        swarm.on("connection", async (socket, peerInfo) => {
          await handlePeerKeyExchange(socket, peerInfo);
        });

        await writableCore.ready();

        swarm.join(keyPairSeed, { server: true, client: true });

        writableCore.on("append", async () => {
          console.log("Adding data to my own store")
          await updateEntriesFromAllSources();
        });

        storeRef.current = newStore;
        writableCoreRef.current = writableCore;
        writableBeeRef.current = writableBee;
        swarmRef.current = swarm;

        await updateEntriesFromAllSources();
      } catch (error) {
        console.error("Failed to initialize store:", error);
      }
    };

    initStore();

    return () => {
      for (const { core } of peerStoresRef.current.values()) {
        core.close().catch(console.error);
      }
      if (storeRef.current) storeRef.current.close().catch(console.error);
      if (swarmRef.current) swarmRef.current.destroy().catch(console.error);
    };
  }, []);

  const findEntriesByTitle = async (beeInstance) => {
    if (!beeInstance) return [];

    const entries = [];
    for await (const { key, value } of beeInstance.createReadStream()) {
      try {
        const entry = JSON.parse(value);
        entries.push({ id: key, ...entry });
      } catch (error) {
        console.error("Error parsing entry:", error);
      }
    }
    return entries;
  };

  const updateEntriesFromAllSources = async () => {
    try {
      const ourEntries = await findEntriesByTitle(writableBeeRef.current);
      setEntries(ourEntries);
    } catch (error) {
      console.error("Error updating entries:", error);
    }
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
      const entryToUpdate = {
        id,
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
