import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SaaSLayout } from './layout/SaaSLayout';
import { Dashboard } from './pages/Dashboard';

import { Scheduler } from './pages/Scheduler';
import { AdminLayout } from './pages/Admin/AdminLayout';
import { FacultyManager } from './pages/Admin/FacultyManager';
import { RoomManager } from './pages/Admin/RoomManager';
import { SubjectManager } from './pages/Admin/SubjectManager';

function App() {
    return (
        <Router>
            <SaaSLayout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/scheduler" element={<Scheduler />} />

                    {/* Admin Routes */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route path="faculty" element={<FacultyManager />} />
                        <Route path="rooms" element={<RoomManager />} />
                        <Route path="subjects" element={<SubjectManager />} />
                        <Route index element={<Navigate to="faculty" replace />} />
                    </Route>
                    {/* Add more routes here later */}
                </Routes>
            </SaaSLayout>
        </Router>
    );
}

export default App;