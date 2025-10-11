// components/ProfileModal.tsx
import React, { useState, useEffect } from 'react';
import Icon from './Icons';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAvatar: string;
    onSave: (newAvatarUrl: string) => void;
    installPrompt: Event | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentAvatar, onSave, installPrompt }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [showIosInstallMessage, setShowIosInstallMessage] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
        // @ts-ignore: 'standalone' is a non-standard property on navigator for PWA detection
        const isInStandaloneMode = () => 'standalone' in window.navigator && window.navigator.standalone;
        
        if (isIos() && !isInStandaloneMode()) {
            setShowIosInstallMessage(true);
        }
    }, []);

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
        }
        handleClose();
    };

    const handleClose = () => {
        setPreview(null);
        setError('');
        onClose();
    };

    const handleInstallClick = async () => {
        if (!installPrompt) return;
        // @ts-ignore: The 'prompt' method exists on the event from 'beforeinstallprompt'
        installPrompt.prompt();
        // @ts-ignore: The 'userChoice' property exists on the event
        const { outcome } = await installPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // The prompt can only be used once.
        onClose(); 
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={handleClose}>
            <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-display tracking-wider text-white mb-4">Seu Perfil</h3>
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
                        className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        Salvar
                    </button>
                </div>

                {/* PWA Install Button */}
                <div className="mt-6 pt-6 border-t border-gray-700 w-full">
                    {installPrompt && (
                        <button
                            onClick={handleInstallClick}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors"
                        >
                            <Icon name="Download" className="w-5 h-5" />
                            Instalar Aplicativo
                        </button>
                    )}
                    {showIosInstallMessage && !installPrompt && (
                        <div className="text-center text-sm text-gray-400 p-3 bg-gray-800/50 rounded-md">
                            Para instalar no iPhone, toque no ícone de Compartilhar <Icon name="Share" className="w-4 h-4 inline-block -mt-1" /> e selecione "Adicionar à Tela de Início".
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;