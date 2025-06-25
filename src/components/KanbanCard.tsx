import { Deal } from "@/types/kanban";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KanbanCardProps {
  deal: Deal; // Deal object now has snake_case properties
  onDragStart: (e: React.DragEvent<HTMLDivElement>, dealId: string) => void;
  onClick: () => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ deal, onDragStart, onClick }) => {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={onClick}
      className="mb-4 cursor-grab hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
      data-dyad-id={deal.id}
    >
      <CardHeader className="p-4">
        <CardTitle className="text-md font-semibold">{deal.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm">
        {/* Accessing snake_case properties */}
        <p className="text-gray-600 dark:text-gray-300">{deal.company_name}</p>
        <p className="text-gray-500 dark:text-gray-400">{deal.contact_name}</p>
        <p className="font-medium mt-2 text-green-600 dark:text-green-400">
          Value: ${deal.deal_value.toLocaleString()}
        </p>
      </CardContent>
      {deal.tags && deal.tags.length > 0 && (
        <CardFooter className="p-4 pt-0">
          <div className="flex flex-wrap gap-1">
            {deal.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
};