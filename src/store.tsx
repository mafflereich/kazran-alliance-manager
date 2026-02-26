import React, { createContext, useContext, useState, useEffect } from 'react';
import { Database, Guild, Member, Costume, Role, User } from './types';
import { db as firestore } from './firebase';
import { 
  collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, query, where, getDocs, writeBatch
} from 'firebase/firestore';

const defaultData: Database = {
  guilds: {},
  guildOrder: [],
  members: {},
  costume_definitions: [
    { id: "costume_001", name: "優斯緹亞 (劍道社)", character: "Justia" },
    { id: "costume_002", name: "莎赫拉查德 (代號S)", character: "Schera" }
  ],
  users: {
    "creator": { username: "creator", password: "123", role: "creator" },
    "admin": { username: "admin", password: "123", role: "admin" },
    "manager": { username: "manager", password: "123", role: "manager" }
  },
  settings: {
    sitePassword: "abc",
    redirectUrl: "https://www.browndust2.com/"
  }
};

type ViewState = { type: 'admin' } | { type: 'guild', guildId: string } | null;

interface AppContextType {
  db: Database;
  setDb: React.Dispatch<React.SetStateAction<Database>>;
  currentView: ViewState;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  currentUser: string | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<string | null>>;
  
  // New functions
  fetchMembers: (guildId: string) => void;
  fetchAllMembers: () => Promise<void>;
  addMember: (guildId: string, name: string, role?: Role, note?: string) => Promise<void>;
  updateMemberCostume: (memberId: string, costumeId: string, level: number, weapon: boolean) => Promise<void>;
  updateMember: (memberId: string, data: Partial<Member>) => Promise<void>;
  addGuild: (name: string) => Promise<void>;
  updateGuild: (guildId: string, data: Partial<Guild>) => Promise<void>;
  deleteGuild: (guildId: string) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  
  // Costume & User functions
  addCostume: (character: string, name: string, imageName?: string) => Promise<void>;
  updateCostume: (id: string, data: Partial<Costume>) => Promise<void>;
  deleteCostume: (id: string) => Promise<void>;
  swapCostumeOrder: (id1: string, id2: string) => Promise<void>;
  resetCostumeOrders: () => Promise<void>;
  restoreData: (guilds: Guild[], members: Member[], costumes: Costume[]) => Promise<void>;
  updateUserPassword: (username: string, password: string) => Promise<void>;
  updateUserRole: (username: string, role: User['role']) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  deleteUser: (username: string) => Promise<void>;
  updateSettings: (data: Partial<Database['settings']>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDbState] = useState<Database>(defaultData);
  const [currentView, setCurrentView] = useState<ViewState>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loadedStates, setLoadedStates] = useState({
    global: false,
    guilds: false,
    costumes: false,
    users: false
  });

  const isLoaded = loadedStates.global && loadedStates.guilds && loadedStates.costumes && loadedStates.users;

  const [isOffline, setIsOffline] = useState(false);

  // Subscribe to global data (costumes, users) and guilds
  useEffect(() => {
    // Global data (legacy fallback or other settings)
    const unsubGlobal = onSnapshot(doc(firestore, 'appData', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDbState(prev => ({ 
          ...prev, 
          guildOrder: data.guildOrder || defaultData.guildOrder,
          settings: data.settings || defaultData.settings
        }));
      } else {
        setDoc(doc(firestore, 'appData', 'main'), defaultData).catch(console.error);
      }
      setLoadedStates(prev => ({ ...prev, global: true }));
    }, (error) => {
      console.error("Error fetching global data:", error);
      if (error.code === 'permission-denied') {
        setIsOffline(true);
      }
      setLoadedStates(prev => ({ ...prev, global: true }));
    });

    // Guilds collection
    const unsubGuilds = onSnapshot(collection(firestore, 'guilds'), (snap) => {
      const guilds: Record<string, Guild> = {};
      snap.forEach(doc => {
        guilds[doc.id] = { ...doc.data() as Guild, id: doc.id };
      });
      setDbState(prev => ({ ...prev, guilds }));
      setLoadedStates(prev => ({ ...prev, guilds: true }));
    }, (error) => {
      console.error("Error fetching guilds:", error);
      if (error.code === 'permission-denied') {
        setIsOffline(true);
      }
      setLoadedStates(prev => ({ ...prev, guilds: true }));
    });

    // Costumes collection
    const unsubCostumes = onSnapshot(collection(firestore, 'costumes'), (snap) => {
      if (snap.empty && !isOffline) {
        // Seed default costumes if empty
        defaultData.costume_definitions.forEach((costume, index) => {
          setDoc(doc(firestore, 'costumes', costume.id), { ...costume, order: index }).catch(console.error);
        });
        setLoadedStates(prev => ({ ...prev, costumes: true }));
        return;
      }

      const costumes: Costume[] = [];
      snap.forEach(doc => {
        costumes.push({ ...doc.data() as Costume, id: doc.id });
      });
      // Sort by order first, then character then name
      costumes.sort((a, b) => {
        const orderA = a.order ?? 9999;
        const orderB = b.order ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.character.localeCompare(b.character) || a.name.localeCompare(b.name);
      });
      
      setDbState(prev => ({ ...prev, costume_definitions: costumes }));
      setLoadedStates(prev => ({ ...prev, costumes: true }));
    }, (error) => {
      console.error("Error fetching costumes:", error);
      if (error.code === 'permission-denied') {
        setIsOffline(true);
      }
      setLoadedStates(prev => ({ ...prev, costumes: true }));
    });

    // Users collection
    const unsubUsers = onSnapshot(collection(firestore, 'users'), (snap) => {
      const users: Record<string, any> = {};
      snap.forEach(doc => {
        users[doc.id] = { ...doc.data(), username: doc.id };
      });

      if (!isOffline) {
        // Ensure default users exist (especially the new 'creator' role)
        let needsSeeding = false;
        Object.entries(defaultData.users).forEach(([username, user]) => {
          if (!users[username]) {
            setDoc(doc(firestore, 'users', username), user).catch(console.error);
            needsSeeding = true;
          }
        });
        if (needsSeeding) return; // Wait for next snapshot
      }

      setDbState(prev => ({ ...prev, users }));
      setLoadedStates(prev => ({ ...prev, users: true }));
    }, (error) => {
      console.error("Error fetching users:", error);
      if (error.code === 'permission-denied') {
        setIsOffline(true);
      }
      setLoadedStates(prev => ({ ...prev, users: true }));
    });

    return () => {
      unsubGlobal();
      unsubGuilds();
      unsubCostumes();
      unsubUsers();
    };
  }, []);

  // Keep track of member subscription
  const [memberUnsub, setMemberUnsub] = useState<(() => void) | null>(null);

  // Function to fetch members for a specific guild
  const fetchMembers = (guildId: string) => {
    if (memberUnsub) {
      memberUnsub();
    }
    
    if (isOffline) {
      // In offline mode, members are already in db.members from defaultData or local updates
      // But we need to filter them if we want to simulate the query?
      // Actually, defaultData has all members in one object.
      // But wait, defaultData.members is structured as Record<string, Member>.
      // If we are offline, we just rely on local state.
      return;
    }

    const q = query(collection(firestore, 'members'), where('guildId', '==', guildId));
    const unsub = onSnapshot(q, (snap) => {
      const members: Record<string, Member> = {};
      snap.forEach(doc => {
        const data = doc.data();
        members[doc.id] = {
          id: doc.id,
          name: data.name,
          role: data.role,
          note: data.note,
          guildId: data.guildId,
          records: data.records, // Temporarily keep records to avoid breaking changes
          updatedAt: data.updatedAt,
        } as Member;
      });
      setDbState(prev => ({ ...prev, members }));
    }, (error) => {
      console.error("Error fetching members:", error);
      if (error.code === 'permission-denied') {
        setIsOffline(true);
        alert("讀取成員列表失敗：權限不足。將切換至離線模式。");
      }
    });
    
    setMemberUnsub(() => unsub);
  };

  const fetchAllMembers = async () => {
    if (isOffline) return;

    const querySnapshot = await getDocs(collection(firestore, 'members'));
    const allMembers: Record<string, Member> = {};
    querySnapshot.forEach((doc) => {
      allMembers[doc.id] = { ...doc.data() as Member, id: doc.id };
    });
    setDbState(prev => ({ ...prev, members: allMembers }));
  };

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (memberUnsub) memberUnsub();
    };
  }, [memberUnsub]);

  // Auto-fetch when entering guild view
  useEffect(() => {
    if (currentView?.type === 'guild' && currentView.guildId) {
      fetchMembers(currentView.guildId);
    } else if (currentView?.type === 'admin') {
      // In admin view, we might not want to clear immediately if we are going to select a guild
      // But for now, let's clear to be safe, or let GuildMembersManager fetch
      setDbState(prev => ({ ...prev, members: {} }));
      if (memberUnsub) {
        memberUnsub();
        setMemberUnsub(null);
      }
    }
  }, [currentView?.type, (currentView as any)?.guildId]);

  // Helper to update local state (deprecated, but kept for compatibility)
  const setDb = (value: React.SetStateAction<Database>) => {
    setDbState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      // Only sync global data to 'appData/main'
      const globalData = {
        costume_definitions: next.costume_definitions,
        users: next.users,
        guildOrder: next.guildOrder,
        settings: next.settings
      };
      setDoc(doc(firestore, 'appData', 'main'), globalData, { merge: true }).catch(console.error);
      return next;
    });
  };

  const addMember = async (guildId: string, name: string, role: Role = '成員', note: string = '') => {
    const newMember: Member = {
      name,
      guildId,
      role,
      note,
      records: {},
      updatedAt: Date.now()
    };
    
    if (isOffline) {
      const newId = `local_u${Date.now()}`;
      setDbState(prev => ({
        ...prev,
        members: { ...prev.members, [newId]: { ...newMember, id: newId } }
      }));
      return;
    }

    await addDoc(collection(firestore, 'members'), newMember);
  };

  const updateMemberCostume = async (memberId: string, costumeId: string, level: number, weapon: boolean) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        members: {
          ...prev.members,
          [memberId]: {
            ...prev.members[memberId],
            records: {
              ...prev.members[memberId].records,
              [costumeId]: { level, weapon }
            },
            updatedAt: Date.now()
          }
        }
      }));
      return;
    }

    const memberRef = doc(firestore, 'members', memberId);
    await updateDoc(memberRef, {
      [`records.${costumeId}`]: { level, weapon },
      updatedAt: Date.now()
    });
  };

  const updateMember = async (memberId: string, data: Partial<Member>) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        members: {
          ...prev.members,
          [memberId]: { ...prev.members[memberId], ...data, updatedAt: Date.now() }
        }
      }));
      return;
    }

    await updateDoc(doc(firestore, 'members', memberId), {
      ...data,
      updatedAt: Date.now()
    });
  };

  const addGuild = async (name: string) => {
    if (isOffline) {
      const newId = `local_g${Date.now()}`;
      setDbState(prev => ({
        ...prev,
        guilds: { ...prev.guilds, [newId]: { name, tier: 1, order: 99, id: newId } }
      }));
      return;
    }
    await addDoc(collection(firestore, 'guilds'), { name, tier: 1, order: 99 });
  };

  const updateGuild = async (guildId: string, data: Partial<Guild>) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        guilds: {
          ...prev.guilds,
          [guildId]: { ...prev.guilds[guildId], ...data }
        }
      }));
      return;
    }
    await updateDoc(doc(firestore, 'guilds', guildId), data);
  };

  const deleteGuild = async (guildId: string) => {
    if (isOffline) {
      setDbState(prev => {
        const { [guildId]: _, ...rest } = prev.guilds;
        return { ...prev, guilds: rest };
      });
      return;
    }
    await deleteDoc(doc(firestore, 'guilds', guildId));
    // Optionally delete members? For now, keep them or let them be orphaned.
  };

  const deleteMember = async (memberId: string) => {
    if (isOffline) {
      setDbState(prev => {
        const { [memberId]: _, ...rest } = prev.members;
        return { ...prev, members: rest };
      });
      return;
    }
    await deleteDoc(doc(firestore, 'members', memberId));
  };

  const addCostume = async (character: string, name: string, imageName: string = '', manualOrder?: number) => {
    // Determine new order
    let newOrder = manualOrder;
    if (newOrder === undefined) {
      const maxOrder = db.costume_definitions.reduce((max, c) => Math.max(max, c.order ?? 0), 0);
      newOrder = maxOrder + 1;
    }

    if (isOffline) {
      const newId = `local_costume_${Date.now()}`;
      setDbState(prev => ({
        ...prev,
        costume_definitions: [
          ...prev.costume_definitions,
          { id: newId, character, name, imageName, order: newOrder }
        ]
      }));
      return;
    }
    await addDoc(collection(firestore, 'costumes'), { character, name, imageName, order: newOrder });
  };

  const resetCostumeOrders = async () => {
    const costumes = [...db.costume_definitions];
    // Sort by current display order (which handles collisions by name)
    costumes.sort((a, b) => {
      const orderA = a.order ?? 9999;
      const orderB = b.order ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.character.localeCompare(b.character) || a.name.localeCompare(b.name);
    });

    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        costume_definitions: costumes.map((c, idx) => ({ ...c, order: idx + 1 }))
      }));
      return;
    }

    // Batch update for Firestore
    // Note: Firestore batch limit is 500. If more, need to chunk.
    // Assuming < 500 for now.
    const batch = writeBatch(firestore);
    costumes.forEach((c, idx) => {
      const ref = doc(firestore, 'costumes', c.id);
      batch.update(ref, { order: idx + 1 });
    });
    await batch.commit();
  };

  const updateCostume = async (id: string, data: Partial<Costume>) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        costume_definitions: prev.costume_definitions.map(c => c.id === id ? { ...c, ...data } : c)
      }));
      return;
    }
    await updateDoc(doc(firestore, 'costumes', id), data);
  };

  const deleteCostume = async (id: string) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        costume_definitions: prev.costume_definitions.filter(c => c.id !== id)
      }));
      return;
    }
    await deleteDoc(doc(firestore, 'costumes', id));
  };

  const swapCostumeOrder = async (id1: string, id2: string) => {
    const costume1 = db.costume_definitions.find(c => c.id === id1);
    const costume2 = db.costume_definitions.find(c => c.id === id2);
    
    if (!costume1 || !costume2) return;

    // If orders are missing, assign defaults based on current index
    let order1 = costume1.order;
    let order2 = costume2.order;

    if (order1 === undefined || order2 === undefined) {
      // Fallback: update all costumes with index-based order to ensure consistency
      // This is a heavy operation but necessary if data is legacy
      const updates = db.costume_definitions.map((c, idx) => ({ id: c.id, order: idx }));
      
      if (isOffline) {
        setDbState(prev => ({
          ...prev,
          costume_definitions: prev.costume_definitions.map((c, idx) => {
             // Swap logic here if we are re-indexing anyway? 
             // No, just re-index first, then swap.
             // But simpler: just swap the indices of the two target items in the new array.
             if (c.id === id1) return { ...c, order: db.costume_definitions.findIndex(x => x.id === id2) };
             if (c.id === id2) return { ...c, order: db.costume_definitions.findIndex(x => x.id === id1) };
             return { ...c, order: idx };
          })
        }));
        return;
      }

      // Online: update all. 
      // To avoid too many writes, maybe just update these two if possible?
      // If order is undefined, we assume 9999. 
      // Let's just assign them the index values of where they currently are.
      const idx1 = db.costume_definitions.findIndex(c => c.id === id1);
      const idx2 = db.costume_definitions.findIndex(c => c.id === id2);
      order1 = idx1;
      order2 = idx2;
      
      // We need to update DB for these two with new orders
      await updateDoc(doc(firestore, 'costumes', id1), { order: order2 });
      await updateDoc(doc(firestore, 'costumes', id2), { order: order1 });
      return;
    }

    // Normal swap
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        costume_definitions: prev.costume_definitions.map(c => {
          if (c.id === id1) return { ...c, order: order2 };
          if (c.id === id2) return { ...c, order: order1 };
          return c;
        })
      }));
      return;
    }

    await updateDoc(doc(firestore, 'costumes', id1), { order: order2 });
    await updateDoc(doc(firestore, 'costumes', id2), { order: order1 });
  };

  const restoreData = async (guilds: Guild[], members: Member[], costumes: Costume[]) => {
    if (isOffline) {
      // Offline mode: update local state directly
      setDbState(prev => {
        const newGuilds = { ...prev.guilds };
        guilds.forEach(g => { if (g.id) newGuilds[g.id] = g; });

        const newMembers = { ...prev.members };
        members.forEach(m => { if (m.id) newMembers[m.id] = m; });

        // Merge costumes by ID
        const newCostumes = [...prev.costume_definitions];
        costumes.forEach(c => {
          const idx = newCostumes.findIndex(existing => existing.id === c.id);
          if (idx >= 0) {
            newCostumes[idx] = c;
          } else {
            newCostumes.push(c);
          }
        });

        return {
          ...prev,
          guilds: newGuilds,
          members: newMembers,
          costume_definitions: newCostumes
        };
      });
      return;
    }

    // Firestore batch updates
    // We use a helper to process in chunks of 450 to stay under the 500 limit
    const BATCH_SIZE = 450;
    let batch = writeBatch(firestore);
    let count = 0;

    const commitBatch = async () => {
      if (count > 0) {
        await batch.commit();
        batch = writeBatch(firestore);
        count = 0;
      }
    };

    try {
      for (const g of guilds) {
        if (!g.id) continue;
        const ref = doc(firestore, 'guilds', g.id);
        batch.set(ref, g, { merge: true });
        count++;
        if (count >= BATCH_SIZE) await commitBatch();
      }

      for (const m of members) {
        if (!m.id) continue;
        const ref = doc(firestore, 'members', m.id);
        batch.set(ref, m, { merge: true });
        count++;
        if (count >= BATCH_SIZE) await commitBatch();
      }

      for (const c of costumes) {
        const ref = doc(firestore, 'costumes', c.id);
        batch.set(ref, c, { merge: true });
        count++;
        if (count >= BATCH_SIZE) await commitBatch();
      }

      // Commit any remaining operations
      await commitBatch();
    } catch (error) {
      console.error("Error restoring data:", error);
      throw error;
    }
  };

  const updateUserPassword = async (username: string, password: string) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        users: {
          ...prev.users,
          [username]: { ...prev.users[username], password }
        }
      }));
      return;
    }
    // Assuming 'username' is the document ID for users collection
    await updateDoc(doc(firestore, 'users', username), { password });
  };

  const updateUserRole = async (username: string, role: User['role']) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        users: {
          ...prev.users,
          [username]: { ...prev.users[username], role }
        }
      }));
      return;
    }
    await updateDoc(doc(firestore, 'users', username), { role });
  };

  const addUser = async (user: User) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        users: { ...prev.users, [user.username]: user }
      }));
      return;
    }
    await setDoc(doc(firestore, 'users', user.username), user);
  };

  const deleteUser = async (username: string) => {
    if (isOffline) {
      setDbState(prev => {
        const { [username]: _, ...rest } = prev.users;
        return { ...prev, users: rest };
      });
      return;
    }
    await deleteDoc(doc(firestore, 'users', username));
  };

  const updateSettings = async (data: Partial<Database['settings']>) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        settings: { ...prev.settings, ...data }
      }));
      return;
    }
    await updateDoc(doc(firestore, 'appData', 'main'), {
      settings: { ...db.settings, ...data }
    });
  };

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100 text-stone-500">載入中...</div>;
  }

  return (
    <AppContext.Provider value={{ 
      db, setDb, currentView, setCurrentView, currentUser, setCurrentUser,
      fetchMembers, fetchAllMembers, addMember, updateMemberCostume, updateMember, addGuild, updateGuild, deleteGuild, deleteMember,
      addCostume, updateCostume, deleteCostume, swapCostumeOrder, resetCostumeOrders, restoreData, updateUserPassword, updateUserRole, addUser, deleteUser, updateSettings
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
