import { useState } from 'react';
import { BackgroundBeams } from '../components/ui/background-beams';
import { LayoutDashboard, Calendar, Users, GraduationCap, Settings, FileSpreadsheet, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const SidebarItem = ({ icon: Icon, label, path, active }: any) => (
    <Link
        to={path}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
    ${active
                ? 'bg-zinc-800/50 text-white border border-zinc-700/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'}`}
    >
        <Icon className={`w-5 h-5 relative z-10 ${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-indigo-300'}`} />
        <span className="font-medium text-sm relative z-10">{label}</span>
        {active && (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent z-0" />
        )}
    </Link>
);

export const SaaSLayout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen w-full bg-background text-zinc-100 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
            {/* 1. Dynamic Background Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <BackgroundBeams />
                {/* Noise Texture for that "Film Grain" look */}
                <div className="absolute inset-0 opacity-20 brightness-100 contrast-150 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                {/* Subtle Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            </div>

            {/* 2. Glass Sidebar */}
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className={`fixed left-0 top-0 h-full w-64 z-50 border-r border-white/5 bg-black/80 md:bg-black/40 backdrop-blur-xl p-6 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div>
                    <div className="flex items-center justify-between mb-10 px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <span className="font-bold text-white text-lg">T</span>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                                Timetable.ai
                            </span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <nav className="space-y-1">
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/" active={location.pathname === '/'} />
                        <SidebarItem icon={Calendar} label="Scheduler" path="/scheduler" active={location.pathname === '/scheduler'} />
                        <SidebarItem icon={Users} label="Faculty & Dept" path="/faculty" active={location.pathname === '/faculty'} />
                        <SidebarItem icon={GraduationCap} label="Classes" path="/classes" active={location.pathname === '/classes'} />
                        <SidebarItem icon={FileSpreadsheet} label="Reports" path="/reports" active={location.pathname === '/reports'} />
                        <SidebarItem icon={Settings} label="Admin Resources" path="/admin" active={location.pathname.startsWith('/admin')} />
                    </nav>
                </div>

                <div className="pt-6 border-t border-white/5">
                    <SidebarItem icon={Settings} label="Settings" path="/settings" />
                </div>
            </div>

            {/* 3. Main Content Area */}
            <main className="relative z-10 md:pl-64 min-h-screen flex flex-col transition-all duration-300">
                {/* Header */}
                <header className="h-16 border-b border-white/5 bg-black/10 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-lg hover:bg-white/5 md:hidden text-zinc-400"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <span className="text-zinc-200 font-medium hidden sm:inline">TimeTable Gen</span>
                        <span className="text-zinc-700">/</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800/50 text-indigo-400 border border-indigo-500/20 text-xs">SaaS Edition</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            System Operational
                        </div>
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">SP</div>
                    </div>
                </header>

                {/* Content Injection */}
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};