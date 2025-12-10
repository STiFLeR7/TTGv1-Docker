import { useState, useEffect } from "react";
import { Plus, Trash2, Box } from "lucide-react";

interface Room {
    id?: number;
    room_name: string;
    capacity: number;
}

export const RoomManager = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<Room>({
        room_name: "",
        capacity: 60
    });

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        const res = await fetch("http://localhost:8000/api/rooms");
        const data = await res.json();
        setRooms(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("http://localhost:8000/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            fetchRooms();
            setIsAdding(false);
            setFormData({ room_name: "", capacity: 60 });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete room?")) return;
        await fetch(`http://localhost:8000/api/rooms/${id}`, { method: "DELETE" });
        setRooms(rooms.filter(r => r.id !== id));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Room Manager</h1>
                    <p className="text-zinc-400">Manage classrooms and labs.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">
                    <Plus className="w-4 h-4" /> Add Room
                </button>
            </div>

            {isAdding && (
                <div className="bg-zinc-900 border border-white/10 p-4 rounded-lg">
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500">Name</label>
                            <input className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white" value={formData.room_name} onChange={e => setFormData({ ...formData, room_name: e.target.value })} placeholder="Room 101" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500">Capacity</label>
                            <input type="number" className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white w-24" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} />
                        </div>
                        <button type="submit" className="bg-emerald-600 text-white px-3 py-1.5 rounded">Save</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 px-2">Cancel</button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {rooms.map((r) => (
                    <div key={r.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-pink-500/30 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400">
                                <Box className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-zinc-100">{r.room_name}</h3>
                                <div className="text-xs text-zinc-500">Cap: {r.capacity}</div>
                            </div>
                        </div>
                        <button onClick={() => r.id && handleDelete(r.id)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
