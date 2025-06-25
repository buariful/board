import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Deal, KANBAN_COLUMN_DEFINITIONS } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Schema now uses snake_case for database fields
const dealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  company_name: z.string().min(1, 'Company name is required'), // snake_case
  contact_name: z.string().min(1, 'Contact name is required'), // snake_case
  deal_value: z.coerce.number().min(0, 'Deal value must be non-negative'), // snake_case
  status: z.string().min(1, 'Status is required'),
  description: z.string().optional(),
  tags: z.string().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag) : []),
});

// This type will be inferred from the schema, so it will also have snake_case keys
export type DealFormData = z.infer<typeof dealSchema>;

interface DealFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // onSubmit expects data that matches the schema (snake_case)
  onSubmit: (data: DealFormData, dealId?: string) => Promise<void>;
  initialData?: Deal | null; // initialData comes from DB, already snake_case
  isLoading?: boolean;
}

export const DealFormDialog: React.FC<DealFormDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: { // Default values also use snake_case
      title: '',
      company_name: '',
      contact_name: '',
      deal_value: 0,
      status: KANBAN_COLUMN_DEFINITIONS[0]?.id || '',
      description: '',
      tags: '',
    },
  });

  useEffect(() => {
    if (isOpen) { // Reset form only when dialog opens or initialData changes
      if (initialData) {
        reset({
          title: initialData.title,
          company_name: initialData.company_name,
          contact_name: initialData.contact_name,
          deal_value: initialData.deal_value,
          status: initialData.status,
          description: initialData.description || '',
          tags: initialData.tags?.join(', ') || '',
        });
      } else {
        reset({
          title: '',
          company_name: '',
          contact_name: '',
          deal_value: 0,
          status: KANBAN_COLUMN_DEFINITIONS[0]?.id || '',
          description: '',
          tags: '',
        });
      }
    }
  }, [initialData, isOpen, reset]);

  const handleFormSubmit = async (data: DealFormData) => {
    // data is already in snake_case from the form, matching DealFormData
    // The schema transforms `tags` to an array.
    const submitData = {
        ...data,
        tags: data.tags as string[] | undefined, // Already transformed by zod
    };
    await onSubmit(submitData, initialData?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update the details of this deal.' : 'Fill in the details for the new deal.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input id="company_name" {...register('company_name')} />
            {errors.company_name && <p className="text-red-500 text-sm">{errors.company_name.message}</p>}
          </div>

          <div>
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input id="contact_name" {...register('contact_name')} />
            {errors.contact_name && <p className="text-red-500 text-sm">{errors.contact_name.message}</p>}
          </div>

          <div>
            <Label htmlFor="deal_value">Deal Value ($)</Label>
            <Input id="deal_value" type="number" {...register('deal_value')} />
            {errors.deal_value && <p className="text-red-500 text-sm">{errors.deal_value.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_COLUMN_DEFINITIONS.map(col => (
                      <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="text-red-500 text-sm">{errors.status.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...register('description')} />
          </div>

          <div>
            <Label htmlFor="tags">Tags (Optional, comma-separated)</Label>
            <Input id="tags" {...register('tags')} placeholder="e.g., urgent, follow-up, demo-scheduled" />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save Changes' : 'Add Deal')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};