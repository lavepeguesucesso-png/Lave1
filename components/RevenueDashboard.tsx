import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line
} from 'recharts';
import { Transaction, PrintProps } from '../types';
import { DollarSign, TrendingUp, CreditCard, Wallet, CalendarCheck } from 'lucide-react';

interface RevenueDashboardProps extends PrintProps {
  selfServiceTransactions: Transaction[];
  attendantTransactions: Transaction[];
}

const COLORS = {
  self: '#ec4899',      // Pink
  attendant: '#9333ea', // Purple
  total: '#10b981',     // Emerald
  gold: '#f59e0b',      // Amber
};

export const RevenueDashboard: React.FC<RevenueDashboardProps> = ({ 
  selfServiceTransactions, 
  attendantTransactions,
  printMode = false
}) => {

  const stats = useMemo(() => {
    const selfTotal = selfServiceTransactions.reduce((sum, t) => sum + t.amount, 0);
    const attendantTotal = attendantTransactions.reduce((sum, t) => sum + t.amount, 0);
    const grandTotal = selfTotal + attendantTotal;
    
    const selfCount = selfServiceTransactions.length;
    const attendantCount = attendantTransactions.length;
    const totalCount = selfCount + attendantCount;

    const selfTicket = selfCount > 0 ? selfTotal / selfCount : 0;
    const attendantTicket = attendantCount > 0 ? attendantTotal / attendantCount : 0;
    const avgTicket = totalCount > 0 ? grandTotal / totalCount : 0;

    // Daily Aggregation
    const dailyMap = new Map<string, { date: string, self: number, attendant: number, total: number, rawDate: Date }>();
    const allTransactions = [...selfServiceTransactions, ...attendantTransactions];
    
    allTransactions.forEach(t => {
        if (!dailyMap.has(t.rawDate)) {
            dailyMap.set(t.rawDate, { 
                date: t.rawDate.substring(0, 5), // dd/mm
                rawDate: t.date,
                self: 0, 
                attendant: 0, 
                total: 0 
            });
        }
        const day = dailyMap.get(t.rawDate)!;
        day.total += t.amount;
        if (selfServiceTransactions.includes(t)) {
            day.self += t.amount;
        } else {
            day.attendant += t.amount;
        }
    });

    const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    // Cumulative Data
    let runningTotal = 0;
    const cumulativeData = dailyData.map(day => {
        runningTotal += day.total;
        return { ...day, cumulative: runningTotal };
    });

    // Hourly Revenue Power
    const hourlyRevenue = new Array(24).fill(0).map((_, i) => ({ hour: `${i}h`, revenue: 0 }));
    allTransactions.forEach(t => {
        const h = t.date.getHours();
        if(h >= 0 && h < 24) hourlyRevenue[h].revenue += t.amount;
    });

    return {
        selfTotal,
        attendantTotal,
        grandTotal,
        selfTicket,
        attendantTicket,
        avgTicket,
        dailyData,
        cumulativeData,
        hourlyRevenue
    };
  }, [selfServiceTransactions, attendantTransactions]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const animationProps = { isAnimationActive: !printMode };

  return (
    <div className={`max-w-6xl mx-auto ${printMode ? 'px-0 py-4' : 'px-4 py-6 space-y-8 pb-20'}`}>
      
      {/* Header */}
      <div className={`bg-white border-2 border-emerald-100 rounded-lg p-4 flex items-center gap-3 shadow-sm ${printMode ? 'mb-6' : ''}`}>
        <div className="p-2 bg-emerald-50 rounded-full">
            <DollarSign className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
            <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">
                Painel Financeiro
            </h1>
            <p className="text-sm text-slate-500">Análise de faturamento, ticket médio e tendências</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${printMode ? 'mb-6' : ''}`}>
        <FinancialCard 
            title="Faturamento Total" 
            value={formatCurrency(stats.grandTotal)} 
            icon={<Wallet className="w-5 h-5 text-emerald-600" />}
            color="bg-emerald-50 border-emerald-200 text-emerald-900"
        />
        <FinancialCard 
            title="Receita Self-Service" 
            value={formatCurrency(stats.selfTotal)} 
            icon={<CreditCard className="w-5 h-5 text-pink-600" />}
            color="bg-pink-50 border-pink-200 text-pink-900"
            subtext={`${((stats.selfTotal / (stats.grandTotal || 1)) * 100).toFixed(1)}% do total`}
        />
        <FinancialCard 
            title="Receita Atendente" 
            value={formatCurrency(stats.attendantTotal)} 
            icon={<CreditCard className="w-5 h-5 text-purple-600" />}
            color="bg-purple-50 border-purple-200 text-purple-900"
            subtext={`${((stats.attendantTotal / (stats.grandTotal || 1)) * 100).toFixed(1)}% do total`}
        />
        <FinancialCard 
            title="Ticket Médio Geral" 
            value={formatCurrency(stats.avgTicket)} 
            icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
            color="bg-amber-50 border-amber-200 text-amber-900"
            subtext={`Self: ${formatCurrency(stats.selfTicket)} | Atend: ${formatCurrency(stats.attendantTicket)}`}
        />
      </div>

      {/* Main Charts Row */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${printMode ? 'mb-6 break-inside-avoid' : ''}`}>
        
        {/* Daily Revenue Stacked Bar */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-slate-400" />
                    Faturamento Diário
                </h3>
            </div>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dailyData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                        {!printMode && <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}}
                        />}
                        <Legend />
                        <Bar dataKey="self" name="Self Service" stackId="a" fill={COLORS.self} radius={[0,0,0,0]} {...animationProps} />
                        <Bar dataKey="attendant" name="Atendente" stackId="a" fill={COLORS.attendant} radius={[4,4,0,0]} {...animationProps} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Composition Pie */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-700 mb-2">Composição da Receita</h3>
            <p className="text-xs text-slate-400 mb-6">Divisão do faturamento bruto por canal</p>
            <div className="flex-1 min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={[
                                { name: 'Self Service', value: stats.selfTotal },
                                { name: 'Atendente', value: stats.attendantTotal }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            {...animationProps}
                        >
                            <Cell key="self" fill={COLORS.self} />
                            <Cell key="attendant" fill={COLORS.attendant} />
                        </Pie>
                        {!printMode && <Tooltip formatter={(value: number) => formatCurrency(value)} />}
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-xs text-slate-400 font-medium">Total</span>
                    <span className="text-sm font-bold text-slate-700">{formatCurrency(stats.grandTotal)}</span>
                </div>
            </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${printMode ? 'mb-6 break-inside-avoid' : ''}`}>
        
        {/* Cumulative Trend */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-700 mb-6">Evolução Acumulada (Mês)</h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.cumulativeData}>
                        <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.total} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={COLORS.total} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        {!printMode && <Tooltip 
                            formatter={(value: number) => formatCurrency(value)} 
                            labelFormatter={(label) => `Dia ${label}`}
                            contentStyle={{borderRadius: '8px'}}
                        />}
                        <Area type="monotone" dataKey="cumulative" name="Acumulado" stroke={COLORS.total} fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3} {...animationProps} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Hourly Revenue */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-700 mb-6">Volume Financeiro por Horário</h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.hourlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="hour" tick={{fontSize: 11}} axisLine={false} tickLine={false} interval={2} />
                        <YAxis hide />
                        {!printMode && <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{borderRadius: '8px'}}
                        />}
                        <Line type="monotone" dataKey="revenue" name="Faturamento" stroke={COLORS.gold} strokeWidth={3} dot={{r:3, fill:COLORS.gold}} {...animationProps} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};

const FinancialCard: React.FC<{
    title: string; 
    value: string; 
    icon: React.ReactNode; 
    color: string;
    subtext?: string;
}> = ({ title, value, icon, color, subtext }) => (
    <div className={`rounded-xl p-5 border flex flex-col justify-between h-32 ${color.split(' ')[0]} ${color.split(' ')[1]}`}>
        <div className="flex justify-between items-start">
            <span className={`text-xs font-bold uppercase tracking-wider opacity-70 ${color.split(' ')[2]}`}>{title}</span>
            <div className="bg-white/50 p-1.5 rounded-md">
                {icon}
            </div>
        </div>
        <div>
            <div className={`text-2xl font-extrabold ${color.split(' ')[2]}`}>{value}</div>
            {subtext && <div className="text-xs opacity-70 mt-1 font-medium">{subtext}</div>}
        </div>
    </div>
);