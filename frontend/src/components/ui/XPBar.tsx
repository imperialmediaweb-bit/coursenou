import { useState, useEffect } from 'react';
import api from '../../services/api';

interface GamificationStats {
  xp: number;
  level: number;
  streak: number;
  nextLevelXp: number;
  currentLevelXp: number;
}

export default function XPBar() {
  const [stats, setStats] = useState<GamificationStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/gamification/stats');
        setStats(res.data.data || res.data);
      } catch {
        // silent
      }
    };
    fetchStats();
  }, []);

  if (!stats) return null;

  const progress = stats.nextLevelXp > stats.currentLevelXp
    ? ((stats.xp - stats.currentLevelXp) / (stats.nextLevelXp - stats.currentLevelXp)) * 100
    : 100;

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Level badge */}
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-bold text-sm">L{stats.level}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Level {stats.level}</p>
            <p className="text-muted text-xs">{stats.xp} XP total</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Streak */}
          {stats.streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <span className="text-orange-400 text-sm">🔥</span>
              <span className="text-orange-400 text-xs font-semibold">{stats.streak} day streak</span>
            </div>
          )}
        </div>
      </div>
      {/* XP progress bar */}
      <div className="relative">
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-glow rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted">{stats.currentLevelXp} XP</span>
          <span className="text-[10px] text-muted">{stats.nextLevelXp} XP</span>
        </div>
      </div>
    </div>
  );
}
