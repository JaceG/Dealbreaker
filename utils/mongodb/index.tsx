// Import from our API client
import {
  getFlagHistory as apiFetchFlagHistory,
  addFlagHistory as apiAddFlagHistory,
  syncPendingChanges as apiSyncPendingChanges,
} from "../api";
// Import types
import { HistoryEntry } from "../../models/apiModels";

// Flag History functions - now using API client
export const addFlagHistory = async (
  profileId: string | number,
  profileName: string,
  flagId: string | number,
  flagTitle: string,
  previousStatus: string,
  newStatus: string,
  reason: string = "",
  creatorId: string | number | null = null,
  previousCardType: string = "none",
  newCardType: string = "none",
  attachments: any[] = []
): Promise<HistoryEntry | null> => {
  try {
    // Use the provided creatorId
    const currentUserId = creatorId;

    // Determine card type change
    let cardTypeChange = "none";
    if (previousCardType === "flag" && newCardType === "dealbreaker") {
      cardTypeChange = "flag-to-dealbreaker";
    } else if (previousCardType === "dealbreaker" && newCardType === "flag") {
      cardTypeChange = "dealbreaker-to-flag";
    }

    return apiAddFlagHistory(
      profileId,
      flagId,
      flagTitle,
      previousStatus,
      newStatus,
      reason,
      profileName,
      currentUserId,
      cardTypeChange,
      previousCardType,
      newCardType,
      attachments
    );
  } catch (error) {
    console.error("Error adding flag history:", error);
    return null;
  }
};

export const getFlagHistory = async (
  profileId: string | number,
  flagId: string | number
): Promise<HistoryEntry[] | null> => {
  return apiFetchFlagHistory(profileId, flagId);
};

// Sync pending changes - now using API client
export const syncPendingChanges = async (): Promise<any> => {
  return apiSyncPendingChanges();
};
