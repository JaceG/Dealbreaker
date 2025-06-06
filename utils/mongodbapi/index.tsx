import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your MongoDB Atlas Data API key and endpoint
// Get these from your Atlas dashboard under Data API
const API_KEY = "YOUR_DATA_API_KEY"; // Replace with your actual API key
const DATA_SOURCE = "mongodb-atlas";
const DATABASE = "dealbreaker";
const COLLECTION = "flagHistory";
const BASE_URL = "https://data.mongodb-api.com/app/data-abcde/endpoint/data/v1"; // Replace with your actual endpoint

// Create an axios instance for MongoDB API
const mongoDbClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "api-key": API_KEY,
  },
});
const dealbreakerClient = axios.create({
  baseURL: "http://localhost:4000/api/dealbreaker",
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to generate a unique ID
export const generateId = () => {
  return (
    Math.floor(Math.random() * 1000000000).toString(16) +
    Date.now().toString(16) +
    Math.floor(Math.random() * 1000000000).toString(16)
  );
};

// Add flag history
export const addFlagHistory = async (
  profileId,
  flagId,
  flagTitle,
  previousStatus,
  newStatus,
  reason = ""
) => {
  try {
    // Create the history entry object with a unique ID
    const historyEntry = {
      _id: generateId(),
      profileId,
      flagId,
      flagTitle,
      timestamp: new Date(),
      previousStatus,
      newStatus,
      reason,
      attachments: [],
    };

    // Try to insert to MongoDB
    const response = await mongoDbClient.post("/action/insertOne", {
      dataSource: DATA_SOURCE,
      database: DATABASE,
      collection: COLLECTION,
      document: historyEntry,
    });

    console.log("Flag history entry added to MongoDB:", response.data);

    // Also store locally
    const existingHistory = await getFlagHistoryLocal(profileId, flagId);
    const updatedHistory = [...existingHistory, historyEntry];
    await AsyncStorage.setItem(
      `flagHistory_${profileId}_${flagId}`,
      JSON.stringify(updatedHistory)
    );

    return historyEntry;
  } catch (error) {
    console.error("Error adding flag history to MongoDB:", error);

    // Fallback to local storage
    try {
      const localEntry = {
        _id: generateId(),
        profileId,
        flagId,
        flagTitle,
        timestamp: new Date(),
        previousStatus,
        newStatus,
        reason,
        attachments: [],
      };

      const existingHistory = await getFlagHistoryLocal(profileId, flagId);
      const updatedHistory = [...existingHistory, localEntry];

      await AsyncStorage.setItem(
        `flagHistory_${profileId}_${flagId}`,
        JSON.stringify(updatedHistory)
      );

      console.log("Flag history entry added locally as fallback");
      await storePendingChange("addFlagHistory", localEntry);
      return localEntry;
    } catch (storageError) {
      console.error("Failed to store history entry locally:", storageError);
      return null;
    }
  }
};

// Get flag history
export const getFlagHistory = async (profileId, flagId) => {
  try {
    // Try to get from MongoDB first
    const response = await mongoDbClient.post("/action/find", {
      dataSource: DATA_SOURCE,
      database: DATABASE,
      collection: COLLECTION,
      filter: { profileId, flagId },
      sort: { timestamp: -1 },
    });

    console.log("Flag history fetched from MongoDB:", response.data);

    // Also update local cache
    if (response.data && response.data.documents) {
      await AsyncStorage.setItem(
        `flagHistory_${profileId}_${flagId}`,
        JSON.stringify(response.data.documents)
      );
      return response.data.documents;
    }

    return [];
  } catch (error) {
    console.error("Error fetching flag history from MongoDB:", error);

    // Fall back to local storage
    return await getFlagHistoryLocal(profileId, flagId);
  }
};

// Local storage functions
export const getFlagHistoryLocal = async (profileId, flagId) => {
  try {
    const history = await AsyncStorage.getItem(
      `flagHistory_${profileId}_${flagId}`
    );
    const parsedHistory = history ? JSON.parse(history) : [];

    // Sort by timestamp (newest first)
    return parsedHistory.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  } catch (error) {
    console.error("Error fetching local flag history:", error);
    return [];
  }
};

// Store pending changes
export const storePendingChange = async (action, data) => {
  try {
    const pendingChanges = await AsyncStorage.getItem("pendingChanges");
    const changes = pendingChanges ? JSON.parse(pendingChanges) : [];

    changes.push({
      action,
      data,
      timestamp: new Date(),
    });

    await AsyncStorage.setItem("pendingChanges", JSON.stringify(changes));
  } catch (error) {
    console.error("Error storing pending change:", error);
  }
};

// Sync pending changes
export const syncPendingChanges = async () => {
  try {
    const pendingChanges = await AsyncStorage.getItem("pendingChanges");
    if (!pendingChanges) return false;

    const changes = JSON.parse(pendingChanges);
    if (changes.length === 0) return false;

    let syncCount = 0;
    const remainingChanges = [];

    for (const change of changes) {
      if (change.action === "addFlagHistory") {
        try {
          await mongoDbClient.post("/action/insertOne", {
            dataSource: DATA_SOURCE,
            database: DATABASE,
            collection: COLLECTION,
            document: change.data,
          });

          syncCount++;
        } catch (error) {
          console.error("Failed to sync change:", error);
          remainingChanges.push(change);
        }
      } else {
        // Unknown action type, keep it
        remainingChanges.push(change);
      }
    }

    // Update pending changes
    await AsyncStorage.setItem(
      "pendingChanges",
      JSON.stringify(remainingChanges)
    );

    console.log(
      `Synced ${syncCount} pending changes, ${remainingChanges.length} remaining`
    );
    return syncCount > 0;
  } catch (error) {
    console.error("Error syncing pending changes:", error);
    return false;
  }
};

// Add attachment to history
export const addAttachmentToHistory = async (historyId, attachment) => {
  try {
    // Try to update in MongoDB
    const response = await mongoDbClient.post("/action/updateOne", {
      dataSource: DATA_SOURCE,
      database: DATABASE,
      collection: COLLECTION,
      filter: { _id: historyId },
      update: {
        $push: { attachments: attachment },
      },
    });

    console.log("Attachment added to MongoDB:", response.data);

    // Also update in local storage
    const allKeys = await AsyncStorage.getAllKeys();
    const historyKeys = allKeys.filter((key) => key.startsWith("flagHistory_"));

    for (const key of historyKeys) {
      const history = await AsyncStorage.getItem(key);
      if (history) {
        const parsedHistory = JSON.parse(history);
        const updatedHistory = parsedHistory.map((item) => {
          if (item._id === historyId) {
            return {
              ...item,
              attachments: [...(item.attachments || []), attachment],
            };
          }
          return item;
        });

        await AsyncStorage.setItem(key, JSON.stringify(updatedHistory));
      }
    }

    return true;
  } catch (error) {
    console.error("Error adding attachment to MongoDB:", error);

    // Still try to update local storage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const historyKeys = allKeys.filter((key) =>
        key.startsWith("flagHistory_")
      );
      let updated = false;

      for (const key of historyKeys) {
        const history = await AsyncStorage.getItem(key);
        if (history) {
          const parsedHistory = JSON.parse(history);
          const updatedHistory = parsedHistory.map((item) => {
            if (item._id === historyId) {
              updated = true;
              return {
                ...item,
                attachments: [...(item.attachments || []), attachment],
              };
            }
            return item;
          });

          await AsyncStorage.setItem(key, JSON.stringify(updatedHistory));
        }
      }

      if (updated) {
        await storePendingChange("addAttachment", { historyId, attachment });
        return true;
      }

      return false;
    } catch (storageError) {
      console.error("Failed to store attachment locally:", storageError);
      return false;
    }
  }
};

export const addDealbreakers = async (dealbreaker, userId) => {
  try {
    // Try to update in MongoDB
    const response = await dealbreakerClient.post("/add-dealbreaker", {
      dealbreaker,
      userId,
    });

    return true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log("error: ", error.message);
      console.error("Error adding attachment to MongoDB:", error);
    } else {
      console.log("Error : ", error);
    }
  }
};

export const getDealbreakers = async (userId: string) => {
  try {
    // Get Dealbreakers from monogodb
    const response = await dealbreakerClient.post("/get-dealbreakers", {
      id: userId,
    });
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log("error: ", error.message);
      console.error("Error adding attachment to MongoDB:", error);
    } else {
      console.log("Error : ", error);
    }
  }
};
