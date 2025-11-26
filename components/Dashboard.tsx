import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Transaction, CycleType, DailyMetric, HourlyMetric, DashboardMetadata, PrintProps } from '../types';
import { WashingMachine, Wind, Calendar, Activity, ArrowLeft, TrendingUp } from 'lucide-react';

interface DashboardProps extends PrintProps {
  transactions: Transaction[];
  metadata: DashboardMetadata;
  onReset?: () => void;
  hideHeader?: boolean;
}

const DAY_NAMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  metadata, 
  onReset, 
  hideHeader = false,
  printMode = false
}) => {

  const isAttendant = metadata.reportType === 'ATTENDANT';
  
  // Theme Colors
  const COLORS = {
    wash: isAttendant ? '#9333ea' : '#ec4899', // Purple-600 vs Pink-500
    dry: isAttendant ? '#3b82f6' : '#2dd4bf',  // Blue-500 vs Teal-400
    primary: isAttendant ? 'text-purple-600' : 'text-pink-500',
    border: isAttendant ? 'border-purple-500' : 'border-pink-500',
    bg: isAttendant ? 'bg-purple-500' : 'bg-pink-500',
    lightBg: isAttendant ? 'bg-purple-50' : 'bg-pink-50',
  };

  // --- Metrics Calculation ---
  const stats = useMemo(() => {
    let totalRev = 0;
    let washCount = 0;
    let dryCount = 0;
    
    // Hourly & Daily Maps
    const hourlyMap = new Array(24).fill(0).map((_, i) => ({ hour: i, count: 0, revenue: 0 }));
    const dayOfWeekMap = new Array(7).fill(0).map((_, i) => ({ dayIndex: i, name: DAY_NAMES[i], count: 0 }));
    const machineMap = new Map<string, number>();
    const uniqueDays = new Set<string>();

    const dailyMap = new Map<string, DailyMetric>();

    transactions.forEach(t => {
      totalRev += t.amount;
      uniqueDays.add(t.rawDate);

      if (t.type === CycleType.WASH) washCount++;
      if (t.type === CycleType.DRY) dryCount++;

      // Machine Usage
      machineMap.set(t.machine, (machineMap.get(t.machine) || 0) + 1);

      // Hourly
      const hour = t.date.getHours();
      if (hour >= 0 && hour < 24) {
        hourlyMap[hour].count++;
      }

      // Day of Week
      const dayIndex = t.dayOfWeek;
      dayOfWeekMap[dayIndex].count++;

      // Daily Aggregation for Chart
      if (!dailyMap.has(t.rawDate)) {
        dailyMap.set(t.rawDate, { 
          date: t.rawDate, 
          revenue: 0, 
          washCount: 0, 
          dryCount: 0, 
          totalCount: 0,
          dayOfWeek: t.dayOfWeek
        });
      }
      const day = dailyMap.get(t.rawDate)!;
      day.totalCount++;
      if (t.type === CycleType.WASH) day.washCount++;
      if (t.type === CycleType.DRY) day.dryCount++;
    });

    // Sort Daily data by Date object
    const dailyData = Array.from(dailyMap.values()).sort((a, b) => {
        const [dA, mA, yA] = a.date.split('/').map(Number);
        const [dB, mB, yB] = b.date.split('/').map(Number);
        return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
    });

    // Ranking Data
    const rankingData = Array.from(machineMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Insights Generation
    const peakHour = hourlyMap.reduce((max, curr) => curr.count > max.count ? curr : max, { hour: 0, count: 0 });
    
    // Weekend vs Weekday
    const weekendCount = dayOfWeekMap[0].count + dayOfWeekMap[6].count;
    const fdsPercentage = transactions.length > 0 ? ((weekendCount / transactions.length) * 100).toFixed(1) : '0.0';

    const topMachine = rankingData.length > 0 ? rankingData[0] : { name: 'N/A', count: 0 };
    
    const daysDivisor = uniqueDays.size || 1;
    const avgPerDay = (transactions.length / daysDivisor).toFixed(1);

    return {
      totalRevenue: totalRev,
      totalCycles: transactions.length,
      washCount,
      dryCount,
      dailyData,
      hourlyData: hourlyMap,
      dayOfWeekData: dayOfWeekMap,
      rankingData,
      insights: {
        peakHour: peakHour.hour,
        fdsPercentage,
        topMachine,
        avgPerDay
      }
    };
  }, [transactions]);

  const pieData = [
    { name: 'Lavar', value: stats.washCount },
    { name: 'Secar', value: stats.dryCount },
  ];

  // Printing: Disable animations
  const animationProps = { isAnimationActive: !printMode };

  return (
    <div className={`bg-white font-sans text-slate-900 ${printMode ? '' : 'pb-12'}`}>
      {/* Top Navigation / Reset - Only show if hideHeader is false and NOT printing */}
      {!hideHeader && !printMode && (
        <div className="border-b border-slate-200 bg-white no-print">
          <div className="max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <button onClick={onReset} className={`hover:${COLORS.primary} flex items-center gap-1`}>
                      <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
              </div>
          </div>
        </div>
      )}

      <div className={`max-w-6xl mx-auto ${printMode ? 'px-0 py-4' : 'px-4 py-6 space-y-6'}`}>
        
        {/* Header Information */}
        <div className={`border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex justify-between items-start ${printMode ? 'mb-4' : ''}`}>
            <div className="space-y-2">
                <div className={`flex items-center gap-2 ${COLORS.primary}`}>
                    <Activity className="w-5 h-5"/>
                    <h2 className="text-lg font-bold text-slate-800">Cabeçalho</h2>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                    <p><span className="font-semibold text-slate-900">Unidade:</span> {metadata.unitName}</p>
                    <p><span className="font-semibold text-slate-900">Período:</span> {metadata.period}</p>
                </div>
            </div>
            <div className="text-right hidden md:block">
               <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${COLORS.border} ${COLORS.primary} bg-white`}>
                  {isAttendant ? 'RELATÓRIO ATENDENTE' : 'RELATÓRIO SELF-SERVICE'}
               </span>
            </div>
        </div>

        {/* Title Bar */}
        <div className={`bg-white border-2 ${COLORS.border} rounded-lg p-3 ${printMode ? 'mb-4' : ''}`}>
            <h1 className={`text-xl font-bold ${COLORS.primary} uppercase tracking-wide`}>
                {isAttendant ? 'SERVIÇO DE ATENDENTE' : 'SELF SERVICE'}
            </h1>
        </div>

        {/* KPI Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${printMode ? 'mb-6' : ''}`}>
            <KpiCard 
                title="CICLOS TOTAIS" 
                value={stats.totalCycles} 
                icon={<TrendingUp className={`w-5 h-5 ${COLORS.primary}`} />} 
                subText=""
                bgColor={COLORS.lightBg}
            />
             <KpiCard 
                title="LAVAGENS" 
                value={stats.washCount} 
                icon={<WashingMachine className={`w-5 h-5 ${COLORS.primary}`} />} 
                subText=""
                bgColor={COLORS.lightBg}
            />
             <KpiCard 
                title="SECAGENS" 
                value={stats.dryCount} 
                icon={<Wind className={`w-5 h-5 ${COLORS.primary}`} />} 
                subText=""
                bgColor={COLORS.lightBg}
            />
             <KpiCard 
                title="MÉDIA/DIA" 
                value={stats.insights.avgPerDay} 
                icon={<Calendar className={`w-5 h-5 ${COLORS.primary}`} />} 
                subText={`Ciclos totais / ${stats.dailyData.length} dias`}
                bgColor={COLORS.lightBg}
            />
        </div>

        {/* Insights Section */}
        <div className={`bg-white p-6 rounded-xl border border-slate-100 shadow-sm ${printMode ? 'mb-6' : ''}`}>
            <h3 className={`flex items-center gap-2 ${COLORS.primary} font-bold mb-4`}>
                <div className={`w-3 h-3 ${COLORS.bg} rounded-sm`}></div>
                Insights Principais
            </h3>
            <ul className="space-y-2 text-slate-600 text-sm list-disc pl-5">
                <li>Pico de uso às {stats.insights.peakHour}h.</li>
                <li>FDS responde por {stats.insights.fdsPercentage}% dos ciclos.</li>
                <li>Distribuição: {stats.washCount} lavagens vs {stats.dryCount} secagens.</li>
                <li>Máquina destaque: {stats.insights.topMachine.name} ({stats.insights.topMachine.count} usos).</li>
                <li>Média de {stats.insights.avgPerDay} ciclos/dia útil.</li>
            </ul>
        </div>

        {/* Ranking Table */}
        <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${printMode ? 'mb-6 break-inside-avoid' : ''}`}>
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-700">Ranking de Máquinas</h3>
            </div>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                        <th className="px-6 py-3 font-normal">Máquina</th>
                        <th className="px-6 py-3 font-normal text-right">Usos</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.rankingData.map((m, idx) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-700">{m.name}</td>
                            <td className="px-6 py-3 text-right text-slate-900 font-medium">{m.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Detailed Tables Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${printMode ? 'mb-6 break-inside-avoid' : ''}`}>
            
            {/* Hourly Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                    <h3 className="font-bold text-slate-700">Ciclos por Hora (0h-23h)</h3>
                </div>
                {/* In print mode, remove max-height to show all rows */}
                <div className={printMode ? '' : 'max-h-[300px] overflow-y-auto'}>
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white shadow-sm">
                            <tr className="border-b border-slate-100 text-left text-slate-500">
                                <th className="px-6 py-2 font-normal">Hora</th>
                                <th className="px-6 py-2 font-normal text-right">Ciclos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.hourlyData.map((h) => (
                                <tr key={h.hour} className="border-b border-slate-50 last:border-0">
                                    <td className="px-6 py-2 text-slate-700">{h.hour}</td>
                                    <td className="px-6 py-2 text-right text-slate-900">{h.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Weekday Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                    <h3 className="font-bold text-slate-700">Ciclos por Dia da Semana</h3>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 text-left text-slate-500">
                            <th className="px-6 py-3 font-normal">Dia da Semana</th>
                            <th className="px-6 py-3 font-normal text-right">Ciclos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.dayOfWeekData.map((d) => (
                            <tr key={d.dayIndex} className="border-b border-slate-50 last:border-0">
                                <td className="px-6 py-3 text-slate-700 capitalize">{d.name}</td>
                                <td className="px-6 py-3 text-right text-slate-900">{d.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Charts Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${printMode ? 'mb-6 break-inside-avoid' : ''}`}>
            
            {/* Hourly Distribution */}
            <div className="bg-white p-4 border border-slate-100 rounded-lg">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Distribuição por Hora</h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="hour" 
                                tick={{fontSize: 10, fill: '#64748b'}} 
                                tickLine={false} 
                                axisLine={false}
                                interval={2}
                            />
                            <YAxis hide />
                            {!printMode && <Tooltip 
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                cursor={{fill: isAttendant ? '#f3e8ff' : '#fce7f3'}}
                            />}
                            <Bar dataKey="count" fill={COLORS.wash} radius={[2, 2, 0, 0]} {...animationProps} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Daily Distribution */}
            <div className="bg-white p-4 border border-slate-100 rounded-lg">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Distribuição por Dia</h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.dayOfWeekData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="name" 
                                tickFormatter={(val) => val.substring(0,3)}
                                tick={{fontSize: 10, fill: '#64748b'}} 
                                tickLine={false} 
                                axisLine={false}
                            />
                            <YAxis hide />
                            {!printMode && <Tooltip 
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                cursor={{fill: isAttendant ? '#dbeafe' : '#ccfbf1'}}
                            />}
                            <Bar dataKey="count" fill={COLORS.dry} radius={[2, 2, 0, 0]} {...animationProps} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Pie Chart */}
        <div className={`bg-white p-6 rounded-xl border border-slate-100 flex flex-col items-center ${printMode ? 'break-inside-avoid' : ''}`}>
            <h3 className="text-slate-600 font-bold self-start mb-4">Lavar vs Secar</h3>
            <div className="w-full max-w-xs h-[250px] relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={100}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            {...animationProps}
                        >
                            <Cell key="wash" fill={COLORS.wash} />
                            <Cell key="dry" fill={COLORS.dry} />
                        </Pie>
                    </PieChart>
                 </ResponsiveContainer>
            </div>
            <div className="flex gap-8 mt-4">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${COLORS.bg}`}></div>
                    <span className={`${COLORS.primary} font-medium`}>Lavar: {stats.totalCycles > 0 ? ((stats.washCount / stats.totalCycles) * 100).toFixed(0) : 0}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3`} style={{backgroundColor: COLORS.dry}}></div>
                    <span className={`font-medium`} style={{color: COLORS.dry}}>Secar: {stats.totalCycles > 0 ? ((stats.dryCount / stats.totalCycles) * 100).toFixed(0) : 0}%</span>
                </div>
            </div>
        </div>

        {!printMode && (
            <div className="text-center text-xs text-slate-400 py-4">
                Modelo V3 — Lave & Pegue - Gerado automaticamente
            </div>
        )}

      </div>
    </div>
  );
};

const KpiCard: React.FC<{title: string; value: string | number; icon: React.ReactNode; subText: string; bgColor: string}> = ({
  title, value, icon, subText, bgColor
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between h-32 relative overflow-hidden">
    <div className="flex justify-between items-start z-10">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 rounded-md ${bgColor}`}>
            {icon}
        </div>
    </div>
    <div className="z-10">
        <div className="text-3xl font-extrabold text-slate-800">{value}</div>
        {subText && <div className="text-xs text-slate-400 mt-1">{subText}</div>}
    </div>
  </div>
);