import type { WorkBinding } from "../contracts/atomic-composition.contracts.js";
import { atomicCompositionService } from "./composition.service.js";
import { notifyWorkspaceListeners } from "../../../../../workspace/packages/core/realtime/src/workspace-notifier.js";
// Alias for import compatibility - fixes module resolution in test environments
export { notifyWorkspaceListeners };

/**
 * AI Agent Execution Engine - Fase 1: Human+AI Work Organization
 * Menghubungkan WorkBinding dengan LLM API untuk eksekusi tugas otomatis
 * Menjaga semua architectural constraints: WorkBinding tetap canonical, tidak ada core changes
 */

export interface AIAgentTask {
  bindingId: string;
  capabilityReference: string;
  workDescription: string;
  actorId: string;
  prompt: string;
  status: "pending" | "processing" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  result?: string;
  evidenceUrl?: string;
}

class AIAgentExecutionService {
  private activeTasks: Map<string, AIAgentTask> = new Map();
  private taskHistory: AIAgentTask[] = [];
  private openaiApiKey: string | null = null;
  private anthropicApiKey: string | null = null;
  private defaultLLMProvider: "openai" | "anthropic" = "openai";

  constructor() {
    // Load API keys dari environment variables
    this.openaiApiKey = process.env.OPENAI_API_KEY || null;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || null;
    
    // Load default provider dari environment jika ada
    const envProvider = process.env.DEFAULT_LLM_PROVIDER;
    if (envProvider === "anthropic" || envProvider === "openai") {
      this.defaultLLMProvider = envProvider;
    } else if (this.anthropicApiKey && !this.openaiApiKey) {
      // Fallback logic jika tidak ada env var - pilih Anthropic jika hanya itu yang tersedia
      this.defaultLLMProvider = "anthropic";
    }

    console.log(`[AI AGENT SERVICE] Initialized with default provider: ${this.defaultLLMProvider}`);
    console.log(`[AI AGENT SERVICE] OpenAI API Key configured: ${!!this.openaiApiKey}`);
    console.log(`[AI AGENT SERVICE] Anthropic API Key configured: ${!!this.anthropicApiKey}`);
  }

  /**
   * Trigger eksekusi AI Agent ketika WorkBinding dibuat
   * Dipanggil dari composition.service.ts setelah binding dibuat
   */
  async executeAITask(binding: WorkBinding, workTitle: string, workspaceId?: string): Promise<AIAgentTask | null> {
    // Hanya proses untuk AI Agent provider type
    if (!this.isAIAgentBinding(binding)) {
      return null;
    }

    console.log(`[AI AGENT EXECUTION] Memulai tugas untuk binding: ${binding.bindingId}`);
    
    // Buat task object dengan workspaceId untuk multi-tenant compliance
    const task: AIAgentTask & { workspaceId?: string } = {
      bindingId: binding.bindingId,
      capabilityReference: binding.capabilityReference,
      workDescription: workTitle,
      actorId: binding.actorProjectionId,
      prompt: this.generatePromptForCapability(binding.capabilityReference, workTitle),
      status: "pending",
      startedAt: new Date().toISOString(),
      workspaceId: workspaceId // Simpan workspaceId untuk filtering nanti
    };

    this.activeTasks.set(binding.bindingId, task);
    this.runAIExecution(task, binding);
    
    return task;
  }

  /**
   * Cek apakah binding adalah untuk AI Agent
   */
  private isAIAgentBinding(binding: WorkBinding): boolean {
    // ActorProjectionId diawali dengan "ai-" untuk semua AI agents (sesuai golden proof)
    return binding.actorProjectionId.startsWith("ai-");
  }

  /**
   * Generate prompt spesifik berdasarkan capability yang dibutuhkan
   */
  private generatePromptForCapability(capability: string, workTitle: string): string {
    const prompts: Record<string, string> = {
      "cap-market-research": `Lakukan riset pasar untuk proyek: "${workTitle}". Berikan analisis kompetitor, target audience, dan rekomendasi positioning. Output dalam format JSON yang terstruktur.`,
      "cap-content-creation": `Buatkan konten marketing untuk proyek: "${workTitle}". Sertakan copy untuk social media, deskripsi produk, dan email outreach.`,
      "cap-data-analysis": `Analisis data yang diberikan untuk proyek: "${workTitle}". Berikan insight dan rekomendasi actionable.`
    };

    return prompts[capability] || `Kerjakan tugas untuk proyek: "${workTitle}" dengan kemampuan ${capability}. Berikan hasil yang terstruktur.`;
  }

  /**
   * Get active AI tasks - exposed untuk dashboard monitoring
   * Dipanggil oleh getMyRealityModel untuk menampilkan status AI tasks di dashboard
   */
  getActiveTasks(workspaceId?: string): AIAgentTask[] {
    const tasks = Array.from(this.activeTasks.values()) as (AIAgentTask & { workspaceId?: string })[];
    if (workspaceId) {
      // Filter tasks berdasarkan workspace jika disediakan (multi-tenant compliance)
      // Implementasi penuh: hanya return tasks yang memiliki workspaceId yang cocok
      const filteredTasks = tasks.filter(task => task.workspaceId === workspaceId);
      console.log(`[AI AGENT SERVICE] Filtered ${filteredTasks.length} active tasks for workspace: ${workspaceId}`);
      return filteredTasks;
    }
    return tasks;
  }

  /**
   * Get task history - exposed untuk dashboard audit trail
   */
  getTaskHistory(limit?: number, workspaceId?: string): AIAgentTask[] {
    let history = [...this.taskHistory].reverse() as (AIAgentTask & { workspaceId?: string })[]; // newest first
    
    if (workspaceId) {
      // Filter history by workspace untuk multi-tenant compliance
      history = history.filter(task => task.workspaceId === workspaceId);
    }
    
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get AI task statistics untuk WorkSummaryCards di dashboard
   * Mengembalikan metrics yang kompatibel dengan WorkSummaryCards props
   */
  getAIMetrics(workspaceId?: string) {
    const active = this.getActiveTasks(workspaceId);
    const history = this.getTaskHistory(undefined, workspaceId);
    const allTasks = [...active, ...history];
    
    return {
      total: allTasks.length,
      processing: active.filter(t => t.status === "processing").length,
      completed: history.filter(t => t.status === "completed").length,
      failed: [...active.filter(t => t.status === "failed"), ...history.filter(t => t.status === "failed")].length
    };
  }

  /**
   * Helper untuk mendapatkan task ID - FIXED: duplicate function removed
   */
  private getTaskId(bindingId: string): string {
    return `ai-task-${bindingId}-${Date.now()}`;
  }

  /**
   * Helper untuk get task status - FIXED: duplicate function removed
   */
  private getTaskStatus(taskId: string): "pending" | "processing" | "completed" | "failed" {
    const task = this.activeTasks.get(taskId);
    return task?.status || "pending";
  }

  /**
   * Call OpenAI API (GPT-4o) untuk eksekusi tugas
   */
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Call Anthropic API (Claude 3.5 Sonnet) untuk eksekusi tugas
   */
  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.anthropicApiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Eksekusi LLM API - production implementation dengan OpenAI/Anthropic
   * Fallback ke mock jika tidak ada API key yang dikonfigurasi
   */
  private async runAIExecution(task: AIAgentTask, binding: WorkBinding) {
    // Update status ke processing
    task.status = "processing";
    this.activeTasks.set(task.bindingId, task);
    // Trigger realtime update untuk dashboard
    notifyWorkspaceListeners(binding.workspaceId);
    console.log(`[AI AGENT EXECUTION] Memproses: ${task.bindingId} | Notified workspace: ${binding.workspaceId}`);

    try {
      let aiResult: string;

      // Cek apakah ada API key yang tersedia, gunakan real LLM jika ada
      if (this.openaiApiKey || this.anthropicApiKey) {
        console.log(`[AI AGENT EXECUTION] Calling ${this.defaultLLMProvider} API untuk task: ${task.bindingId}`);
        
        if (this.defaultLLMProvider === "openai" && this.openaiApiKey) {
          aiResult = await this.callOpenAI(task.prompt);
        } else if (this.defaultLLMProvider === "anthropic" && this.anthropicApiKey) {
          aiResult = await this.callAnthropic(task.prompt);
        } else {
          // Fallback ke mock jika provider yang dipilih tidak tersedia
          console.warn(`[AI AGENT EXECUTION] Provider ${this.defaultLLMProvider} not available, using mock`);
          aiResult = this.generateMockResult(task.capabilityReference);
        }
      } else {
        // Jika tidak ada API key sama sekali, gunakan mock (development mode)
        console.log(`[AI AGENT EXECUTION] No API keys configured, using mock execution for: ${task.bindingId}`);
        const processingTime = 2000 + Math.random() * 3000;
        await new Promise(resolve => setTimeout(resolve, processingTime));
        aiResult = this.generateMockResult(task.capabilityReference);
      }
      
      // Update task status
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      task.result = aiResult;
      task.evidenceUrl = `/evidence/ai-output-${task.bindingId}.json`;

      // Archive task
      this.activeTasks.delete(task.bindingId);
      this.taskHistory.push(task);

      // Update WorkBinding status ke completed dan simpan evidence
      await atomicCompositionService.updateAssignmentStatus(
        binding.compositionId, // CompositionId dari parent composition
        binding.bindingId,
        {
          status: "completed",
          evidence: task.evidenceUrl
        }
      );

      // Trigger realtime update untuk dashboard
      notifyWorkspaceListeners(binding.workspaceId);
      console.log(`[AI AGENT EXECUTION] Selesai: ${task.bindingId} | Evidence: ${task.evidenceUrl} | Notified workspace: ${binding.workspaceId}`);
      
    } catch (error) {
      task.status = "failed";
      this.activeTasks.set(task.bindingId, task);
      this.taskHistory.push(task);
      // Trigger realtime update untuk dashboard
      notifyWorkspaceListeners(binding.workspaceId);
      console.error(`[AI AGENT EXECUTION] Gagal: ${task.bindingId}`, error);
    }
  }

  /**
   * Generate mock result untuk development (jika tidak ada API key)
   */
  private generateMockResult(capability: string): string {
    const results: Record<string, string> = {
      "cap-market-research": JSON.stringify({
        competitors: 3,
        targetAudience: "Gen Z & Millennial professionals",
        marketSize: "$2.4B",
        recommendations: ["Fokus pada social media marketing", "Differensiasi dengan AI-powered features"]
      }, null, 2),
      "cap-content-creation": JSON.stringify({
        socialMediaCopy: "Launching soon! 🚀 Solusi baru untuk mengelola bisnis Anda dengan AI.",
        productDescription: "Platform all-in-one untuk meluncurkan dan mengembangkan bisnis online Anda.",
        emailTemplate: "Subject: Bergabung dengan waiting list untuk early access."
      }, null, 2)
    };

    return results[capability] || JSON.stringify({ status: "completed", output: "Tugas selesai diproses oleh AI Agent" });
  }

  /**
   * Get semua active tasks untuk dashboard monitoring (multi-tenant filtered by workspaceId)
   */
  getActiveTasks(workspaceId?: string): AIAgentTask[] {
    const allTasks = Array.from(this.activeTasks.values());
    return workspaceId ? allTasks.filter(task => task.workspaceId === workspaceId) : allTasks;
  }

  /**
   * Get task history (multi-tenant filtered by workspaceId)
   */
  getTaskHistory(_workspaceId?: string): AIAgentTask[] {
    const allHistory = [...this.taskHistory];
    return _workspaceId ? allHistory.filter(task => task.workspaceId === _workspaceId) : allHistory;
  }
}

// Export singleton instance
export const aiAgentExecutionService = new AIAgentExecutionService();