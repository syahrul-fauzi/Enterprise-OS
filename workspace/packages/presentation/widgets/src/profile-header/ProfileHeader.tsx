"use client";

import React from "react";
import type { Member } from "@repo/presentation-types";

type ProfileMember = Member & {
  readonly publicationCount?: number;
  readonly citationCount?: number;
  readonly researcherCount?: number;
  readonly website?: string;
  readonly linkedin?: string;
  readonly github?: string;
};

export interface ProfileHeaderProps {
  member: ProfileMember;
  productId: string;
}

export function ProfileHeader({ member, productId }: ProfileHeaderProps) {
  const isInstitution = member.type === "institution";
  
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className={`${isInstitution ? "h-20 w-20 rounded-lg" : "h-24 w-24 rounded-full"} bg-slate-200 flex-shrink-0`}>
          {isInstitution && <span className="text-2xl flex items-center justify-center h-full">🏛️</span>}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{member.name}</h1>
          <p className="mt-2 text-lg text-slate-600">{member.affiliation || member.location || "Independent Researcher"}</p>
          
          {member.bio && <p className="mt-4 text-slate-700 leading-relaxed">{member.bio}</p>}

          <div className="mt-6 flex flex-wrap gap-4">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
              {member.publicationCount || 0} Publikasi
            </span>
            {member.citationCount && (
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                {member.citationCount} Sitasi
              </span>
            )}
            {member.researcherCount && (
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                {member.researcherCount} Peneliti Terafiliasi
              </span>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            {member.website && (
              <a 
                href={member.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Website
              </a>
            )}
            {member.linkedin && (
              <a 
                href={member.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                LinkedIn
              </a>
            )}
            {member.github && (
              <a 
                href={member.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                GitHub
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;