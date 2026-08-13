import { ArchiveDocumentInput, ArchiveDocumentOutput, CreateDocumentInput, CreateDocumentOutput, SignDocumentInput, SignDocumentOutput, UpdateDocumentInput, UpdateDocumentOutput } from "../contracts";
import type { CapabilityCommand } from "@repo/core-kernel";
type CreateDocumentCommand = CapabilityCommand<CreateDocumentInput, CreateDocumentOutput>;
type SignDocumentCommand = CapabilityCommand<SignDocumentInput, SignDocumentOutput>;
type ArchiveDocumentCommand = CapabilityCommand<ArchiveDocumentInput, ArchiveDocumentOutput>;
type UpdateDocumentCommand = CapabilityCommand<UpdateDocumentInput, UpdateDocumentOutput>;
export declare const createDocument: CreateDocumentCommand;
export declare const signDocument: SignDocumentCommand;
export declare const archiveDocument: ArchiveDocumentCommand;
export declare const updateDocument: UpdateDocumentCommand;
export declare const documentCommands: Readonly<Record<string, CapabilityCommand>>;
export type { CreateDocumentCommand, SignDocumentCommand, ArchiveDocumentCommand, UpdateDocumentCommand, };
export declare function nextDocumentId(): any;
//# sourceMappingURL=document.commands.d.ts.map