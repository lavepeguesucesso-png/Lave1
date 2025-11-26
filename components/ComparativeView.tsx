import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Transaction, CycleType, PrintProps } from '../types';
import { GitCompare, CalendarDays, Clock, Filter, Droplets, Sun } from 'lucide-react';

interface ComparativeViewProps extends PrintProps {
  selfServiceTransactions: Transaction[];
  attendantTransactions: Transaction[];
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const ComparativeView: React.FC<ComparativeViewProps> = ({ 
  selfServiceTransactions, 
  attendantTransactions,
  printMode = false
}) => {
  const [activeFilter, setActiveFilter] = useState<'BOTH' | 'SELF' | 'ATTENDANT'>('BOTH');

  // --- 1. Existing Comparison Logic (Self vs Attendant) ---
  const { hourlyData, weeklyData } = useMemo(() => {
    // Initialize Hourly 0-23
    const hourly = new Array(24).fill(0).map((_, i) => ({
      label: `${i}h`,
      selfService: 0,
      attendant: 0,
    }));

    // Initialize Weekly 0-6
    const weekly = new Array(7).fill(0).map((_, i) => ({
      label: DAY_LABELS[i],
      selfService: 0,
      attendant: 0,
    }));

    // Populate Self Service
    selfServiceTransactions.forEach(t => {
      const h = t.date.getHours();
      if (h >= 0 && h < 24) hourly[h].selfService++;
      
      const d = t.dayOfWeek;
      if (d >= 0 && d < 7) weekly[d].selfService++;
    });

    // Populate Attendant
    attendantTransactions.forEach(t => {
      const h = t.date.getHours();
      if (h >= 0 && h < 24) hourly[h].attendant++;

      const d = t.dayOfWeek;
      if (d >= 0 && d < 7) weekly[d].attendant++;
    });

    return { hourlyData: hourly, weeklyData: weekly };
  }, [selfServiceTransactions, attendantTransactions]);


  // --- 2. New Logic: Wash vs Dry Detailed Analysis ---
  const washDryData = useMemo(() => {
    // Filter source based on selection
    let sourceTransactions: Transaction[] = [];
    
    if (activeFilter === 'SELF') {
        sourceTransactions = selfServiceTransactions;
    } else if (activeFilter === 'ATTENDANT') {
        sourceTransactions = attendantTransactions;
    } else {
        sourceTransactions = [...selfServiceTransactions, ...attendantTransactions];
    }

    // Initialize buckets
    const hourly = new Array(24).fill(0).map((_, i) => ({ label: `${i}h`, wash: 0, dry: 0 }));
    const weekly = new Array(7).fill(0).map((_, i) => ({ label: DAY_LABELS[i], wash: 0, dry: 0 }));

    // Aggregate
    sourceTransactions.forEach(t => {
        const isWash = t.type === CycleType.WASH;
        const isDry = t.type === CycleType.DRY;
        
        if (!isWash && !isDry) return; // Skip unknown

        // Hourly
        const h = t.date.getHours();
        if (h >= 0 && h < 24) {
            if (isWash) hourly[h].wash++;
            else hourly[h].dry++;
        }

        // Weekly
        const d = t.dayOfWeek;
        if (d >= 0 && d < 7) {
            if (isWash) weekly[d].wash++;
            else weekly[d].dry++;
        }
    });

    return { hourly, weekly };
  }, [activeFilter, selfServiceTransactions, attendantTransactions]);

  const animationProps = { isAnimationActive: !printMode };

  return (
    <div className={`max-w-6xl mx-auto ${printMode ? 'px-0 py-4' : 'px-4 py-6 space-y-8 pb-20'}`}>
      
      {/* Main Title Bar */}
      <div className={`bg-white border-2 border-slate-200 rounded-lg p-4 flex items-center gap-3 shadow-sm ${printMode ? 'mb-6' : ''}`}>
        <div className="p-2 bg-slate-100 rounded-full">
            <GitCompare className="w-6 h-6 text-slate-600" />
        </div>
        <div>
            <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">
                Relatório Comparativo
            </h1>
            <p className="text-sm text-slate-500">Análise cruzada de demanda entre serviços</p>
        </div>
      </div>

      {/* --- SECTION 1: SELF vs ATTENDANT (General) --- */}
      <div className={`grid grid-cols-1 gap-8 ${printMode ? 'mb-8' : ''}`}>
        {/* Hourly Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm break-inside-avoid">
            <div className="mb-6 flex items-center gap-2">
                <div className="p-2 bg-pink-50 rounded-lg">
                    <Clock className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                    Demanda por Horário: Self Service vs Atendente
                </h3>
            </div>

            <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="label" 
                    tick={{fontSize: 12, fill: '#64748b'}} 
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={0}
                />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                {!printMode && <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
                />}
                <Legend />
                <Line 
                    type="monotone" dataKey="selfService" name="Self Service" stroke="#ec4899" strokeWidth={3}
                    dot={{ r: 3, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }}
                    {...animationProps}
                />
                <Line 
                    type="monotone" dataKey="attendant" name="Atendente" stroke="#2dd4bf" strokeWidth={3}
                    dot={{ r: 3, fill: '#2dd4bf', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }}
                    {...animationProps}
                />
                </LineChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* Weekly Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm break-inside-avoid">
            <div className="mb-6 flex items-center gap-2">
                <div className="p-2 bg-purple-50 rounded-lg">
                    <CalendarDays className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                    Demanda por Dia da Semana: Self Service vs Atendente
                </h3>
            </div>

            <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="label" 
                    tick={{fontSize: 12, fill: '#64748b'}} 
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                {!printMode && <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
                />}
                <Legend />
                <Line 
                    type="monotone" dataKey="selfService" name="Self Service" stroke="#ec4899" strokeWidth={3}
                    dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }}
                    {...animationProps}
                />
                <Line 
                    type="monotone" dataKey="attendant" name="Atendente" stroke="#2dd4bf" strokeWidth={3}
                    dot={{ r: 4, fill: '#2dd4bf', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }}
                    {...animationProps}
                />
                </LineChart>
            </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className={`border-t border-slate-200 my-8 ${printMode ? 'hidden' : ''}`}></div>

      {/* --- SECTION 2: WASH VS DRY DETAILED ANALYSIS --- */}
      <div className="space-y-6">
        
        {/* Section Header with Filters - Hide filters in print mode */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 break-inside-avoid">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-full">
                    <Filter className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Análise Detalhada: Lavar vs Secar</h2>
                    <p className="text-sm text-slate-500">Entenda o comportamento de uso específico por tipo de ciclo</p>
                </div>
            </div>

            {/* Filter Controls - Hidden in print mode */}
            {!printMode && (
                <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium no-print">
                    <button 
                        onClick={() => setActiveFilter('SELF')}
                        className={`px-4 py-2 rounded-md transition-all ${activeFilter === 'SELF' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Self Service
                    </button>
                    <button 
                        onClick={() => setActiveFilter('ATTENDANT')}
                        className={`px-4 py-2 rounded-md transition-all ${activeFilter === 'ATTENDANT' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Atendente
                    </button>
                    <button 
                        onClick={() => setActiveFilter('BOTH')}
                        className={`px-4 py-2 rounded-md transition-all ${activeFilter === 'BOTH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Ambos
                    </button>
                </div>
            )}
        </div>

        {/* Charts Grid for Wash vs Dry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Hourly Wash vs Dry */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-wider flex items-center justify-between">
                    <span>Por Horário (0h - 23h)</span>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 normal-case font-normal">
                        {activeFilter === 'BOTH' ? 'Dados Unificados' : activeFilter === 'SELF' ? 'Apenas Self Service' : 'Apenas Atendente'}
                    </span>
                </h3>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={washDryData.hourly}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{fontSize: 10}} axisLine={false} tickLine={false} interval={2} />
                            {!printMode && <Tooltip contentStyle={{borderRadius: '8px'}} />}
                            <Legend wrapperStyle={{paddingTop: '10px'}} />
                            {/* Blue for Water (Wash) */}
                            <Line type="monotone" dataKey="wash" name="Lavar" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{r: 6}} {...animationProps} />
                            {/* Orange for Heat (Dry) */}
                            <Line type="monotone" dataKey="dry" name="Secar" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{r: 6}} {...animationProps} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Weekly Wash vs Dry */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-wider flex items-center justify-between">
                    <span>Por Dia da Semana</span>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 normal-case font-normal">
                        {activeFilter === 'BOTH' ? 'Dados Unificados' : activeFilter === 'SELF' ? 'Apenas Self Service' : 'Apenas Atendente'}
                    </span>
                </h3>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={washDryData.weekly}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                            {!printMode && <Tooltip contentStyle={{borderRadius: '8px'}} />}
                            <Legend wrapperStyle={{paddingTop: '10px'}} />
                            {/* Blue for Water (Wash) */}
                            <Line type="monotone" dataKey="wash" name="Lavar" stroke="#3b82f6" strokeWidth={2} dot={{r:4}} {...animationProps} />
                            {/* Orange for Heat (Dry) */}
                            <Line type="monotone" dataKey="dry" name="Secar" stroke="#f97316" strokeWidth={2} dot={{r:4}} {...animationProps} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Legend/Info Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 break-inside-avoid">
            <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm">
                    <Droplets className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-700">Linha Azul (Lavar)</p>
                    <p className="text-xs text-slate-500">Indica o volume de ciclos de lavagem.</p>
                </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg flex items-center gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm">
                    <Sun className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-700">Linha Laranja (Secar)</p>
                    <p className="text-xs text-slate-500">Indica o volume de ciclos de secagem.</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};