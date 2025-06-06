import { Stack } from "expo-router";
// Add polyfills for React Native
import "react-native-get-random-values";
import { Buffer } from "buffer";

// Define types for our data structures
interface FlagItem {
  id: string;
  [key: string]: any;
}

interface ProfileData {
  flag: FlagItem[];
  dealbreaker: FlagItem[];
}

export interface DealbreakerState {
  main: ProfileData;
  [profileId: string]: ProfileData;
}

interface Profile {
  id: string;
  name: string;
}

// Make Buffer available globally
(global as any).Buffer = Buffer;

import * as SecureStore from "expo-secure-store";
import {
  NavigationContainer,
  NavigationContainerRef,
  ParamListBase,
} from "@react-navigation/native";
import { useState, useRef, useEffect } from "react";
import StoreContext from "../store";
import Toast from "react-native-toast-message";
import { FlagProvider } from "../context/FlagContext";
import { AuthProvider } from "../context/Auth";
import {
  setList,
  getList,
  setAtomicValue,
  getAtomicValue,
  clearStorage,
  syncPendingChanges,
  showToast,
  fetchAllUserData,
  getSecureItem,
} from "../utils";
import { addDealbreakers, getDealbreakers } from "../utils/mongodbapi";
import NetInfo from "@react-native-community/netinfo";

// Add navigation ref to make it globally accessible
import { navigationRef } from "../utils/navigationRef";

// COMPLETELY DISABLE ALL CONSOLE OUTPUT TO PREVENT TERMINAL CLUTTER
// Save original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Make original console available globally
(global as any).originalConsole = originalConsole;

// Replace all console methods with empty functions
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.debug = () => {};
// Keep error for critical issues
console.error = (...args: any[]) => {
  if (args[0] && typeof args[0] === "string" && args[0].includes("CRITICAL:")) {
    originalConsole.error(...args);
  }
};

// Function to temporarily restore console for debugging if needed
(global as any).enableConsole = () => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
  console.log("Console output has been restored");
};

// Function to disable console again
(global as any).disableConsole = () => {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
  console.error = (...args: any[]) => {
    if (
      args[0] &&
      typeof args[0] === "string" &&
      args[0].includes("CRITICAL:")
    ) {
      originalConsole.error(...args);
    }
  };
};

// TEMPORARILY RESTORE CONSOLE OUTPUT FOR TESTING
(global as any).enableConsole();

// Keep console enabled - remove disabling code
// Don't disable console after enabling it

// Set to false to disable debug logs and reduce terminal clutter
const DEBUG_LOGGING = false;

// Helper to prevent excessive logging
const debugLog = (...args: any[]) => {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
};

// Disable noisy logs in production
if (!__DEV__) {
  // Override default console methods to reduce output in production
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;

  // Preserve error and warn for debugging
  console.log = (...args: any[]) => {
    if (DEBUG_LOGGING) {
      originalConsoleLog(...args);
    }
  };

  console.info = (...args: any[]) => {
    if (DEBUG_LOGGING) {
      originalConsoleInfo(...args);
    }
  };
}

// Update component props types
interface ComponentProps {
  [key: string]: any;
}

const Lists = (props: { navigation?: any; route?: any }) => null;
const CreateFlags = (props: { navigation?: any; route?: any }) => null;
const CreateProfiles = (props: { navigation?: any; route?: any }) => null;

// Fix component props type
interface ProfileComponentProps {
  navigation?: any;
  route?: any;
  onLogout?: () => void;
}

const Profile = (props: ProfileComponentProps) => null;

type RootParamList = ParamListBase;

const Layout = () => {
  const [dealbreaker, setDealbreaker] = useState<DealbreakerState>({
    main: {
      flag: [],
      dealbreaker: [],
    },
  });

  const [profiles, setProfiles] = useState<Profile[]>([
    { id: "main", name: "Main Profile" },
  ]);
  const [currentProfileId, setCurrentProfileId] = useState("main");
  const [isLoaded, setIsLoaded] = useState(false);
  const isProfileMountRef = useRef(false);
  const isCurrentProfileMountRef = useRef(false);
  const isDealbreakerMountRef = useRef(false);
  const isDealbreakerTimeoutRef = useRef<
    boolean | ReturnType<typeof setTimeout>
  >(false);
  const [isOnline, setIsOnline] = useState(true);
  const syncInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkIsLoggedIn = async () => {
    const token = await getAtomicValue("authToken");
    console.warn("token: ", token);
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  };
  const updateDealbreakers = async () => {
    const userData = await SecureStore.getItem("userData");
    if (userData) {
      if (isDealbreakerTimeoutRef.current) {
        clearTimeout(
          isDealbreakerTimeoutRef.current as ReturnType<typeof setTimeout>
        );
      }
      isDealbreakerTimeoutRef.current = setTimeout(async () => {
        isDealbreakerTimeoutRef.current = false;
        const userDataObject = JSON.parse(userData);
        const userId = userDataObject.id;
        await addDealbreakers(dealbreaker, userId);
      }, 1000);
    }
  };

  useEffect(() => {
    updateDealbreakers();
  }, [dealbreaker]);

  useEffect(() => {
    checkIsLoggedIn();
  }, []);

  // For auth demo - simplified approach
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load all data at app initialization
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoaded(false);

      try {
        // Enable offline mode by default
        await setAtomicValue("offlineMode", "true");

        // Force sync with MongoDB first to ensure latest data
        debugLog("Forcing initial sync with MongoDB...");
        try {
          await syncOfflineData(true); // Pass true to indicate it's a force sync
          debugLog("Initial MongoDB sync complete");
        } catch (syncError) {
          debugLog("Error during initial MongoDB sync:", syncError);
        }

        // Load dealbreaker data
        const savedDealbreaker = await getList("dealbreaker");
        if (savedDealbreaker && Object.keys(savedDealbreaker).length > 0) {
          debugLog("Loaded dealbreaker state from storage:", savedDealbreaker);

          setDealbreaker(savedDealbreaker);

          // After loading data, synchronize flags across all profiles
          setTimeout(() => {
            synchronizeProfileFlags();
          }, 1000);
        }

        // Load profiles
        const savedProfiles = await getList("profiles");
        if (savedProfiles && savedProfiles.length > 0) {
          debugLog("Loaded profiles from storage:", savedProfiles);

          // Check if profiles are missing from the profiles list
          if (savedDealbreaker) {
            const dealbreakerProfileIds = Object.keys(savedDealbreaker);

            // Filter out profile IDs that aren't in the profiles list
            const missingProfileIds = dealbreakerProfileIds.filter(
              (id) =>
                !savedProfiles.some((profile: Profile) => profile.id === id)
            );

            if (missingProfileIds.length > 0) {
              debugLog("Found missing profiles:", missingProfileIds);

              // Create new profiles array with the missing profiles
              const updatedProfiles = [...savedProfiles];

              // Add the missing profiles
              missingProfileIds.forEach((id) => {
                // For missing IDs, create a profile with a friendly name
                const friendlyName =
                  id === "Jenny"
                    ? "Jenny"
                    : id.startsWith("profile_")
                    ? `Profile ${updatedProfiles.length + 1}`
                    : id;

                updatedProfiles.push({
                  id,
                  name: friendlyName,
                });
              });

              debugLog("Regenerated profiles list:", updatedProfiles);
              setProfiles(updatedProfiles);

              // Also save the updated profiles list back to storage
              await setList("profiles", updatedProfiles);
            } else {
              setProfiles(savedProfiles);
            }
          } else {
            setProfiles(savedProfiles);
          }
        }

        // Load current profile ID
        const savedCurrentProfileId = await getAtomicValue("currentProfileId");
        if (savedCurrentProfileId) {
          debugLog(
            "Loaded current profile ID from storage:",
            savedCurrentProfileId
          );

          // If current profile is not 'main', ensure the main profile exists
          if (savedCurrentProfileId !== "main") {
            ensureProfileExists("main");
          }

          // Force use main profile on startup to ensure we see flags
          debugLog("Forcing switch to main profile on startup");
          setCurrentProfileId("main");
          await setAtomicValue("currentProfileId", "main");
        }

        setIsLoaded(true);
      } catch (error) {
        debugLog("Error loading data:", error);
        setIsLoaded(true); // Set to true even on error to allow app to function
      }
    };

    loadAllData();

    // Initial sync
    syncOfflineData();

    // Check network status and only sync periodically if online
    const networkCheck = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected === true);
      if (state.isConnected && !state.isInternetReachable) {
        // If we have a network connection but can't reach the internet, enable offline mode
        setAtomicValue("offlineMode", "true");
      }
    });

    // Set up less frequent sync interval (every 5 minutes instead of every minute)
    syncInterval.current = setInterval(syncOfflineData, 300000);

    return () => {
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
      }
      networkCheck?.(); // Clean up the network listener
    };
  }, []);

  // Save profiles when they change
  useEffect(() => {
    if (isProfileMountRef.current) {
      setList("profiles", profiles);
      debugLog("Saved profiles to storage:", profiles);
    } else {
      isProfileMountRef.current = true;
    }
  }, [profiles]);

  // Save current profile ID when it changes
  useEffect(() => {
    if (isCurrentProfileMountRef.current) {
      setAtomicValue("currentProfileId", currentProfileId);
      debugLog("Saved current profile ID to storage:", currentProfileId);
    } else {
      isCurrentProfileMountRef.current = true;
    }
  }, [currentProfileId]);

  // Function to sync offline data with the server
  const syncOfflineData = async (forceSync = false) => {
    try {
      // First handle pending changes to MongoDB
      const pendingChanges = await getList("pendingChanges");
      if (pendingChanges && pendingChanges.length > 0) {
        const result = await syncPendingChanges();

        if (result.success) {
          // Only clear pending changes if sync was truly successful (not offline)
          if (!result.offline) {
            await setList("pendingChanges", []);

            // Only show toast if this was a user-initiated sync (forceSync)
            if (forceSync) {
              showToast(
                "success",
                "Sync Complete",
                "Your changes have been synced with the server."
              );
            }
          }
        } else if (forceSync) {
          // Only show errors for user-initiated syncs
          showToast(
            "error",
            "Sync Failed",
            result.message || "Failed to sync changes with the server."
          );
        }
      }

      // If forcing sync, then also pull data from MongoDB
      if (forceSync) {
        debugLog("Forcing fetch of data from MongoDB...");
        try {
          // Get the user ID from secure storage
          const userId = await getSecureItem("userId");
          if (userId) {
            const mongoData = await fetchAllUserData(userId);

            if (mongoData.profiles && mongoData.profiles.length > 0) {
              await setList("profiles", mongoData.profiles);
              setProfiles(mongoData.profiles);
              debugLog("Profiles synced from MongoDB");
            }

            if (mongoData.flags && Object.keys(mongoData.flags).length > 0) {
              await setList("dealbreaker", mongoData.flags);
              setDealbreaker(mongoData.flags);
              debugLog("Flags synced from MongoDB");
            }

            debugLog("Successfully synced all data from MongoDB");
          } else {
            debugLog("Cannot sync data: No user ID found");
          }
        } catch (fetchError) {
          debugLog("Error fetching data from MongoDB:", fetchError);
        }
      }
    } catch (error) {
      debugLog("Error syncing data:", error);

      // Only show errors for user-initiated syncs
      if (forceSync) {
        showToast(
          "error",
          "Sync Error",
          "There was a problem syncing with the server."
        );
      }
    }
  };

  // Update dealbreaker state and save to storage
  const updateDealbreaker = (newState: DealbreakerState) => {
    setDealbreaker(newState);
    setList("dealbreaker", newState);
    debugLog("Saved dealbreaker state to storage:", newState);
  };

  // Ensure a profile exists
  const ensureProfileExists = (profileId: string) => {
    if (!dealbreaker[profileId]) {
      debugLog(
        `Creating profile ${profileId} with flags copied from main profile`
      );

      // Get flags from main profile to copy them
      const mainFlags = dealbreaker.main?.flag || [];
      const mainDealbreakers = dealbreaker.main?.dealbreaker || [];

      const updatedDealbreaker = {
        ...dealbreaker,
        [profileId]: {
          // Copy all flags from main profile to maintain shared items across profiles
          flag: JSON.parse(JSON.stringify(mainFlags)),
          dealbreaker: JSON.parse(JSON.stringify(mainDealbreakers)),
        },
      };
      updateDealbreaker(updatedDealbreaker);
      return true;
    }
    return false;
  };

  // Add item to a specific profile
  const addItemToProfile = (
    profileId: string,
    item: FlagItem,
    type: "flag" | "dealbreaker"
  ) => {
    ensureProfileExists(profileId);
    const updatedDealbreaker = { ...dealbreaker };
    updatedDealbreaker[profileId][type] = [
      ...updatedDealbreaker[profileId][type],
      item,
    ];
    updateDealbreaker(updatedDealbreaker);
  };

  // Add item to all profiles
  const addItemToAllProfiles = (
    item: FlagItem,
    type: "flag" | "dealbreaker"
  ) => {
    const updatedDealbreaker = { ...dealbreaker };
    profiles.forEach((profile) => {
      const profileId = profile.id;
      if (!updatedDealbreaker[profileId]) {
        updatedDealbreaker[profileId] = {
          flag: [],
          dealbreaker: [],
        };
      }
      // Check if the item already exists to avoid duplicates
      const exists = updatedDealbreaker[profileId][type].some(
        (existingItem: FlagItem) => existingItem.id === item.id
      );
      if (!exists) {
        updatedDealbreaker[profileId][type] = [
          ...updatedDealbreaker[profileId][type],
          item,
        ];
      }
    });
    updateDealbreaker(updatedDealbreaker);
  };

  // Remove item from a specific profile
  const removeItemFromProfile = (
    profileId: string,
    itemId: string,
    type: "flag" | "dealbreaker"
  ) => {
    if (dealbreaker[profileId]) {
      const updatedDealbreaker = { ...dealbreaker };
      updatedDealbreaker[profileId][type] = updatedDealbreaker[profileId][
        type
      ].filter((item: FlagItem) => item.id !== itemId);
      updateDealbreaker(updatedDealbreaker);
    }
  };

  // Remove item from all profiles
  const removeItemFromAllProfiles = (
    itemId: string,
    type: "flag" | "dealbreaker"
  ) => {
    const updatedDealbreaker = { ...dealbreaker };
    profiles.forEach((profile) => {
      const profileId = profile.id;
      if (updatedDealbreaker[profileId]) {
        updatedDealbreaker[profileId][type] = updatedDealbreaker[profileId][
          type
        ].filter((item: FlagItem) => item.id !== itemId);
      }
    });
    updateDealbreaker(updatedDealbreaker);
  };

  // Create a new profile
  const createProfile = (name: string) => {
    const newProfileId = `profile_${Date.now()}`;
    const updatedProfiles = [
      ...profiles,
      {
        id: newProfileId,
        name: name || `Profile ${profiles.length + 1}`,
      },
    ];
    setProfiles(updatedProfiles);
    return newProfileId;
  };

  // Delete a profile
  const deleteProfile = (profileId: string) => {
    if (profileId === "main") {
      return false; // Cannot delete main profile
    }

    const updatedProfiles = profiles.filter(
      (profile) => profile.id !== profileId
    );
    setProfiles(updatedProfiles);

    // If the current profile was deleted, set current profile to main
    if (currentProfileId === profileId) {
      setCurrentProfileId("main");
    }

    // Delete the profile data from dealbreaker
    const updatedDealbreaker = { ...dealbreaker };
    delete updatedDealbreaker[profileId];
    updateDealbreaker(updatedDealbreaker);

    return true;
  };

  // Rename a profile
  const renameProfile = (profileId: string, newName: string) => {
    const updatedProfiles = profiles.map((profile) =>
      profile.id === profileId ? { ...profile, name: newName } : profile
    );
    setProfiles(updatedProfiles);
  };

  // Main content with drawer navigation
  useEffect(() => {
    if (isAuthenticated) {
      isDealbreakerMountRef.current = false;
    }
  }, [isAuthenticated]);

  // Function to synchronize flags across all profiles
  const synchronizeProfileFlags = () => {
    debugLog("Synchronizing flags across all profiles...");

    // First collect all unique flags from all profiles
    const allUniqueFlags = new Map();
    const allUniqueDealbreakers = new Map();

    // Iterate through all profiles to find unique items by ID
    Object.keys(dealbreaker).forEach((profileId) => {
      const profile = dealbreaker[profileId];

      // Process flags
      if (profile.flag && Array.isArray(profile.flag)) {
        profile.flag.forEach((flag: FlagItem) => {
          if (flag && flag.id && !allUniqueFlags.has(flag.id)) {
            allUniqueFlags.set(flag.id, flag);
          }
        });
      }

      // Process dealbreakers
      if (profile.dealbreaker && Array.isArray(profile.dealbreaker)) {
        profile.dealbreaker.forEach((db: FlagItem) => {
          if (db && db.id && !allUniqueDealbreakers.has(db.id)) {
            allUniqueDealbreakers.set(db.id, db);
          }
        });
      }
    });

    // Now ensure each profile has all the unique items
    const updatedDealbreaker = { ...dealbreaker };
    let hasChanges = false;

    Object.keys(updatedDealbreaker).forEach((profileId) => {
      const profile = updatedDealbreaker[profileId];

      // Ensure the profile has the correct structure
      if (!profile.flag) profile.flag = [];
      if (!profile.dealbreaker) profile.dealbreaker = [];

      // Add any missing flags
      allUniqueFlags.forEach((flag, flagId) => {
        const exists = profile.flag.some((f: FlagItem) => f.id === flagId);
        if (!exists) {
          debugLog(`Adding missing flag ${flagId} to profile ${profileId}`);
          profile.flag.push(JSON.parse(JSON.stringify(flag)));
          hasChanges = true;
        }
      });

      // Add any missing dealbreakers
      allUniqueDealbreakers.forEach((db, dbId) => {
        const exists = profile.dealbreaker.some((d: FlagItem) => d.id === dbId);
        if (!exists) {
          debugLog(
            `Adding missing dealbreaker ${dbId} to profile ${profileId}`
          );
          profile.dealbreaker.push(JSON.parse(JSON.stringify(db)));
          hasChanges = true;
        }
      });
    });

    // Update if changes were made
    if (hasChanges) {
      debugLog("Updating dealbreaker state with synchronized flags");
      updateDealbreaker(updatedDealbreaker);
      return true;
    }

    debugLog("No changes needed for flag synchronization");
    return false;
  };

  return (
    <StoreContext.Provider
      value={
        {
          dealbreaker,
          setDealbreaker,
          profiles,
          setProfiles,
          currentProfileId,
          setCurrentProfileId,
          addItemToProfile,
          addItemToAllProfiles,
          removeItemFromProfile,
          removeItemFromAllProfiles,
          createProfile,
          deleteProfile,
          renameProfile,
          ensureProfileExists,
          isOnline,
          syncData: syncOfflineData,
        } as any
      }
    >
      <AuthProvider>
        <FlagProvider profiles={profiles} setDealbreaker={setDealbreaker}>
          <Stack>
            <Stack.Screen
              name="index"
              options={{
                headerTitle: "Login",
                title: "Login",
              }}
            />
            <Stack.Screen
              name="login/index"
              options={{
                headerTitle: "Login",
                title: "Login",
              }}
            />
            <Stack.Screen
              name="register/index"
              options={{
                headerTitle: "Register",
                title: "Register",
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
          </Stack>
        </FlagProvider>
      </AuthProvider>
      <Toast />
    </StoreContext.Provider>
  );
};

// Add this right after the StoreContext import
// Override StoreContext type to match our interfaces
// You should update the actual store.ts file with the proper types later
declare module "../store" {
  interface StoreContextType {
    dealbreaker: DealbreakerState;
    setDealbreaker: React.Dispatch<React.SetStateAction<DealbreakerState>>;
    profiles: Profile[];
    setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
    currentProfileId: string;
    setCurrentProfileId: React.Dispatch<React.SetStateAction<string>>;
    addItemToProfile: (
      profileId: string,
      item: FlagItem,
      type: "flag" | "dealbreaker"
    ) => void;
    addItemToAllProfiles: (
      item: FlagItem,
      type: "flag" | "dealbreaker"
    ) => void;
    removeItemFromProfile: (
      profileId: string,
      itemId: string,
      type: "flag" | "dealbreaker"
    ) => void;
    removeItemFromAllProfiles: (
      itemId: string,
      type: "flag" | "dealbreaker"
    ) => void;
    createProfile: (name: string) => string;
    deleteProfile: (profileId: string) => boolean;
    renameProfile: (profileId: string, newName: string) => void;
    ensureProfileExists: (profileId: string) => boolean;
    isOnline: boolean;
    syncData: (forceSync?: boolean) => Promise<void>;
  }
}

export default Layout;
