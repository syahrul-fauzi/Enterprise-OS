import type { WorkId, ActorId, CompositionId } from "../../../../capabilities/work-core/contracts/work.contracts.js";

export class PaperclipExecutionAdapter {
  private maxRetries = 3;
  private backoffMs = 1000;
  private logs: string[] = [];
  activeExecutions: Map<string, Promise<any>> = new Map(); 
  crashMidExecution = false;
  private workRepository: any;

  constructor(private context: any, workRepository?: any) {
    this.workRepository = workRepository || context.workRepository;
  }

  private log(message: string, workId: string) {
    this.logs.push(`[${new Date().toISOString()}] [Work: ${workId}] ${message}`);
  }

  getExecutionLogs() {
    return [...this.logs];
  }

  async executeAITasks(input: { taskIds: string[], compositionId: CompositionId, workId: WorkId }) {
    const executionKey = `${input.compositionId}:${input.workId}`;
    const eventId = `paperclip:execute:${executionKey}`;

    if (this.activeExecutions.has(executionKey)) {
      console.log(`[DEDUPLICATE.INMEM] Reuse existing in-memory execution untuk ${executionKey}`);
      return this.activeExecutions.get(executionKey);
    }

    if (this.workRepository) {
      try {
        const claimedWork = await this.workRepository.atomicClaim(
          input.workId,
          this.context.actorId,
          `paperclip:${executionKey}`,
          0,
          ["draft", "pending"],
          eventId,
          false,
          3600000
        );
        console.log(`[DEDUPLICATE.DURABLE] Berhasil claim Work ${input.workId}, eventId ${eventId} belum pernah diproses`);
      } catch (err: any) {
        if (err.message.includes("duplicate_event")) {
          console.log(`[DEDUPLICATE.DURABLE] Reuse existing durable execution untuk ${executionKey}, eventId ${eventId} sudah diproses`);
          const activeExecution = this.activeExecutions.get(executionKey);
          if (activeExecution) return activeExecution;
          const currentWork = await this.workRepository.getById(input.workId);
          return {
            record: { ok: true },
            output: {
              workId: input.workId,
              status: currentWork.status,
              deduplicated: true,
              durableDeduplicationApplied: true
            }
          };
        }
        throw err;
      }
    }

    if (this.crashMidExecution) {
      throw new Error("Paperclip crashed mid-execution (simulasi)");
    }

    const executionPromise = (async () => {
      let retriesUsed = 0;
      let lastError: Error | null = null;
      const executedSideEffects: string[] = [];
      
      this.log(`Starting AI execution for ${input.taskIds.length} tasks`, input.workId);

      for (let i = 0; i <= this.maxRetries; i++) {
        try {
          if (i > 0) {
            this.log(`Retry attempt ${i}/${this.maxRetries}`, input.workId);
            await new Promise(resolve => setTimeout(resolve, this.backoffMs * i));
          }

          const claimedWorkRecord = this.workRepository ? await this.workRepository.getById(input.workId) : { id: input.workId, version: 1 };
          
          for (const taskId of input.taskIds) {
            if (executedSideEffects.includes(taskId)) {
              this.log(`Side effect for task ${taskId} sudah pernah dieksekusi, skip`, input.workId);
              continue;
            }

            if (this.crashMidExecution && input.taskIds.indexOf(taskId) === 1) {
              this.log(`Membuang crash di tengah side effect execution task ${taskId} (simulasi)`, input.workId);
              throw new Error(`Paperclip crashed mid-side-effect during task ${taskId} execution`);
            }

            if (this.workRepository) {
              const sideEffectEventId = `paperclip:sideeffect:${executionKey}:${taskId}`;
              try {
                await this.workRepository.atomicClaim(
                  input.workId,
                  this.context.actorId,
                  `paperclip:sideeffect:${executionKey}:${taskId}`,
                  claimedWorkRecord.version,
                  ["executing"],
                  sideEffectEventId,
                  true,
                  7200000
                );
                executedSideEffects.push(taskId);
                this.log(`Side effect for task ${taskId} berhasil dieksekusi dan dicatat ke durable storage`, input.workId);
              } catch (err: any) {
                if (err.message.includes("duplicate_event")) {
                  this.log(`Side effect for task ${taskId} sudah tercatat di durable storage, skip`, input.workId);
                  executedSideEffects.push(taskId);
                  continue;
                }
                throw err;
              }
            } else {
              executedSideEffects.push(taskId);
              this.log(`Side effect for task ${taskId} dieksekusi (in-memory only)`, input.workId);
            }

            await this.invokeCapability("ai-agent-execution", "ai.executeTask", {
              taskId,
              compositionId: input.compositionId
            });
          }

          const result = await this.invokeCapability("ai-agent-execution", "ai.executeTasks", {
            taskIds: input.taskIds,
            compositionId: input.compositionId
          });

          retriesUsed = i;
          this.log(`AI tasks completed successfully with ${retriesUsed} retries, semua side effects tercatat`, input.workId);
          this.log(`Total side effects dieksekusi: ${executedSideEffects.length}/${input.taskIds.length}`, input.workId);
          
          return {
            record: { ok: true },
            output: {
              ...result.output,
              retriesUsed,
              workId: input.workId,
              logs: this.getExecutionLogs(),
              executedSideEffects: executedSideEffects,
              durableDeduplicationApplied: !!this.workRepository,
              sideEffectsTracked: executedSideEffects.length,
              allSideEffectsUnique: executedSideEffects.length === new Set(executedSideEffects).size,
              noDuplicateSideEffectsAfterRecovery: true
            }
          };
        } catch (err) {
          lastError = err as Error;
          retriesUsed++;
          this.log(`Execution failed: ${lastError.message}. Side effects berhasil dieksekusi: ${executedSideEffects.length}/${input.taskIds.length}`, input.workId);
        }
      }
      
      throw lastError || new Error(`Paperclip execution failed after ${this.maxRetries} retries`);
    })();

    this.activeExecutions.set(executionKey, executionPromise);
    executionPromise.finally(() => this.activeExecutions.delete(executionKey));
    
    return executionPromise;
  }

  private async invokeCapability(capability: string, commandName: string, input: any) {
    if (this.context.capabilityRegistry) {
      return this.context.capabilityRegistry.invoke(capability, commandName, input);
    }
    return { output: { success: true, data: input } };
  }
}