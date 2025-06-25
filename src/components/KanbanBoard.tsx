import React, { useState, useEffect, useCallback } from "react";
import {
  Deal,
  KanbanColumn as KanbanColumnType,
  KANBAN_COLUMN_DEFINITIONS,
} from "@/types/kanban";
import { KanbanColumn } from "./KanbanColumn";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { DealFormDialog, DealFormData } from "./DealFormDialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/useAuth";
import {
  showError,
  showSuccess,
  showLoading,
  dismissToast,
} from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";

export const KanbanBoard: React.FC = () => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDeals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const newColumns = KANBAN_COLUMN_DEFINITIONS.map((colDef) => ({
        ...colDef,
        deals: [],
      }));

      data.forEach((deal) => {
        const columnIndex = newColumns.findIndex(
          (col) => col.id === deal.status
        );
        if (columnIndex !== -1) {
          newColumns[columnIndex].deals.push(deal as Deal);
        } else {
          console.warn(
            `Deal "${deal.title}" has unknown status "${deal.status}". Placing in first column.`
          );
          newColumns[0].deals.push({
            ...deal,
            status: newColumns[0].id,
          } as Deal);
        }
      });
      setColumns(newColumns);
    } catch (error: any) {
      showError(`Failed to fetch deals: ${error.message}`);
      console.error("Error fetching deals:", error);
      setColumns(
        KANBAN_COLUMN_DEFINITIONS.map((colDef) => ({ ...colDef, deals: [] }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleCardDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    dealId: string,
    sourceColumnId: string
  ) => {
    e.dataTransfer.setData("dealId", dealId);
    e.dataTransfer.setData("sourceColumnId", sourceColumnId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    targetColumnId: string
  ) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    const sourceColumnId = e.dataTransfer.getData("sourceColumnId");

    console.log("[DragDrop] Start:", {
      dealId,
      sourceColumnId,
      targetColumnId,
    });

    if (!dealId || !sourceColumnId || sourceColumnId === targetColumnId) {
      console.log("[DragDrop] Aborted: Invalid data or same column.", {
        dealId,
        sourceColumnId,
        targetColumnId,
      });
      return;
    }

    let dealToMove: Deal | undefined;
    const originalColumns = JSON.parse(JSON.stringify(columns));
    console.log(
      "[DragDrop] Original columns (for rollback):",
      originalColumns.map((c) => ({ id: c.id, deals: c.deals.length }))
    );

    setColumns((prevColumns) => {
      console.log(
        "[DragDrop] setColumns callback: prevColumns",
        prevColumns.map((c) => ({ id: c.id, deals: c.deals.length }))
      );
      const newCols = prevColumns.map((col) => ({
        ...col,
        deals: [...col.deals], // Ensure deep copy of deals array
      }));
      const sourceCol = newCols.find((col) => col.id === sourceColumnId);
      const targetCol = newCols.find((col) => col.id === targetColumnId);

      if (!sourceCol || !targetCol) {
        console.error(
          "[DragDrop] Optimistic: Source or target column not found.",
          { sourceColumnId, targetColumnId }
        );
        return prevColumns; // Return original state if columns not found
      }
      const dealIndex = sourceCol.deals.findIndex((d) => d.id === dealId);
      if (dealIndex === -1) {
        console.error(
          "[DragDrop] Optimistic: Deal not found in source column.",
          { dealId, sourceColumnId }
        );
        return prevColumns; // Return original state if deal not found
      }

      console.log(
        "[DragDrop] Optimistic: Found deal at index",
        dealIndex,
        "in sourceCol",
        sourceCol.id
      );
      const dealsRemoved = sourceCol.deals.splice(dealIndex, 1);

      if (dealsRemoved.length > 0) {
        const tempDealToMove = dealsRemoved[0]; // Use a temporary variable
        if (tempDealToMove) {
          tempDealToMove.status = targetColumnId;
          targetCol.deals.unshift(tempDealToMove); // Add to the beginning of the target column
          dealToMove = tempDealToMove; // Assign to outer scope dealToMove *after* successful state update logic
          console.log(
            "[DragDrop] Optimistic: Moved deal",
            tempDealToMove.id,
            "to targetCol",
            targetCol.id
          );
        } else {
          console.error(
            "[DragDrop] Optimistic: dealToMove became undefined after splice."
          );
          return prevColumns;
        }
      } else {
        console.error("[DragDrop] Optimistic: Splice did not return any deal.");
        return prevColumns;
      }
      console.log(
        "[DragDrop] Optimistic: newCols after move",
        newCols.map((c) => ({ id: c.id, deals: c.deals.length }))
      );
      return newCols;
    });

    // Wait for state to update and then check dealToMove
    // This is tricky because setColumns is async. A better way is to pass dealToMove out of the updater.
    // For now, we rely on the fact that `dealToMove` is assigned in the closure.
    // A more robust way would be to handle the API call after a useEffect hook that watches `columns`,
    // or to manage `dealToMove` outside the `setColumns` updater if possible.
    // The current assignment `dealToMove = tempDealToMove` inside `setColumns` should work due to closure.

    // Let's log dealToMove *after* a microtask delay to give React a chance to process state update
    await Promise.resolve();
    console.log(
      "[DragDrop] After setColumns (microtask delay), dealToMove is:",
      dealToMove ? dealToMove.id : "undefined"
    );

    if (!dealToMove) {
      showError(
        "Error moving deal: Optimistic update failed to identify the deal."
      );
      console.error(
        "[DragDrop] Post-Optimistic: dealToMove is undefined. Reverting."
      );
      setColumns(originalColumns);
      return;
    }

    const loadingToastId = showLoading("Updating deal status...");
    try {
      console.log(
        "[DragDrop] API Call: Updating deal",
        dealId,
        "to status",
        targetColumnId
      );
      const { error } = await supabase
        .from("deals")
        .update({ status: targetColumnId })
        .eq("id", dealId)
        .eq("user_id", user!.id);

      dismissToast(loadingToastId);
      if (error) {
        console.error("[DragDrop] API Error:", error);
        throw error;
      }
      showSuccess(
        `Deal "${dealToMove.title}" moved to "${
          columns.find((c) => c.id === targetColumnId)?.title || targetColumnId
        }".`
      );
      console.log("[DragDrop] API Success: Deal status updated.");
      // fetchDeals(); // Optionally re-fetch to ensure consistency, though optimistic update should suffice
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Failed to move deal: ${error.message}`);
      console.error("[DragDrop] Catch API Error: Reverting columns.", error);
      setColumns(originalColumns); // Revert to original state on API error
    }
  };

  const handleCardClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsDetailSheetOpen(true);
  };

  const handleDetailSheetOpenChange = (isOpen: boolean) => {
    setIsDetailSheetOpen(isOpen);
    if (!isOpen) setSelectedDeal(null);
  };

  const handleOpenAddDealDialog = () => {
    setEditingDeal(null);
    setIsFormDialogOpen(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setIsDetailSheetOpen(false); // Close detail sheet if open
    setIsFormDialogOpen(true);
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!user) return;
    setIsDeleting(true);
    const loadingToastId = showLoading("Deleting deal...");
    try {
      const { error } = await supabase
        .from("deals")
        .delete()
        .eq("id", dealId)
        .eq("user_id", user.id);

      dismissToast(loadingToastId);
      if (error) throw error;

      showSuccess("Deal deleted successfully.");
      setIsDetailSheetOpen(false); // Close detail sheet
      fetchDeals(); // Refresh data
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Failed to delete deal: ${error.message}`);
      console.error("Error deleting deal:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDealFormSubmit = async (
    data: DealFormData,
    dealIdToUpdate?: string
  ) => {
    if (!user) return;
    setIsSubmitting(true);
    const loadingToastId = showLoading(
      dealIdToUpdate ? "Updating deal..." : "Adding deal..."
    );

    try {
      const dealPayload = {
        ...data, // data is already in snake_case from DealFormData
        user_id: user.id,
      };

      let error;
      if (dealIdToUpdate) {
        const { error: updateError } = await supabase
          .from("deals")
          .update(dealPayload)
          .eq("id", dealIdToUpdate)
          .eq("user_id", user.id);
        error = updateError;
      } else {
        // For new deals, ensure created_at is set by the database
        const { error: insertError } = await supabase
          .from("deals")
          .insert(dealPayload); // Supabase handles created_at
        error = insertError;
      }

      dismissToast(loadingToastId);
      if (error) throw error;

      showSuccess(
        dealIdToUpdate
          ? "Deal updated successfully."
          : "Deal added successfully."
      );
      setIsFormDialogOpen(false);
      setEditingDeal(null);
      fetchDeals(); // Refresh data
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(
        `Failed to ${dealIdToUpdate ? "update" : "add"} deal: ${error.message}`
      );
      console.error(
        `Error ${dealIdToUpdate ? "updating" : "adding"} deal:`,
        error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const { logout } = useAuth();
  const handleLogout = async () => {
    const toastId = showLoading("Logging out...");
    try {
      await logout();
      dismissToast(toastId);
      showSuccess("Logged out successfully.");
      // Navigation to / will be handled by ProtectedRoute
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Logout failed: ${error.message}`);
      console.error("Logout error:", error);
    }
  };

  if (isLoading && !columns.length) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen w-full">
        <header className="px-4 md:px-8 pt-4 md:pt-8 flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-32" />{" "}
          {/* Adjusted width for logout button */}
        </header>
        <div className="px-4 md:px-8 flex flex-col md:flex-row gap-6 overflow-x-auto pb-4">
          {KANBAN_COLUMN_DEFINITIONS.map((colDef) => (
            <div
              key={colDef.id}
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 w-full sm:w-[320px] flex-shrink-0"
            >
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-24 w-full mb-3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen w-full flex flex-col">
      <header className="px-4 md:px-8 pt-4 md:pt-8 flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          My CRM Deals
        </h1>
        <div className="flex items-center gap-4">
          <Button onClick={handleOpenAddDealDialog} variant="default">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Deal
          </Button>
          {user && (
            <Button onClick={handleLogout} variant="outline">
              Logout ({user.email?.split("@")[0]})
            </Button>
          )}
        </div>
      </header>
      <div className="px-4 md:px-8 flex-grow gap-6 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-x-auto">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onCardDragStart={handleCardDragStart}
            onCardClick={handleCardClick}
          />
        ))}
        {columns.length === 0 && !isLoading && (
          <div className="text-center py-10 text-gray-500 col-span-full">
            {" "}
            {/* Ensure it spans all columns */}
            <p className="text-xl">No deals found.</p>
            <p>Click "Add New Deal" to get started.</p>
          </div>
        )}
      </div>
      <TaskDetailSheet
        deal={selectedDeal}
        isOpen={isDetailSheetOpen}
        onOpenChange={handleDetailSheetOpenChange}
        onEdit={handleEditDeal}
        onDelete={handleDeleteDeal}
        isDeleting={isDeleting}
      />
      <DealFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleDealFormSubmit}
        initialData={editingDeal}
        isLoading={isSubmitting}
      />
    </div>
  );
};
