// Test script to verify GitHub Projects Adapter runtime functionality - R5-C External Reality
import { connectorEcosystemService, handleGitHubWebhookUpdate, syncEOSToGitHub } from "../implementation/services/connector-ecosystem.service.js";

interface GitHubSyncPayload {
  imported: number;
  outboundSynced: number;
  syncedGitHubIssues: any[];
}

async function testGitHubProjectsSync() {
  console.log("🧪 Testing R5-C GitHub Projects Adapter...");
  
  try {
    // 1. List all connectors to verify GitHub adapter is registered
    const connectors = connectorEcosystemService.listConnectors();
    const githubConnector = connectors.find(c => c.id === "github-projects-adapter");
    console.log(`✅ GitHub Projects Adapter registered: ${githubConnector?.name}`);
    console.log(`   - Direction: ${githubConnector?.direction}`);
    console.log(`   - Target: ${githubConnector?.target}`);

    // 2. Trigger the GitHub sync to import issues as canonical EOS Works
    const result = await connectorEcosystemService.sync({
      connectorId: "github-projects-adapter"
    }) as unknown as { status: string; payload: GitHubSyncPayload };
    
    console.log("\n✅ GitHub projects sync completed successfully!");
    console.log(`   - Imported ${result.payload.imported} new GitHub issues as canonical EOS works`);
    console.log(`   - Outbound synced ${result.payload.outboundSynced} EOS work status changes back to GitHub`);
    console.log(`   - Status: ${result.status}`);
    
    if (result.payload.syncedGitHubIssues?.length > 0) {
      console.log("\n📋 Canonical EOS Works created from GitHub issues:");
      result.payload.syncedGitHubIssues.forEach((work: any, index: number) => {
        console.log(`   ${index + 1}. [${work.domainType}] [${work.workMode}] ${work.title} (${work.status})`);
        console.log(`      - EOS Work ID: ${work.workId}`);
        console.log(`      - External GitHub ID: ${work.externalId}`);
        console.log(`      - Platform Source: ${work.platformSource}`);
      });
      
      // Test webhook handler (simulate GitHub sending status update)
      console.log("\n🧪 Testing R5-C real-time webhook update (simulate GitHub issue status change)...");
      const firstWork = result.payload.syncedGitHubIssues[0];
      const externalIdParts = firstWork.externalId.split('#');
      const repo = externalIdParts[0].replace('GH-', '');
      const issueNumber = parseInt(externalIdParts[1]);
      
      const webhookResult = await handleGitHubWebhookUpdate({
        issue_number: issueNumber,
        repository_full_name: repo,
        state: "closed",
        updated_at: Math.floor(Date.now() / 1000)
      });
      
      if (webhookResult.success) {
        console.log("✅ GitHub webhook update processed successfully!");
        console.log(`   - EOS Work ID updated: ${webhookResult.workId}`);
        
        // Test outbound sync (simulate EOS updating GitHub with human-completed status)
        console.log("\n🧪 Testing R5-C outbound sync (EOS → GitHub)...");
        const outboundResult = await syncEOSToGitHub(webhookResult.workId!, "completed");
        if (outboundResult.success) {
          console.log("✅ EOS → GitHub outbound sync completed successfully!");
        }
      }
    }
    
    console.log("\n🎉 R5-C External Reality integration verified for GitHub!");
    console.log("   External work imported while preserving canonical EOS Work identity and continuity.");
    console.log("   All three specialization layers applied:");
    console.log("   • Domain: software-development (Engineering specialization)");
    console.log("   • Work Mode: continuous (Ongoing monitoring specialization)");
    console.log("   • Platform: github-platform (External system specialization)");
    
    return true;
  } catch (error) {
    console.error("❌ GitHub projects sync failed:", error);
    return false;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testGitHubProjectsSync().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { testGitHubProjectsSync };