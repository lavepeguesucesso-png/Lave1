import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, User, UserCog, CheckCircle2, Trash2 } from 'lucide-react';

interface FileUploadProps {
  onProcess: (files: { selfService: File | null; attendant: File | null }) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onProcess }) => {
  const [selfServiceFile, setSelfServiceFile] = useState<File | null>(null);
  const [attendantFile, setAttendantFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selfServiceInputRef = useRef<HTMLInputElement>(null);
  const attendantInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File, type: 'SELF_SERVICE' | 'ATTENDANT') => {
    setError(null);
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Por favor, envie apenas arquivos CSV.');
      return;
    }
    if (type === 'SELF_SERVICE') setSelfServiceFile(file);
    else setAttendantFile(file);
  };

  const removeFile = (type: 'SELF_SERVICE' | 'ATTENDANT') => {
    if (type === 'SELF_SERVICE') {
      setSelfServiceFile(null);
      if (selfServiceInputRef.current) selfServiceInputRef.current.value = '';
    } else {
      setAttendantFile(null);
      if (attendantInputRef.current) attendantInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!selfServiceFile && !attendantFile) {
      setError('Por favor, selecione pelo menos uma planilha.');
      return;
    }
    onProcess({ selfService: selfServiceFile, attendant: attendantFile });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lave & Pague Analytics</h1>
          <p className="text-slate-500">Importe as planilhas para gerar os relatórios individuais de cada serviço.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Self Service Box */}
          <UploadBox 
            title="Self-Service" 
            subtitle="Planilha de terminais automáticos"
            icon={<User className="w-8 h-8 text-pink-500" />}
            file={selfServiceFile}
            inputRef={selfServiceInputRef}
            onChange={(f) => handleFileChange(f, 'SELF_SERVICE')}
            onRemove={() => removeFile('SELF_SERVICE')}
            activeColor="border-pink-500 bg-pink-50"
          />

          {/* Attendant Box */}
          <UploadBox 
            title="Serviço de Atendente" 
            subtitle="Planilha do sistema de balcão"
            icon={<UserCog className="w-8 h-8 text-purple-500" />}
            file={attendantFile}
            inputRef={attendantInputRef}
            onChange={(f) => handleFileChange(f, 'ATTENDANT')}
            onRemove={() => removeFile('ATTENDANT')}
            activeColor="border-purple-500 bg-purple-50"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200 animate-in fade-in">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <button
            onClick={handleSubmit}
            disabled={!selfServiceFile && !attendantFile}
            className={`
              px-8 py-4 rounded-full font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95
              ${(!selfServiceFile && !attendantFile) 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-pink-200'}
            `}
          >
            Gerar Relatórios
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <FileText className="w-4 h-4" />
          <span>Formatos suportados: CSV (Exportação padrão do sistema)</span>
        </div>
      </div>
    </div>
  );
};

interface UploadBoxProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File) => void;
  onRemove: () => void;
  activeColor: string;
}

const UploadBox: React.FC<UploadBoxProps> = ({ 
  title, subtitle, icon, file, inputRef, onChange, onRemove, activeColor 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !file && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-xl p-8 h-64 transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center gap-3
        ${file ? 'border-slate-200 bg-white' : 'cursor-pointer'}
        ${!file && isDragging ? activeColor : 'border-slate-300 hover:bg-slate-50 bg-white'}
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
        className="hidden"
        accept=".csv"
      />

      {file ? (
        <div className="animate-in zoom-in duration-300">
          <div className="bg-green-50 p-4 rounded-full mb-2 mx-auto w-16 h-16 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <p className="font-semibold text-slate-800 truncate max-w-[200px] mx-auto">{file.name}</p>
          <p className="text-xs text-slate-500 mb-4">{(file.size / 1024).toFixed(1)} KB</p>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-red-500 text-sm hover:text-red-700 flex items-center justify-center gap-1 mx-auto px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Remover
          </button>
        </div>
      ) : (
        <>
          <div className="p-3 bg-slate-50 rounded-full mb-1">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-700">{title}</h3>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Clique ou arraste aqui
            </div>
          </div>
        </>
      )}
    </div>
  );
};
