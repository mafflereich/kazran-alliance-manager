import React, { createContext, useContext, useState, useEffect } from 'react';
import { Database, Guild, Member, Costume, Role, User, Character } from './types';
import { db as firestore } from './firebase';
import { 
  collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, query, where, getDocs, writeBatch
} from 'firebase/firestore';

const defaultData: Database = {
  guilds: {},
  guildOrder: [],
  members: {},
  characters: {},
  costumes: {},
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

  // Member functions
  fetchMembers: (guildId: string) => void;
  fetchAllMembers: () => Promise<void>;
  addMember: (guildId: string, name: string, role?: Role, note?: string) => Promise<void>;
  updateMember: (memberId: string, data: Partial<Member>) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  updateMemberCostumeLevel: (memberId: string, costumeId: string, level: number) => Promise<void>;
  updateMemberExclusiveWeapon: (memberId: string, characterId: string, hasWeapon: boolean) => Promise<void>;

  // Guild functions
  addGuild: (name: string) => Promise<void>;
  updateGuild: (guildId: string, data: Partial<Guild>) => Promise<void>;
  deleteGuild: (guildId: string) => Promise<void>;

  // Character functions
  addCharacter: (name: string, order: number) => Promise<void>;
  updateCharacter: (characterId: string, data: Partial<Character>) => Promise<void>;
  deleteCharacter: (characterId: string) => Promise<void>;

  // Costume functions
  addCostume: (characterId: string, name: string, order: number) => Promise<void>;
  updateCostume: (costumeId: string, data: Partial<Costume>) => Promise<void>;
  deleteCostume: (costumeId: string) => Promise<void>;

  // User and settings functions
  updateUserPassword: (username: string, password: string) => Promise<void>;
  updateUserRole: (username: string, role: User['role']) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  deleteUser: (username: string) => Promise<void>;
  updateSettings: (data: Partial<Database['settings']>) => Promise<void>;

  // Data management
  restoreData: (data: Partial<Database>) => Promise<void>;
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
    characters: false,
    users: false
  });

  const isLoaded = loadedStates.global && loadedStates.guilds && loadedStates.costumes && loadedStates.users && loadedStates.characters;

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

    // Characters collection
    const unsubCharacters = onSnapshot(collection(firestore, 'characters'), (snap) => {
      const characters: Record<string, Character> = {};
      snap.forEach(doc => {
        characters[doc.id] = { ...doc.data() as Character, id: doc.id };
      });
      setDbState(prev => ({ ...prev, characters }));
      setLoadedStates(prev => ({ ...prev, characters: true }));
    }, (error) => {
      console.error("Error fetching characters:", error);
      if (error.code === 'permission-denied') setIsOffline(true);
      setLoadedStates(prev => ({ ...prev, characters: true }));
    });

    // Costumes collection
    const unsubCostumes = onSnapshot(collection(firestore, 'costumes'), (snap) => {
      const costumes: Record<string, Costume> = {};
      snap.forEach(doc => {
        costumes[doc.id] = { ...doc.data() as Costume, id: doc.id };
      });
      setDbState(prev => ({ ...prev, costumes }));
      setLoadedStates(prev => ({ ...prev, costumes: true }));
    }, (error) => {
      console.error("Error fetching costumes:", error);
      if (error.code === 'permission-denied') setIsOffline(true);
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
      unsubCharacters();
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
  // This function is now primarily for local state updates and might be simplified or removed.
  const setDb = (value: React.SetStateAction<Database>) => {
    setDbState(value);
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

  const updateMemberCostumeLevel = async (memberId: string, costumeId: string, level: number) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        members: {
          ...prev.members,
          [memberId]: {
            ...prev.members[memberId],
            records: {
              ...prev.members[memberId].records,
              [costumeId]: { level }
            },
            updatedAt: Date.now()
          }
        }
      }));
      return;
    }

    const memberRef = doc(firestore, 'members', memberId);
    await setDoc(memberRef, {
      records: {
        [costumeId]: { level }
      },
      updatedAt: Date.now()
    }, { merge: true });
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

  const updateMemberExclusiveWeapon = async (memberId: string, characterId: string, hasWeapon: boolean) => {
    if (isOffline) {
      setDbState(prev => ({
        ...prev,
        members: {
          ...prev.members,
          [memberId]: {
            ...prev.members[memberId],
            exclusiveWeapons: {
              ...prev.members[memberId].exclusiveWeapons,
              [characterId]: hasWeapon
            },
            updatedAt: Date.now()
          }
        }
      }));
      return;
    }
    const memberRef = doc(firestore, 'members', memberId);
    await setDoc(memberRef, {
      exclusiveWeapons: {
        [characterId]: hasWeapon
      },
      updatedAt: Date.now()
    }, { merge: true });
  };

  const addCharacter = async (name: string, order: number) => {
    await addDoc(collection(firestore, 'characters'), { name, order });
  };

  const updateCharacter = async (characterId: string, data: Partial<Character>) => {
    await updateDoc(doc(firestore, 'characters', characterId), data);
  };

  const deleteCharacter = async (characterId: string) => {
    // Note: This doesn't delete associated costumes. A more robust solution would handle this.
    await deleteDoc(doc(firestore, 'characters', characterId));
  };

  const addCostume = async (characterId: string, name: string, order: number) => {
    await addDoc(collection(firestore, 'costumes'), { characterId, name, order, new: false });
  };

  const updateCostume = async (costumeId: string, data: Partial<Costume>) => {
    await updateDoc(doc(firestore, 'costumes', costumeId), data);
  };

  const deleteCostume = async (costumeId: string) => {
    await deleteDoc(doc(firestore, 'costumes', costumeId));
  };










  const restoreData = async (data: Partial<Database>) => {
    if (isOffline) {
      setDbState(prev => ({ ...prev, ...data }));
      return;
    }

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
      if (data.guilds) {
        for (const g of Object.values(data.guilds)) {
          if (!g.id) continue;
          batch.set(doc(firestore, 'guilds', g.id), g, { merge: true });
          if (++count >= BATCH_SIZE) await commitBatch();
        }
      }
      if (data.members) {
        for (const m of Object.values(data.members)) {
          if (!m.id) continue;
          batch.set(doc(firestore, 'members', m.id), m, { merge: true });
          if (++count >= BATCH_SIZE) await commitBatch();
        }
      }
      if (data.characters) {
        for (const char of Object.values(data.characters)) {
          batch.set(doc(firestore, 'characters', char.id), char, { merge: true });
          if (++count >= BATCH_SIZE) await commitBatch();
        }
      }
      if (data.costumes) {
        for (const c of Object.values(data.costumes)) {
          batch.set(doc(firestore, 'costumes', c.id), c, { merge: true });
          if (++count >= BATCH_SIZE) await commitBatch();
        }
      }
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
      fetchMembers, fetchAllMembers, addMember, updateMember, deleteMember, updateMemberCostumeLevel, updateMemberExclusiveWeapon,
      addGuild, updateGuild, deleteGuild,
      addCharacter, updateCharacter, deleteCharacter,
      addCostume, updateCostume, deleteCostume,
      updateUserPassword, updateUserRole, addUser, deleteUser, updateSettings,
      restoreData
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
