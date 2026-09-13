import { NextResponse } from 'next/server';
import { getAllWorksForWorkspace } from '../create/route'; // Re-using the server-side logic

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
  }

  try {
    const canonicalWorks = getAllWorksForWorkspace(workspaceId);
    const sortedWorks = [...canonicalWorks].sort((a, b) => {
      if (a.workId === "lh-case-001") return -1;
      if (b.workId === "lh-case-001") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const mappedWorks = sortedWorks.map(cw => ({
      id: cw.workId,
      title: cw.title ?? 'Untitled Work',
      description: cw.description ?? '',
      status: cw.status ?? 'open',
      createdAt: cw.createdAt,
      lawyerId: cw.lawyerId,
      evidence: cw.evidence || [],
    }));
    return NextResponse.json(mappedWorks);
  } catch (error) {
    console.error(`[API /api/work] Failed to fetch works for workspace ${workspaceId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch work list' }, { status: 500 });
  }
}