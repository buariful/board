import { KanbanColumn as KanbanColumnType, Deal } from "@/types/kanban"; // Changed Task to Deal
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  column: KanbanColumnType;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetColumnId: string) => void;
  onCardDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    dealId: string,
    sourceColumnId: string
  ) => void;
  onCardClick: (deal: Deal) => void; // Changed task to deal
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  onDragOver,
  onDrop,
  onCardDragStart,
  onCardClick,
}) => {
  return (
    <div
      // className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 w-full sm:w-[320px] flex-shrink-0 min-h-[400px]" // Adjusted width
      className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4  flex-shrink-0 min-h-[400px]" // Adjusted width
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
      data-dyad-column-id={column.id}
    >
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100 flex justify-between items-center">
        {column.title}
        <span className="text-sm font-normal bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
          {column.deals.length}
        </span>
      </h3>
      <div className="space-y-3 h-[calc(100%-40px)] overflow-y-auto">
        {" "}
        {/* Made cards scrollable within column */}
        {column.deals.map(
          (
            deal // Changed task to deal
          ) => (
            <KanbanCard
              key={deal.id}
              deal={deal} // Changed task to deal
              onDragStart={(e, dealId) => onCardDragStart(e, dealId, column.id)}
              onClick={() => onCardClick(deal)} // Changed task to deal
            />
          )
        )}
      </div>
    </div>
  );
};
