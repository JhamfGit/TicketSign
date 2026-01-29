import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const icons = {
        success: <CheckCircle className="text-green-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
    };

    const bgColors = {
        success: 'bg-green-500/10 border-green-500/20',
        error: 'bg-red-500/10 border-red-500/20',
        info: 'bg-blue-500/10 border-blue-500/20',
    };

    return (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] min-w-[300px] p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-8 duration-300 ${bgColors[type]}`}>
            <div className="flex items-center gap-3">
                {icons[type]}
                <span className="text-sm font-bold text-white tracking-wide">{message}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full text-slate-500 transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
