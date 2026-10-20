import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  Tablet,
  RotateCcw,
  CheckCircle2,
  Activity,
  Filter,
  PhoneCall,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { NewPatientForm } from '../patient-registration/NewPatientForm';

interface QueueItem {
  id: string;
  name: string;
  age: number;
  gender: string;
  department: string;
  status: 'Ready for MD' | 'Checked In' | 'In Consult' | 'Intake Incomplete';
  waitTime: string;
  room: string;
  badgeColor: string;
}

interface KioskStation {
  id: string;
  name: string;
  status: 'In Intake' | 'Idle' | 'Needs Reset';
  currentPatient?: string;
  lastActive: string;
}

export const StaffOperationsHub: React.FC = () => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  const [queue, setQueue] = useState<QueueItem[]>([
    {
      id: 'q-01',
      name: 'Eleanor Johnson',
      age: 58,
      gender: 'F',
      department: 'Cardiology',
      status: 'Ready for MD',
      waitTime: '12m',
      room: 'Room 402',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    },
    {
      id: 'q-02',
      name: 'David Kim',
      age: 46,
      gender: 'M',
      department: 'Internal Medicine',
      status: 'Checked In',
      waitTime: '4m',
      room: 'Waiting Pod B',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'q-03',
      name: 'Sarah Lin',
      age: 8,
      gender: 'F',
      department: 'Pediatrics',
      status: 'In Consult',
      waitTime: '20m',
      room: 'Exam Room 104',
      badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    },
    {
      id: 'q-04',
      name: 'Marcus Vance',
      age: 39,
      gender: 'M',
      department: 'Orthopedics',
      status: 'Intake Incomplete',
      waitTime: '1m',
      room: 'Kiosk Station 03',
      badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    },
  ]);

  const [kiosks, setKiosks] = useState<KioskStation[]>([
    { id: 'k-01', name: 'Kiosk Station 01', status: 'In Intake', currentPatient: 'Eleanor Johnson', lastActive: '2m ago' },
    { id: 'k-02', name: 'Kiosk Station 02', status: 'Idle', lastActive: '5m ago' },
    { id: 'k-03', name: 'Kiosk Station 03', status: 'In Intake', currentPatient: 'Marcus Vance', lastActive: 'Just now' },
    { id: 'k-04', name: 'Kiosk Station 04', status: 'Needs Reset', lastActive: '14m ago' },
  ]);

  const [auditLogs, setAuditLogs] = useState<string[]>([
    '10:14 — Eleanor Johnson identity confirmed via secondary DOB verification.',
    '10:02 — Appointment Slot #402 booked for David Kim (Cardiology Clinic).',
    '09:55 — New walk-in registered: Sarah Lin (Accompanied by guardian).',
    '09:41 — Kiosk Station 02 session auto-reset after intake completion.',
  ]);

  const handleResetKiosk = (kioskId: string) => {
    setKiosks((prev) =>
      prev.map((k) => (k.id === kioskId ? { ...k, status: 'Idle', currentPatient: undefined, lastActive: 'Just now' } : k))
    );
    const station = kiosks.find((k) => k.id === kioskId)?.name || kioskId;
    setAuditLogs((prev) => [`${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${station} remotely reset to clean welcome state by staff.`, ...prev]);
    showNotification(`${station} reset successfully.`);
  };

  const handleCallPatient = (name: string, room: string) => {
    showNotification(`Called ${name} to ${room}.`);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredQueue = selectedDept === 'all' ? queue : queue.filter((q) => q.department.toLowerCase().includes(selectedDept.toLowerCase()));

  return (
    <div data-testid="staff-operations-hub" className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            data-testid="staff-notification-banner"
            className="fixed top-20 right-8 z-50 bg-emerald-500/90 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-xl border border-emerald-400 flex items-center space-x-2 text-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Operational Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-[#0a1020]/80 border border-white/10 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Patients Waiting</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">7</div>
          <div className="text-[11px] text-cyan-400 mt-1 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Avg wait: 4.2 mins</span>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-[#0a1020]/80 border border-white/10 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">In Consultation</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">3</div>
          <div className="text-[11px] text-emerald-400 mt-1">Dr. Chen, Dr. Vance, Dr. Brody</div>
        </div>

        <div className="rounded-2xl p-4 bg-[#0a1020]/80 border border-white/10 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Kiosk Fleet</span>
            <Tablet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">4 / 4</div>
          <div className="text-[11px] text-amber-400 mt-1">2 in-use • 1 idle • 1 reset needed</div>
        </div>

        <div className="rounded-2xl p-4 bg-[#0a1020]/80 border border-white/10 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Walk-in Assistant</span>
            <UserPlus className="w-4 h-4 text-teal-400" />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRegisterOpen(true)}
            data-testid="btn-staff-register-walkin"
            className="w-full mt-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-md"
          >
            + Register Walk-In
          </Button>
        </div>
      </div>

      {/* 2. Main Section: Queue Management & Kiosk Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Queue Management Table */}
        <div className="lg:col-span-8 rounded-3xl p-5 sm:p-6 bg-[#080d1a]/85 border border-white/10 backdrop-blur-2xl shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Front-Desk Patient Triage Queue</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  {filteredQueue.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time clinic waiting queue with department routing and calling actions.
              </p>
            </div>

            {/* Department Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-[#050811] border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-cyan-500"
              >
                <option value="all">All Departments</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
              </select>
            </div>
          </div>

          {/* Queue List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Wait</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.age}y • {item.gender}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-300">{item.department}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${item.badgeColor}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{item.waitTime}</td>
                    <td className="py-3 px-3 text-slate-400">{item.room}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleCallPatient(item.name, item.room)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition-all inline-flex items-center space-x-1 cursor-pointer"
                        title={`Call ${item.name} to ${item.room}`}
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Kiosk Fleet Status & Operational Audit Log */}
        <div className="lg:col-span-4 space-y-6">
          {/* Kiosk Fleet Health */}
          <div className="rounded-3xl p-5 bg-[#080d1a]/85 border border-white/10 backdrop-blur-2xl shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Tablet className="w-4 h-4 text-amber-400" />
                <span>Kiosk Station Fleet</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">4 Online</span>
            </div>

            <div className="space-y-2.5">
              {kiosks.map((k) => (
                <div
                  key={k.id}
                  className="rounded-2xl p-3 bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center space-x-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          k.status === 'In Intake'
                            ? 'bg-cyan-400 animate-pulse'
                            : k.status === 'Idle'
                            ? 'bg-emerald-400'
                            : 'bg-rose-400 animate-bounce'
                        }`}
                      />
                      <span>{k.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {k.currentPatient ? `Active: ${k.currentPatient}` : `Status: ${k.status}`} • {k.lastActive}
                    </div>
                  </div>

                  {k.status === 'Needs Reset' ? (
                    <button
                      type="button"
                      onClick={() => handleResetKiosk(k.id)}
                      data-testid={`btn-reset-${k.id}`}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleResetKiosk(k.id)}
                      className="px-2 py-0.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 text-[10px] transition-colors"
                      title="Clear session"
                    >
                      Reset
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Operational Audit Log */}
          <div className="rounded-3xl p-5 bg-[#080d1a]/85 border border-white/10 backdrop-blur-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Operational Audit Log</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-400">Encrypted</span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-400 font-mono">
              {auditLogs.slice(0, 5).map((log, i) => (
                <div key={i} className="p-2 rounded-xl bg-white/[0.015] border border-white/5 leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Walk-In Registration Modal */}
      <Dialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Front-Desk Walk-In Patient Registration"
      >
        <NewPatientForm
          onRegistered={(patient) => {
            setIsRegisterOpen(false);
            setQueue((prev) => [
              {
                id: `q-${Date.now()}`,
                name: patient.name,
                age: 35,
                gender: 'M',
                department: 'General Triage',
                status: 'Checked In',
                waitTime: '1m',
                room: 'Waiting Pod C',
                badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
              },
              ...prev,
            ]);
            showNotification(`Registered walk-in patient: ${patient.name}`);
            setAuditLogs((prev) => [
              `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — Walk-in registered: ${patient.name}.`,
              ...prev,
            ]);
          }}
          onCancel={() => setIsRegisterOpen(false)}
        />
      </Dialog>
    </div>
  );
};
