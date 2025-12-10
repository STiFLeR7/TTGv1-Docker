import { useState, useEffect } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";

interface Subject {
    id?: number;
    subject_name: string;
    subject_code: string;
    subject_type: string;
}

export const SubjectManager = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<Subject>({
        subject_name: "",
        subject_code: "",
        subject_type: "Theory"
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        const res = await fetch("http://localhost:8000/api/subjects");
        const data = await res.json();
        setSubjects(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("http://localhost:8000/api/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            fetchSubjects();
            setIsAdding(false);
            setFormData({ subject_name: "", subject_code: "", subject_type: "Theory" });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete subject?")) return;
        await fetch(`http://localhost:8000/api/subjects/${id}`, { method: "DELETE" });
        setSubjects(subjects.filter(s => s.id !== id));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Subject Manager</h1>
                    <p className="text-zinc-400">Define curriculum courses.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">
                    <Plus className="w-4 h-4" /> Add Subject
                </button>
            </div>

            {isAdding && (
                <div className="bg-zinc-900 border border-white/10 p-4 rounded-lg">
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500">Name</label>
                            <input className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white" value={formData.subject_name} onChange={e => setFormData({ ...formData, subject_name: e.target.value })} placeholder="Data Structures" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500">Code</label>
                            <input className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white w-24" value={formData.subject_code} onChange={e => setFormData({ ...formData, subject_code: e.target.value })} placeholder="CS101" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500">Type</label>
                            <select className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white" value={formData.subject_type} onChange={e => setFormData({ ...formData, subject_type: e.target.value })}>
                                <option value="Theory">Theory</option>
                                <option value="Practical">Practical</option>
                            </select>
                        </div>
                        <button type="submit" className="bg-emerald-600 text-white px-3 py-1.5 rounded">Save</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 px-2">Cancel</button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((s) => (
                    <div key={s.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-amber-500/30 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-zinc-100">{s.subject_name}</h3>
                                <div className="text-xs text-zinc-500 flex gap-2">
                                    <span className="bg-white/5 px-1 rounded">{s.subject_code}</span>
                                    <span>{s.subject_type}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => s.id && handleDelete(s.id)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
