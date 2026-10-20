import React, { useState } from 'react';
import { VolunteerTask } from '../../types';
import { Users, CheckCircle2, Clock, MapPin, Award, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Badge } from '../common/Badge';

interface VolunteerDashboardProps {
  tasks: VolunteerTask[];
  onClaimTask: (taskId: string) => void;
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({ tasks, onClaimTask }) => {
  const [joinedTasks, setJoinedTasks] = useState<string[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(true);

  const handleJoin = (taskId: string) => {
    onClaimTask(taskId);
    setJoinedTasks(prev => [...prev, taskId]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header with Volunteer ID Status */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-warm-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-slate-900">Volunteer Rapid Response Network</h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-forest-100 text-forest-800 border border-forest-200">
                Civil Defence Allied
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified ground community volunteers executing localized relief and distribution missions
            </p>
          </div>
        </div>

        {/* Volunteer Duty Status Toggle */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-500 block">Duty Readiness</span>
            <span className="text-xs font-bold text-slate-800">{isCheckedIn ? 'Active on Field' : 'Off-Duty'}</span>
          </div>
          <button
            onClick={() => setIsCheckedIn(!isCheckedIn)}
            className={`px-4 py-2 rounded text-xs font-bold transition-all shadow-sm ${
              isCheckedIn
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            {isCheckedIn ? '✓ Checked In (Active)' : 'Check In for Duty'}
          </button>
        </div>
      </div>

      {/* Quick Community Impact Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-xs block">Active Field Volunteers</span>
            <span className="font-bold text-lg text-slate-900 font-mono">148 Mobilized</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warm-100 text-warm-800 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-xs block">Average Shift Duration</span>
            <span className="font-bold text-lg text-slate-900 font-mono">3.2 Hours</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-xs block">Relief Kits Distributed</span>
            <span className="font-bold text-lg text-slate-900 font-mono">2,410 Delivered</span>
          </div>
        </div>
      </div>

      {/* Available Micro-Tasks Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Urgent Field Tasks Requiring Volunteers</h3>
            <p className="text-xs text-slate-500">Pick a task matching your current location and physical availability</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tasks.map(task => {
            const isFull = task.assignedVolunteersCount >= task.requiredVolunteers;
            const hasJoined = joinedTasks.includes(task.id);

            return (
              <div
                key={task.id}
                className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {task.category.replace('_', ' ')}
                    </span>
                    <Badge urgency={task.urgency} size="sm" />
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{task.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{task.description}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-800">{task.locationName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Estimated Duration: {task.timeEstimate}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Quota</span>
                    <span className="font-mono font-bold text-slate-800">
                      {task.assignedVolunteersCount} / {task.requiredVolunteers} Assigned
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-forest-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (task.assignedVolunteersCount / task.requiredVolunteers) * 100)}%` }}
                    />
                  </div>

                  <button
                    onClick={() => handleJoin(task.id)}
                    disabled={isFull || hasJoined}
                    className={`w-full py-2 rounded text-xs font-bold transition-all shadow-sm ${
                      hasJoined
                        ? 'bg-emerald-100 text-emerald-800 cursor-default'
                        : isFull
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-forest-800 hover:bg-forest-900 text-white'
                    }`}
                  >
                    {hasJoined ? '✓ Enrolled in Task' : isFull ? 'Task Quota Filled' : 'Volunteer for this Task'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
