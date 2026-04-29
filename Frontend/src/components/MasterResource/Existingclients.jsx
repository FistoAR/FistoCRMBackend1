import React, { useState, useMemo } from 'react';
import ProjectLinks from './Projectlinks ';
import ProjectResource from './Projectresource ';
import DriveManager from './DriveManager';
import Others from './Others';

const ADMIN_ROLES = ["Admin", "SBU", "Project Head"];

const ALL_TABS = [
    { label: 'Project Links', component: 'ProjectLinks' },
    { label: 'Project Resource', component: 'ProjectResource' },
    { label: 'Drive Manager', component: 'DriveManager' },
    { label: 'Others', component: 'Others' },
];

function getCurrentUser() {
    try {
        const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
        if (!raw)
            return { employeeId: "FST006", role: "Project Head", isTeamHead: false };
        const u = JSON.parse(raw);
        return {
            employeeId: u.userName || u.employeeId || "FST006",
            role: u.designation || "Project Head",
            isTeamHead: !!u.teamHead,
        };
    } catch {
        return { employeeId: "FST006", role: "Project Head", isTeamHead: false };
    }
}

export default function ExistingClients() {
    const [activeTab, setActiveTab] = useState(0);

    const currentUser = useMemo(() => getCurrentUser(), []);

    const hasFullAccess =
        ADMIN_ROLES.includes(currentUser.role) || currentUser.isTeamHead;

    // Admin/TeamHead → all 4 tabs, Normal employee → only "Drive Manager"
    const tabs = useMemo(() => {
        if (hasFullAccess) return ALL_TABS;
        return ALL_TABS.filter((tab) => tab.label === 'Drive Manager');
    }, [hasFullAccess]);

    const safeActiveTab = Math.min(activeTab, tabs.length - 1);
    const activeComponent = tabs[safeActiveTab]?.component;

    return (
        <div className="flex flex-col">
            <div className="flex gap-[1vh] flex-wrap my-[0.4vw] bg-white p-[0.6vh] rounded-[2vh]">
                {tabs.map((tab, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveTab(i)}
                        className={`px-[1vh] py-[0.7vh] font-semibold text-[0.8vw] cursor-pointer transition-all bg-transparent outline-none
                            ${safeActiveTab === i
                                ? 'border-b-2 border-slate-700 text-slate-800'
                                : 'border-b-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeComponent === 'ProjectLinks' && <ProjectLinks />}
            {activeComponent === 'ProjectResource' && <ProjectResource />}
            {activeComponent === 'DriveManager' && <DriveManager />}
            {activeComponent === 'Others' && <Others />}
        </div>
    );
}