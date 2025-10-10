// components/ProfileModal.tsx
import React, { useState, useRef } from 'react';
import Icon from './Icons';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAvatar: string;
    onSave: (newAvatarUrl: string) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentAvatar, onSave }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setError('A imagem é muito grande. O limite é de 2MB.');
                setPreview(null);
                return;
            }
            setError('');
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (preview) {
            onSave(preview);
            onClose();
            setPreview(null);
        }
    };

    const handleClose = () => {
        setPreview(null);
        setError('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={handleClose}>
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-display tracking-wider text-white mb-4">Alterar Foto de Perfil</h3>
                <div className="w-32 h-32 rounded-full mb-4 border-2 border-gray-600 overflow-hidden flex items-center justify-center">
                    <img src={preview || currentAvatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    <Icon name="Upload" className="w-5 h-5" />
                    Escolher Imagem
                </button>

                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                
                <div className="flex gap-4 mt-6 w-full">
                    <button onClick={handleClose} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!preview}
                        className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;