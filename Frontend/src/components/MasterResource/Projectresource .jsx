import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function ProjectResource() {
    return (
        <div
            className="flex flex-col items-center justify-center bg-white rounded-[1.6vh] gap-[1.2vh] text-slate-400"
            style={{ height: '78vh' }}
        >
            <FolderOpen className="w-[5vw] h-[5vw] min-w-[40px] min-h-[40px] opacity-25" />
            <p className="text-[2.1vh] m-0 font-medium text-slate-400">Project Resource</p>
            <p className="text-[1.8vh] m-0 text-slate-300">Feature coming soon</p>
        </div>
    );
}