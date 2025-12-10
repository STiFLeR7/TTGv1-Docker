import { useState, useEffect } from "react";
import { Plus, Trash2, User } from "lucide-react";

interface Faculty {
    id?: number;
    faculty_name: string;
    max_lectures_per_day: number;
    subjects_can_teach: string[];
}

export const FacultyManager = () => {
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Faculty>({
        faculty_name: "",
        max_lectures_per_day: 4,
        subjects_can_teach: []
    });

    useEffect(() => {
        fetchFaculty();
    }, []);

    const fetchFaculty = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/faculty");
            const data = await res.json();
            setFaculty(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:8000/api/faculty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                fetchFaculty();
                setIsAdding(false);
                setFormData({ faculty_name: "", max_lectures_per_day: 4, subjects_can_teach: [] });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete faculty?")) return;
        try {
            await fetch(`http://localhost:8000/api/faculty/${id}`, { method: "DELETE" });
            setFaculty(faculty.filter(f => f.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Faculty Manager</h1>
                    <p className="text-zinc-400">Manage professors and their workloads.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Faculty
                </button>
            </div>

            {/* Add Modal/Form Inline (Simplified for MVP) */}
            {isAdding && (
                <div className="bg-zinc-900 border border-white/10 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500">Name</label>
                            <input
                                required
                                className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white w-48"
                                value={formData.faculty_name}
                                onChange={e => setFormData({ ...formData, faculty_name: e.target.value })}
                                placeholder="Dr. John Doe"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500">Max Load/Day</label>
                            <input
                                type="number"
                                className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white w-20"
                                value={formData.max_lectures_per_day}
                                onChange={e => setFormData({ ...formData, max_lectures_per_day: parseInt(e.target.value) })}
                            />
                        </div>
                        <button type="submit" className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-500">Save</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-white px-2">Cancel</button>
                    </form>
                </div>
            )}

            {/* Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="text-zinc-500">Loading...</div>
                ) : faculty.map((f) => (
                    <div key={f.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-zinc-100">{f.faculty_name}</h3>
                                <div className="text-xs text-zinc-500 flex gap-2">
                                    <span>Load: {f.max_lectures_per_day}/day</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => f.id && handleDelete(f.id)}
                            className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
