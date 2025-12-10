import { Link, Outlet, useLocation } from "react-router-dom";
import { Users, Box, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export const AdminLayout = () => {
    const location = useLocation();

    const navItems = [
        { path: "/admin/faculty", label: "Faculty", icon: Users },
        { path: "/admin/rooms", label: "Rooms", icon: Box },
        { path: "/admin/subjects", label: "Subjects", icon: BookOpen },
    ];

    return (
        <div className="flex h-full min-h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900/50 border-r border-white/10 p-4 hidden md:block">
                <div className="mb-6 px-2">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Resources</h2>
                </div>
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                    isActive
                                        ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/20"
                                        : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Content Area */}
            <main className="flex-1 p-6 overflow-auto">
                <div className="max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
