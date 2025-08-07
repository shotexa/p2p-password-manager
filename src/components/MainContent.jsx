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

  // peer coreKey (hex) -> { core, bee }
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

      const processBee = async (bee, sourceName = "unknown") => {
        if (!bee) return;
        try {
          await bee.ready();
          let count = 0;
          for await (const { value } of bee.createReadStream()) {
            try {
              const entry = JSON.parse(value);
              const existing = allEntriesMap.get(entry.id);
              // If entry doesn't exist or the new one is more recent, add/update it.
              if (!existing || new Date(entry.updatedDate) > new Date(existing.updatedDate)) {
                allEntriesMap.set(entry.id, entry);
              }
              count++;
            } catch (e) {
              console.error("Failed to parse entry:", e);
            }
          }
          console.log(`Processed ${count} entries from ${sourceName}`);
        } catch (error) {
          console.error(`Error processing bee from ${sourceName}:`, error);
        }
      };

      // 1. Process our own entries
      await processBee(writableBeeRef.current, "local");

      // 2. Process all connected peer entries
      for (const [peerKey, { bee }] of peerStoresRef.current.entries()) {
        await processBee(bee, `peer ${peerKey.slice(0, 6)}...`);
      }

      // 3. Update the state with the combined list
      const combinedEntries = Array.from(allEntriesMap.values());
      console.log(`Total combined entries: ${combinedEntries.length}`);
      setEntries(combinedEntries);
    } catch (error) {
      console.error("Error updating entries from all sources:", error);
    }
  };

  const setupPeerCore = async (peerCore) => {
    try {
      if (!peerCore || !peerCore.key) {
        console.error("Invalid peer core provided");
        return;
      }

      const peerKeyHex = b4a.toString(peerCore.key, "hex");
      
      // Skip if already tracking this peer
      if (peerStoresRef.current.has(peerKeyHex)) {
        console.log(`Already tracking peer ${peerKeyHex.slice(0, 6)}...`);
        return;
      }

      // Skip if this is our own core
      if (writableCoreRef.current && b4a.equals(peerCore.key, writableCoreRef.current.key)) {
        console.log("Skipping our own core");
        return;
      }

      console.log("Setting up peer core:", peerKeyHex);

      await peerCore.ready();
      
      peerCore.download({ start: 0, end: -1 });
      
      const peerBee = new Hyperbee(peerCore, {
        keyEncoding: "utf-8",
        valueEncoding: "utf-8",
      });

      await peerBee.ready();

      peerStoresRef.current.set(peerKeyHex, { core: peerCore, bee: peerBee });

      // When the peer's core gets new data, update our entries
      peerCore.on("append", () => {
        console.log(`Peer ${peerKeyHex} appended data, updating.`);
        updateEntriesFromAllSources();
      });

      await updateEntriesFromAllSources();
    } catch (error) {
      console.error(`Error setting up peer core:`, error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const store = new Corestore(Pear.config.storage);
        storeRef.current = store;

        // Our own writable core and bee
        const core = store.get({ name: "passwords" });
        writableCoreRef.current = core;
        await core.ready();

        const bee = new Hyperbee(core, {
          keyEncoding: "utf-8",
          valueEncoding: "utf-8",
        });
        writableBeeRef.current = bee;
        await bee.ready();

        const myCoreKeyHex = b4a.toString(core.key, "hex");

        core.on("append", () => {
          console.log("Local data updated");
          updateEntriesFromAllSources();
        });

        // Listen for when new cores are added to the store
        // store.on("core-add", (core) => {
        //   console.log("Core added event:", core.key ? b4a.toString(core.key, "hex") : "unknown");
        //   if (core.key && !b4a.equals(core.key, writableCoreRef.current.key)) {
        //     setupPeerCore(core);
        //   }
        // });

        // // Listen for when cores are opened
        // store.on("core-open", (core) => {
        //   console.log("Core opened event:", core.key ? b4a.toString(core.key, "hex") : "unknown");
        //   if (core.key && !b4a.equals(core.key, writableCoreRef.current.key)) {
        //     setupPeerCore(core);
        //   }
        // });

        const swarm = new Hyperswarm();
        swarmRef.current = swarm;

        // Track active connections
        const activeConnections = new Map();

        swarm.on("connection", async (socket, peerInfo) => {
          const peerId = peerInfo.publicKey
          console.log("New peer connection from:", peerId);

          // Track this connection
          activeConnections.set(peerId, socket);

          // Handle disconnection
          socket.on("close", () => {
            console.log("Peer disconnected:", peerId.slice(0, 6) + "...");
            activeConnections.delete(peerId);
          });

          socket.on("error", (err) => {
            console.error("Socket error with peer", peerId.slice(0, 6) + "...:", err.message);
            activeConnections.delete(peerId);
          });

          try {
            // Replicate the store with this peer
            const stream = store.replicate(socket);
            
            stream.on("error", (err) => {
              console.error("Replication stream error:", err.message);
            });

            // Exchange core keys manually as a backup
            // Send our core key
            const announcement = Buffer.from(JSON.stringify({
              type: "core-key",
              key: myCoreKeyHex,
              name: "passwords"
            }) + "\n");
            
            socket.write(announcement);

            // Listen for peer's core key
            let buffer = "";
            const handleData = async (data) => {
              buffer += data.toString();
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  const msg = JSON.parse(line);
                  if (msg.type === "core-key" && msg.key && msg.name === "passwords") {
                    console.log("Received peer core key:", msg.key.slice(0, 6) + "...");
                    
                    if (msg.key !== myCoreKeyHex) {
                      // Get or create the peer's core in our store
                      const peerCoreKey = b4a.from(msg.key, "hex");
                      const peerCore = store.get({ key: peerCoreKey, valueEncoding: "binary" });
                      
                      // Set up the peer core
                      await setupPeerCore(peerCore);
                    }
                  }
                } catch (e) {
                  // Not JSON or not our message, ignore
                }
              }
            };

            socket.once("data", handleData); // changed on to once

          } catch (error) {
            console.error("Error setting up replication:", error);
          }
        });

        // Join the swarm on a topic derived from the seed
        const discovery = await swarm.join(keyPairSeed, { server: true, client: true });
        // await discovery.flushed();
        
        // console.log("Joined swarm with topic:", b4a.toString(keyPairSeed, "hex").slice(0, 12) + "...");
        // console.log("Active connections will appear above when peers connect");

        // Initial load of data
        await updateEntriesFromAllSources();
      } catch (error) {
        console.error("Error initializing:", error);
      }
    };

    init();

    return () => {
      // Cleanup on component unmount
      if (swarmRef.current) {
        swarmRef.current.destroy().catch(console.error);
      }
      if (storeRef.current) {
        storeRef.current.close().catch(console.error);
      }
    };
  }, []);

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
      await updateEntriesFromAllSources();
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
      const originalEntry = entries.find(e => e.id === id);
      if (!originalEntry) {
        console.error("Original entry not found");
        return;
      }

      const entryToUpdate = {
        ...originalEntry,
        ...updatedData,
        updatedDate: new Date().toISOString(),
      };

      await writableBeeRef.current.put(id, JSON.stringify(entryToUpdate));

      setSelectedEntry(null);

      await updateEntriesFromAllSources();
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
      console.log("Deleted entry:", id);
      setSelectedEntry(null);
      // Immediately update the UI
      await updateEntriesFromAllSources();
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