import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Clock, Building2, AlertCircle, CheckCircle2 } from "lucide-react";

// 1. Bento Card Component
const BentoCard = ({ title, value, sub, icon: Icon, delay, colSpan, highlight }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: delay }}
        className={`
      bg-zinc-900/50 border border-white/5 p-6 rounded-2xl backdrop-blur-sm 
      hover:border-indigo-500/30 hover:bg-zinc-900/80 transition-all duration-300 group relative overflow-hidden
      ${colSpan || 'col-span-1'}
      ${highlight ? 'ring-1 ring-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : ''}
    `}
    >
        {/* Hover Glow */}
        <div className="absolute -inset-px bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl" />

        <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-lg ${highlight ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-400'}`}>
                <Icon className="w-5 h-5" />
            </div>
            {highlight && <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">Active</span>}
        </div>

        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">{title}</div>
        <p className="text-zinc-400 text-xs border-t border-white/5 pt-2 mt-2">{sub}</p>
    </motion.div>
);

// 2. Timeline Placeholder Component
const TimelinePreview = () => (
    <div className="h-full flex flex-col justify-center items-center gap-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent pointer-events-none" />
        <div className="flex gap-2">
            <div className="w-16 h-24 bg-zinc-800/50 rounded border border-white/5"></div>
            <div className="w-16 h-24 bg-indigo-600/20 rounded border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs">Lab</div>
            <div className="w-16 h-24 bg-zinc-800/50 rounded border border-white/5"></div>
            <div className="w-16 h-24 bg-zinc-800/50 rounded border border-white/5"></div>
        </div>
        <p className="text-zinc-500 text-sm font-mono animate-pulse">Processing Schedules...</p>
    </div>
);

export const Dashboard = () => {
    const [stats, setStats] = useState({
        faculty: 0,
        rooms: 0,
        generated: 0,
        conflicts: 0
    });

    useEffect(() => {
        // Fetch Stats
        fetch('http://localhost:8000/api/dashboard/stats')
            .then(res => res.json())
            .then(data => setStats(prev => ({ ...prev, ...data })))
            .catch(err => console.error("Failed to fetch stats:", err));

        // Note: Timeline fetching can be added here similarly
    }, []);

    return (
        <div className="space-y-6">
            {/* Title Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Overview</h1>
                    <p className="text-zinc-400 mt-2">Welcome back, Stifler. Here is the status of the AI/ML B.Tech Section A.</p>
                </div>
                <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors">
                    + New Schedule
                </button>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
                {/* Row 1 */}
                <BentoCard
                    icon={Users} title="Total Faculty" value={stats.faculty} sub="Department: AI/ML" delay={0.1}
                />
                <BentoCard
                    icon={Building2} title="Active Rooms" value={stats.rooms} sub="Utilization: 85%" delay={0.2}
                />
                <BentoCard
                    icon={CheckCircle2} title="Generated" value={stats.generated} sub="Sections: A, B, C" delay={0.3} highlight={true}
                />
                <BentoCard
                    icon={AlertCircle} title="Conflicts" value={stats.conflicts} sub="System Optimization: 100%" delay={0.4}
                />

                {/* Row 2: Large Visual Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="col-span-1 md:col-span-3 row-span-2 bg-zinc-900/40 border border-white/10 rounded-2xl p-6 min-h-[350px] relative backdrop-blur-md"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white">Live Timeline Preview</h3>
                        <div className="flex gap-2">
                            <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                            <span className="text-xs text-zinc-400">Practical</span>
                            <span className="w-3 h-3 rounded-full bg-zinc-700 ml-2"></span>
                            <span className="text-xs text-zinc-400">Theory</span>
                        </div>
                    </div>
                    <TimelinePreview />
                </motion.div>

                {/* Row 2: Side Cards */}
                <BentoCard
                    colSpan="md:row-span-2"
                    icon={Clock} title="Pending" value="4" sub="Awaiting HOD Sign" delay={0.6}
                />
            </div>
        </div>
    );
};