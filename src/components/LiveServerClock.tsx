import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Radio } from 'lucide-react';
import { apiService } from '../services/api';

interface LiveServerClockProps {
  variant?: 'compact' | 'badge' | 'full';
  className?: string;
}

export const LiveServerClock: React.FC<LiveServerClockProps> = ({
  variant = 'compact',
  className = ''
}) => {
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSynced, setIsSynced] = useState<boolean>(false);

  // Sync with server on mount
  useEffect(() => {
    let isMounted = true;
    const syncTime = async () => {
      try {
        const start = Date.now();
        const serverData = await apiService.getServerTime();
        const latency = (Date.now() - start) / 2;
        const serverNow = serverData.timestamp + latency;
        const offset = serverNow - Date.now();
        if (isMounted) {
          setServerOffset(offset);
          setIsSynced(true);
        }
      } catch (err) {
        console.warn('Could not sync with server time, using client clock:', err);
      }
    };

    syncTime();

    // Re-sync every 5 minutes
    const syncInterval = setInterval(syncTime, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
    };
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date(Date.now() + serverOffset));
    }, 1000);

    return () => clearInterval(timer);
  }, [serverOffset]);

  // Format date and time according to Asia/Jakarta (WIB) in Indonesian
  const hariFormatter = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    timeZone: 'Asia/Jakarta'
  });

  const tanggalFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });

  const jamFormatter = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });

  const namaHari = hariFormatter.format(currentTime);
  const tanggalLengkap = tanggalFormatter.format(currentTime);
  const jamLengkap = jamFormatter.format(currentTime).replace(/\./g, ':');

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-amber-300 font-bold">{namaHari},</span>
          <span className="text-slate-200">{tanggalLengkap}</span>
        </div>
        <span className="hidden sm:inline text-slate-600 dark:text-slate-700">|</span>
        <div className="flex items-center gap-1.5 bg-slate-800/90 dark:bg-black/60 px-2.5 py-1 rounded-lg border border-slate-700/80 font-mono font-bold text-emerald-300 tracking-wider shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <span>{jamLengkap}</span>
          <span className="text-[10px] text-emerald-400 font-sans font-black">WIB</span>
        </div>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs ${className}`}>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
            <span className="text-blue-600 dark:text-blue-400 font-bold">{namaHari},</span>
            <span>{tanggalLengkap}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[10px]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Waktu Server RT 001</span>
          </div>
        </div>
        <div className="font-mono text-sm font-black text-slate-900 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs tracking-wider flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
          <span>{jamLengkap}</span>
          <span className="text-[10px] font-sans font-bold text-blue-600 dark:text-emerald-400">WIB</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/80 dark:bg-slate-900/95 border border-white/15 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 text-white shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {/* Left info: Hari, Tanggal, Bulan, Tahun */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
              {namaHari},
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-100">
              {tanggalLengkap}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Waktu Server RT 001 (WIB - UTC+7)</span>
          </div>
        </div>
      </div>

      {/* Right info: Live Digital Jam:Menit:Detik */}
      <div className="flex items-center gap-2.5 bg-black/40 dark:bg-black/60 px-3.5 py-2 rounded-xl border border-white/10">
        <Clock className="w-4 h-4 text-emerald-400 animate-spin-slow shrink-0" />
        <div className="font-mono text-base sm:text-lg font-black tracking-widest text-emerald-300">
          {jamLengkap}
          <span className="text-[11px] font-sans font-bold text-emerald-400/80 ml-1.5">WIB</span>
        </div>
      </div>
    </div>
  );
};
