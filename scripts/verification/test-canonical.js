// Test script to verify canonical store access
async function testCanonical() {
  try {
    const { getWorkById } = await import("../../workspace/apps/web/app/api/work/create/route.js");
    const work = getWorkById("REALITY-002");
    console.log("Canonical work found:", work ? work.workId : "NOT FOUND");
  } catch (e) {
    console.error("Import error:", e);
  }
}
testCanonical();