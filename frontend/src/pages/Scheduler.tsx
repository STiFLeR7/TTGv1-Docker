
import { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Printer, Download, Plus, Trash2, AlertTriangle, Settings, Save, Sparkles } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils"; // Import cn utility

// Types
type SlotType = "Theory" | "Practical";

interface ScheduleSlot {
    id: string;
    section: string; // GLOBAL: Tracking section for each slot
    day: string;
    time: string;
    subject: string;
    faculty: string;
    room: string;
    type: SlotType;
    color?: string;
}

interface TimetableMeta {
    orgName: string;
    deptName: string;
    branch: string;
    academicYear: string;
    signatures: { coordinator: string; hod: string; director: string };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Default Times (Editable)
const DEFAULT_TIMES = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 01:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00"];

export const Scheduler = () => {
    const componentRef = useRef<HTMLDivElement>(null);

    // ------------------------------------
    // GLOBAL STATE
    // ------------------------------------
    const [sections, setSections] = useState<string[]>(["A", "B", "C"]);
    const [currentSection, setCurrentSection] = useState("A");
    const [times, setTimes] = useState<string[]>(DEFAULT_TIMES);
    const [globalSchedule, setGlobalSchedule] = useState<ScheduleSlot[]>([]); // ALL sections data

    // Meta State (Shared across sections for Organization/Dept names, but signatures might be unique? Keeping simple)
    const [meta, setMeta] = useState<TimetableMeta>({
        orgName: "NIMS University",
        deptName: "Artificial Intelligence & Machine Learning",
        branch: "B.Tech",
        academicYear: "2024-2025",
        signatures: { coordinator: "", hod: "", director: "" }
    });

    // Form State
    const [selectedSlot, setSelectedSlot] = useState<{ day: string, time: string } | null>(null);
    const [form, setForm] = useState({
        subject: "",
        faculty: "",
        room: "",
        type: "Theory" as SlotType,
        color: "#6366f1"
    });

    // UI State
    const [isTimeEditorOpen, setIsTimeEditorOpen] = useState(false);
    const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
    const [tempTimeVal, setTempTimeVal] = useState("");
    const [newSectionName, setNewSectionName] = useState("");
    const [newSectionType, setNewSectionType] = useState<"Normal" | "TPP" | "NTPP">("Normal");
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);


    // ------------------------------------
    // API INTEGRATION
    // ------------------------------------
    useEffect(() => {
        loadSchedule();
    }, []);

    const saveSchedule = async () => {
        setIsSaving(true);
        try {
            const payload = {
                globalSchedule,
                sections,
                times,
                meta
            };
            const res = await fetch("http://localhost:8000/api/save_schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to save");
            alert("Schedule saved successfully!");
        } catch (e) {
            console.error(e);
            alert("Error saving schedule");
        } finally {
            setIsSaving(false);
        }
    };

    const loadSchedule = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/load_schedule");
            const data = await res.json();
            if (data.found && data.data) {
                if (data.data.globalSchedule) setGlobalSchedule(data.data.globalSchedule);
                if (data.data.sections) setSections(data.data.sections);
                if (data.data.times) setTimes(data.data.times);
                if (data.data.meta) setMeta(data.data.meta);
                // Ensure current section is valid
                if (data.data.sections && !data.data.sections.includes(currentSection)) {
                    setCurrentSection(data.data.sections[0]);
                }
            }
        } catch (e) {
            console.error("Failed to load schedule", e);
        }
    };

    const handleAutoGenerate = async () => {
        if (!confirm("This will overwrite existing slots if the generator runs. Proceed?")) return;
        setIsGenerating(true);
        try {
            const res = await fetch("http://localhost:8000/api/generate_async", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sections,
                    // Pass other constraints here if needed
                })
            });
            const data = await res.json();
            alert(`Auto-generation started! Task ID: ${data.task_id}. (Polling not yet implemented)`);
        } catch (e) {
            console.error(e);
            alert("Failed to start generation");
        } finally {
            setIsGenerating(false);
        }
    };


    // ------------------------------------
    // CONFLICT DETECTION LOGIC
    // ------------------------------------
    // Check global schedule for conflicts
    const conflictWarning = useMemo(() => {
        if (!selectedSlot || !form.faculty || !form.room) return null;

        // Filter other slots at THIS time
        const conflictingSlots = globalSchedule.filter(s =>
            s.day === selectedSlot.day &&
            s.time === selectedSlot.time &&
            s.id !== (selectedSlot as any).id // Exclude self if editing (not implemented yet, but good practice)
        );

        // 1. Faculty Conflict
        const facultyConflict = conflictingSlots.find(s => s.faculty === form.faculty && s.section !== currentSection);
        if (facultyConflict) {
            return `Conflict: ${form.faculty} is already busy in Section ${facultyConflict.section} `;
        }

        // 2. Room Conflict
        const roomConflict = conflictingSlots.find(s => s.room === form.room && s.section !== currentSection);
        if (roomConflict) {
            return `Conflict: Room ${form.room} is occupied by Section ${roomConflict.section} `;
        }

        // 3. Same Section Collision (Prevent overwriting logic handles this implicitly, but here we check doubles)
        const sameSection = conflictingSlots.find(s => s.section === currentSection);
        if (sameSection) {
            return "Slot already occupied in this section";
        }

        return null;
    }, [form.faculty, form.room, selectedSlot, globalSchedule, currentSection]);


    // ------------------------------------------
    // Slot Management
    // ------------------------------------------
    const handleAddSlot = () => {
        if (!selectedSlot || !form.subject) return;
        if (conflictWarning) {
            if (!confirm(`Warning: ${conflictWarning}. Add anyway?`)) return;
        }

        let typeColor = "#6366f1"; // Default Theory (Indigo)
        if (form.type === "Practical") typeColor = "#ec4899"; // Pink

        const newSlot: ScheduleSlot = {
            id: Math.random().toString(36).substr(2, 9),
            section: currentSection,
            day: selectedSlot.day,
            time: selectedSlot.time,
            subject: form.subject,
            faculty: form.faculty,
            room: form.room,
            type: form.type,
            color: typeColor
        };

        // Remove existing slot at this position FOR THIS SECTION
        let updated = globalSchedule.filter(s => !(s.section === currentSection && s.day === selectedSlot.day && s.time === selectedSlot.time));

        // Practical 2-slot span logic (Simplified)
        if (form.type === "Practical") {
            const timeIdx = times.indexOf(selectedSlot.time);
            if (timeIdx < times.length - 1) {
                const nextTime = times[timeIdx + 1];
                updated = updated.filter(s => !(s.section === currentSection && s.day === selectedSlot.day && s.time === nextTime));
            }
        }

        setGlobalSchedule([...updated, newSlot]);
        setSelectedSlot(null);
        setForm({ ...form, subject: "", faculty: "", room: "" });
    };

    const handleDeleteSlot = (id: string) => {
        setGlobalSchedule(globalSchedule.filter(s => s.id !== id));
    };

    const handleAddSection = () => {
        if (newSectionName) {
            let finalName = newSectionName;
            if (newSectionType === "TPP") finalName += " (TPP)";
            else if (newSectionType === "NTPP") finalName += " (NTPP)";

            if (!sections.includes(finalName)) {
                setSections([...sections, finalName]);
                setCurrentSection(finalName);
                setNewSectionName("");
                setNewSectionType("Normal");
                setIsAddingSection(false);
            }
        }
    };

    const handleDeleteSection = (sec: string) => {
        if (confirm(`Are you sure you want to delete Section ${sec}? All schedule data for this section will be lost.`)) {
            setSections(sections.filter(s => s !== sec));
            if (currentSection === sec) setCurrentSection(sections[0] || "");
            setGlobalSchedule(globalSchedule.filter(s => s.section !== sec));
        }
    };


    // ------------------------------------------
    // Time Editor Handlers
    // ------------------------------------------
    const handleUpdateTime = (index: number) => {
        if (!tempTimeVal) return;
        const newTimes = [...times];

        // Logic to update existing slots if time name changes? 
        // For MVP, we allow simple rename. Complex logic would map IDs.
        // If we rename "09:00" to "09:30", all slots with "09:00" become orphaned unless we update them.
        const oldTime = times[index];

        // Update Slots
        const updatedSchedule = globalSchedule.map(s => s.time === oldTime ? { ...s, time: tempTimeVal } : s);
        setGlobalSchedule(updatedSchedule);

        newTimes[index] = tempTimeVal;
        setTimes(newTimes);
        setEditingTimeIndex(null);
    };

    const handleAddTime = () => {
        setTimes([...times, "New Slot"]);
    };

    const handleRemoveTime = (index: number) => {
        const timeToRemove = times[index];
        setGlobalSchedule(globalSchedule.filter(s => s.time !== timeToRemove));
        const newTimes = times.filter((_, i) => i !== index);
        setTimes(newTimes);
    };


    // ------------------------------------------
    // Export Handlers
    // ------------------------------------------
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Timetable_${meta.deptName}_${currentSection} `,
    });

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        // Filter schedule for current section
        const sectionSchedule = globalSchedule.filter(s => s.section === currentSection);

        const data = DAYS.map(day => {
            const row: any = { Day: day };
            times.forEach(time => {
                const slot = sectionSchedule.find(s => s.day === day && s.time === time);
                row[time] = slot ? `${slot.subject} \n(${slot.room})` : "";
            });
            return row;
        });

        data.unshift({});
        data.unshift({ Day: `Section: ${currentSection} ` });
        data.unshift({ Day: `Department: ${meta.deptName} ` });
        data.unshift({ Day: `Organisation: ${meta.orgName} ` });

        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, `Section ${currentSection} `);
        XLSX.writeFile(wb, `timetable_${currentSection}.xlsx`);
    };


    // ------------------------------------------
    // Render Helpers
    // ------------------------------------------
    const getSlotForRender = (day: string, time: string) => {
        return globalSchedule.find(s => s.section === currentSection && s.day === day && s.time === time);
    };

    const isSlotBlockedByPractical = (day: string, timeIdx: number) => {
        if (timeIdx === 0) return false;
        const prevTime = times[timeIdx - 1];
        const prevSlot = getSlotForRender(day, prevTime);
        return prevSlot?.type === "Practical";
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* 1. Controls Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-white/5 backdrop-blur-sm print:hidden gap-4">

                {/* Section Selector */}
                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
                    <span className="text-zinc-400 text-sm font-medium shrink-0">Section:</span>
                    <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                        {sections.map(sec => (
                            <div key={sec} className="relative group/sec">
                                <button
                                    onClick={() => setCurrentSection(sec)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-bold transition-all min-w-[2.5rem]",
                                        currentSection === sec
                                            ? "bg-indigo-600 text-white shadow-lg"
                                            : "text-zinc-400 hover:text-white"
                                    )}
                                >
                                    {sec}
                                </button>
                                {/* Delete Section Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec); }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center opacity-0 group-hover/sec:opacity-100 hover:scale-110 transition-all text-[8px]"
                                    title="Delete Section"
                                >
                                    x
                                </button>
                            </div>
                        ))}

                        {/* Add Section Input/Button */}
                        {isAddingSection ? (
                            <div className="flex items-center bg-black/20 rounded-lg px-2 py-1 gap-2 border border-white/10 animate-in fade-in slide-in-from-left-2">
                                <input
                                    autoFocus
                                    className="w-16 bg-transparent text-white text-xs p-1 outline-none border-b border-white/20 focus:border-indigo-500 transition-colors"
                                    placeholder="Name (A1)"
                                    value={newSectionName}
                                    onChange={e => setNewSectionName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                                />
                                {/* Type Selector */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setNewSectionType("Normal")}
                                        className={cn("w-2 h-2 rounded-full ring-1 ring-offset-1 ring-offset-zinc-900 transition-all", newSectionType === "Normal" ? "bg-indigo-500 ring-indigo-500" : "bg-zinc-600 ring-transparent")}
                                        title="Normal"
                                    />
                                    <button
                                        onClick={() => setNewSectionType("TPP")}
                                        className={cn("w-2 h-2 rounded-full ring-1 ring-offset-1 ring-offset-zinc-900 transition-all", newSectionType === "TPP" ? "bg-emerald-500 ring-emerald-500" : "bg-zinc-600 ring-transparent")}
                                        title="TPP"
                                    />
                                    <button
                                        onClick={() => setNewSectionType("NTPP")}
                                        className={cn("w-2 h-2 rounded-full ring-1 ring-offset-1 ring-offset-zinc-900 transition-all", newSectionType === "NTPP" ? "bg-amber-500 ring-amber-500" : "bg-zinc-600 ring-transparent")}
                                        title="NTPP"
                                    />
                                </div>
                                <button onClick={handleAddSection} className="text-indigo-400 hover:text-white px-1">
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsAddingSection(true)} className="px-2 py-1.5 text-zinc-500 hover:text-white transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={handleAutoGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-sm transition-all border border-white/10 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                        <Sparkles className="w-4 h-4" /> {isGenerating ? "Generating..." : "Auto Generate"}
                    </button>

                    <button
                        onClick={saveSchedule}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-all border border-white/10 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Changes"}
                    </button>

                    <div className="h-8 w-px bg-white/10 mx-1"></div>

                    <button onClick={() => setIsTimeEditorOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors border border-white/5">
                        <Settings className="w-4 h-4" /> Edit Timings
                    </button>
                    <div className="h-8 w-px bg-white/10 mx-1"></div>
                    <button onClick={() => handlePrint && handlePrint()} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-white/5" title="Print PDF">
                        <Printer className="w-5 h-5" />
                    </button>
                    <button onClick={handleExportExcel} className="p-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 rounded-lg transition-colors" title="Export Excel">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 2. Printable Area */}
            <div ref={componentRef} className="bg-white text-black p-8 rounded-xl shadow-xl min-h-[800px] print:p-0 print:shadow-none print:rounded-none">

                {/* Official Header */}
                <div className="text-center space-y-2 mb-8 border-b-2 border-black pb-4">
                    <input
                        className="text-3xl font-bold text-center w-full bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400 font-serif"
                        value={meta.orgName}
                        onChange={(e) => setMeta({ ...meta, orgName: e.target.value })}
                        placeholder="Organization Name"
                    />
                    <input
                        className="text-lg font-semibold text-center w-full bg-transparent border-none focus:ring-0 p-0"
                        value={meta.deptName}
                        onChange={(e) => setMeta({ ...meta, deptName: e.target.value })}
                    />

                    <div className="flex justify-between px-10 text-sm font-medium mt-4 font-serif">
                        <div className="flex gap-2 items-end">
                            <span>Branch:</span>
                            <input value={meta.branch} onChange={(e) => setMeta({ ...meta, branch: e.target.value })} className="border-b border-gray-400 w-32 focus:outline-none bg-transparent" />
                        </div>
                        <div className="flex gap-2 items-end">
                            <span>Section:</span>
                            <div className="border-b border-gray-400 w-16 text-center font-bold px-2">{currentSection}</div>
                        </div>
                        <div className="flex gap-2 items-end">
                            <span>Session:</span>
                            <input value={meta.academicYear} onChange={(e) => setMeta({ ...meta, academicYear: e.target.value })} className="border-b border-gray-400 w-24 focus:outline-none bg-transparent" />
                        </div>
                    </div>
                </div>

                {/* Timetable Grid */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2 w-24">Day / Time</th>
                                {times.map(t => (
                                    <th key={t} className="border border-black p-2 font-semibold min-w-[100px]">{t}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map(day => (
                                <tr key={day} className="h-24">
                                    <td className="border border-black p-2 font-bold bg-gray-50 text-center uppercase tracking-wider text-xs">{day}</td>
                                    {times.map((time, idx) => {
                                        if (isSlotBlockedByPractical(day, idx)) return null;

                                        const slot = getSlotForRender(day, time);
                                        const isPractical = slot?.type === "Practical";

                                        // Section Context
                                        const isTPPSection = currentSection.includes("(TPP)");
                                        const isNTPPSection = currentSection.includes("(NTPP)");

                                        // Styles
                                        let bgClass = "bg-white"; // default
                                        let tagClass = "hidden";
                                        let tagText = "";

                                        if (isPractical) {
                                            bgClass = "bg-pink-50";
                                            tagClass = "text-pink-600 bg-pink-100 border-pink-200";
                                            tagText = "LAB";
                                        }

                                        // Overrides based on Section Type
                                        if (isTPPSection) {
                                            if (!isPractical) {
                                                bgClass = "bg-emerald-50";
                                                tagClass = "text-emerald-600 bg-emerald-100 border-emerald-200";
                                                tagText = "TPP";
                                            } else {
                                                // Mixed look for TPP Lab?
                                                tagClass = "text-emerald-600 bg-pink-100 border-pink-200";
                                                tagText = "TPP LAB";
                                            }
                                        } else if (isNTPPSection) {
                                            if (!isPractical) {
                                                bgClass = "bg-amber-50";
                                                tagClass = "text-amber-600 bg-amber-100 border-amber-200";
                                                tagText = "NTPP";
                                            } else {
                                                tagClass = "text-amber-600 bg-pink-100 border-pink-200";
                                                tagText = "NTPP LAB";
                                            }
                                        }

                                        return (
                                            <td
                                                key={time}
                                                colSpan={isPractical ? 2 : 1}
                                                className={`border border-black p-0 relative hover:bg-gray-50 transition-colors cursor-pointer group valign-top
                                                    ${!slot && selectedSlot?.day === day && selectedSlot?.time === time ? 'bg-indigo-50' : ''}
                                                `}
                                                onClick={() => !slot && setSelectedSlot({ day, time })}
                                            >
                                                {slot ? (
                                                    <div className={`h-full w-full p-2 flex flex-col justify-between ${bgClass}`}>
                                                        {/* Actions */}
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 print:hidden z-10">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }}
                                                                className="text-red-500 hover:text-red-700 bg-white rounded-full p-0.5 shadow-sm"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-bold leading-tight">{slot.subject}</span>
                                                            <span className="text-xs text-gray-600 italic leading-tight">{slot.faculty}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <div className="text-[10px] font-mono border border-gray-300 px-1 rounded bg-white">
                                                                {slot.room}
                                                            </div>
                                                            <span className={cn("text-[9px] font-bold uppercase border px-1 rounded", tagClass)}>
                                                                {tagText}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <Plus className="w-4 h-4 text-gray-300" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-20 pt-8 print:break-inside-avoid">
                    {Object.entries(meta.signatures).map(([key, val]) => (
                        <div key={key} className="text-center group">
                            <input
                                value={val}
                                onChange={(e) => setMeta(prev => ({ ...prev, signatures: { ...prev.signatures, [key as any]: e.target.value } }))}
                                className="w-full text-center border-none focus:ring-0 mb-1 font-handwriting text-xl text-blue-900 placeholder-transparent group-hover:placeholder-gray-200"
                                placeholder="(Sign Here)"
                            />
                            <div className="border-t border-black pt-2 font-bold uppercase text-xs tracking-wider">
                                {key}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Add Session Overlay */}
            <AnimatePresence>
                {selectedSlot && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 p-6 rounded-xl w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            {/* Background Glow */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-400" />
                                Add Session
                            </h3>

                            <div className="space-y-5">
                                <div className="flex items-center justify-between text-sm text-zinc-400 bg-zinc-950/50 p-3 rounded-lg border border-white/5">
                                    <span>{selectedSlot.day}</span>
                                    <span className="font-mono text-zinc-200">{selectedSlot.time}</span>
                                    <span className="font-bold text-indigo-400">Sec {currentSection}</span>
                                </div>

                                {/* Type Toggle Grid */}
                                <div className="grid grid-cols-2 gap-2 bg-zinc-950/50 p-2 rounded-lg border border-white/5">
                                    <button
                                        onClick={() => setForm({ ...form, type: "Theory" })}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2 rounded-md transition-all text-xs font-bold uppercase",
                                            form.type === "Theory" ? "bg-indigo-600 text-white shadow" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                        )}
                                    >
                                        Theory
                                    </button>
                                    <button
                                        onClick={() => setForm({ ...form, type: "Practical" })}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2 rounded-md transition-all text-xs font-bold uppercase",
                                            form.type === "Practical" ? "bg-pink-600 text-white shadow" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                        )}
                                    >
                                        Practical
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1.5 ml-1">Subject</label>
                                        <input
                                            autoFocus
                                            className="w-full bg-zinc-800 border-zinc-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600"
                                            placeholder="e.g. Data Structures"
                                            value={form.subject}
                                            onChange={e => setForm({ ...form, subject: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1.5 ml-1">Faculty</label>
                                            <input
                                                className="w-full bg-zinc-800 border-zinc-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600"
                                                placeholder="e.g. Dr. Smith"
                                                value={form.faculty}
                                                onChange={e => setForm({ ...form, faculty: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1.5 ml-1">Room</label>
                                            <input
                                                className="w-full bg-zinc-800 border-zinc-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600"
                                                placeholder="e.g. 101"
                                                value={form.room}
                                                onChange={e => setForm({ ...form, room: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Warning Area */}
                                {conflictWarning && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm">
                                        <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                                        <div>
                                            <p className="font-bold text-orange-400 mb-1">Schedule Conflict</p>
                                            <p className="opacity-90">{conflictWarning}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                                    <button onClick={() => setSelectedSlot(null)} className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium">Cancel</button>
                                    <button onClick={handleAddSlot} className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors text-sm">
                                        {conflictWarning ? 'Ignore & Add' : 'Add Session'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 4. Time Editor Modal */}
            <AnimatePresence>
                {isTimeEditorOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 p-6 rounded-xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-zinc-400" />
                                    Edit Timings
                                </h3>
                                <button onClick={() => setIsTimeEditorOpen(false)} className="text-zinc-500 hover:text-white">Done</button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {times.map((t, idx) => (
                                    <div key={idx} className="flex gap-2 items-center group">
                                        <div className="w-8 text-zinc-600 text-xs font-mono">{idx + 1}</div>
                                        {editingTimeIndex === idx ? (
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    autoFocus
                                                    className="flex-1 bg-zinc-800 border-zinc-600 rounded px-2 py-1 text-white text-sm"
                                                    value={tempTimeVal}
                                                    onChange={e => setTempTimeVal(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleUpdateTime(idx)}
                                                />
                                                <button onClick={() => handleUpdateTime(idx)} className="text-green-500 hover:text-green-400 text-xs uppercase font-bold px-2">Save</button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 bg-zinc-800/50 border border-white/5 rounded px-3 py-2 text-zinc-300 text-sm flex justify-between items-center group-hover:bg-zinc-800 transition-colors">
                                                {t}
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingTimeIndex(idx); setTempTimeVal(t); }} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                                                    <button onClick={() => handleRemoveTime(idx)} className="text-red-500 hover:text-red-400 text-xs">Remove</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={handleAddTime}
                                    className="w-full py-3 border border-dashed border-zinc-700 text-zinc-500 rounded-lg hover:border-zinc-500 hover:text-zinc-300 transition-colors mt-4 flex justify-center gap-2 text-sm"
                                >
                                    <Plus className="w-4 h-4" /> Add New Time Slot
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

