import React from 'react';
import { Deal } from "@/types/kanban"; // Deal object now has snake_case properties
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TaskDetailSheetProps {
  deal: Deal | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (dealId: string) => Promise<void>;
  isDeleting?: boolean;
}

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  deal,
  isOpen,
  onOpenChange,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  if (!deal) return null;

  const handleDelete = async () => {
    await onDelete(deal.id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-[90vw] p-6 bg-white dark:bg-gray-900 flex flex-col">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold text-gray-900 dark:text-white">{deal.title}</SheetTitle>
          {/* Accessing snake_case properties */}
          <SheetDescription className="text-gray-600 dark:text-gray-300">
            {deal.company_name} - {deal.contact_name}
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200 flex-grow overflow-y-auto">
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Deal Value</h4>
            {/* Accessing snake_case property */}
            <p className="text-green-600 dark:text-green-400 font-medium">${deal.deal_value.toLocaleString()}</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Status</h4>
            <p>{deal.status}</p>
          </div>
          
          {deal.description && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">Description</h4>
              <p className="whitespace-pre-wrap">{deal.description}</p>
            </div>
          )}

          {deal.tags && deal.tags.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">Tags</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {deal.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex w-full justify-between items-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the deal "{deal.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Confirm Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <div className="flex gap-2">
              <Button onClick={() => onEdit(deal)} variant="outline" size="sm">
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="default" size="sm">
                Close
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};