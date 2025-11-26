import React, { useState } from 'react';
import { X, FileText, CheckSquare, Square } from 'lucide-react';
import { ExportOptions } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  hasSelfService: boolean;
  hasAttendant: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, onClose, onExport, hasSelfService, hasAttendant 
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    includeSelf: hasSelfService,
    includeAttendant: hasAttendant,
    includeComparative: hasSelfService && hasAttendant,
    includeFinancial: hasSelfService && hasAttendant
  });

  if (!isOpen) return null;

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const OptionRow = ({ 
    id, 
    label, 
    checked, 
    disabled = false 
  }: { id: keyof ExportOptions, label: string, checked: boolean, disabled?: boolean }) => (
    <div 
      onClick={() => !disabled && toggleOption(id)}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
        ${disabled ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 
          checked ? 'bg-blue-50 border-blue-200 text-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'}
      `}
    >
      {checked ? 
        <CheckSquare className={`w-5 h-5 ${disabled ? 'text-slate-400' : 'text-blue-600'}`} /> : 
        <Square className="w-5 h-5 text-slate-300" />
      }
      <span className="font-medium">{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6 animate-in zoom-in-95">
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">Exportar Relatório PDF</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500">
          Selecione os módulos que deseja incluir no arquivo PDF.
        </p>

        <div className="space-y-3">
          <OptionRow 
            id="includeSelf" 
            label="Relatório Self-Service" 
            checked={options.includeSelf} 
            disabled={!hasSelfService} 
          />
          <OptionRow 
            id="includeAttendant" 
            label="Relatório Atendente" 
            checked={options.includeAttendant} 
            disabled={!hasAttendant} 
          />
          <OptionRow 
            id="includeComparative" 
            label="Análise Comparativa" 
            checked={options.includeComparative} 
            disabled={!(hasSelfService && hasAttendant)} 
          />
          <OptionRow 
            id="includeFinancial" 
            label="Painel Financeiro" 
            checked={options.includeFinancial} 
            disabled={!(hasSelfService || hasAttendant)} 
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onExport(options)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            Gerar PDF
          </button>
        </div>

      </div>
    </div>
  );
};