export interface NewWorkFormClientProps {
  intent: {
    id: string;
    resolution: string | null;
    status: string;
    category: string;
    createdAt: string;
    updatedAt: string;
    title: string;
  } | null;
  intentId: string;
  handleWorkCreation: (data: {
    title: string;
    objective: string;
    description: string;
    intentId: string;
  }) => Promise<{ workId: string } | undefined>;
}