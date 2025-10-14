import React, { useState } from 'react';
import { users } from '../data';
import type { User } from '../types';
import Icon from './Icons';

interface LoginPageProps {
    onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [selectedUser, setSelectedUser] = useState<string>(users[0].name);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.name === selectedUser);
        if (user && user.password === password) {
            setError('');
            onLogin(user);
        } else {
            setError('ACESSO NEGADO: Senha inválida.');
        }
    };
    
    const clearSession = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    }

    return (
        <div className="min-h-screen bg-darker flex items-center justify-center font-mono p-4">
            <div className="w-full max-w-lg mx-auto">
                <div className="bg-dark/50 backdrop-blur-sm border border-brand-red/30 rounded-lg shadow-2xl shadow-brand-red/20 p-8 animate-fade-in">
                    <div className="text-center mb-8">
                        <h1 className="text-5xl font-display tracking-[0.2em] text-white relative inline-block animate-text-glitch" style={{ animationDelay: '0.2s' }}>
                            ARC<span className="text-brand-red">7</span>HIVE
                        </h1>
                        <p className="text-brand-red mt-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>// AUTENTICAÇÃO NECESSÁRIA</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                        <div>
                            <label htmlFor="user" className="text-sm font-medium text-gray-400 flex items-center">
                                <span className="text-brand-red mr-2">&gt;</span> Selecionar Agente:
                            </label>
                            <div className="relative mt-2">
                                <select
                                    id="user"
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full appearance-none pl-4 pr-10 py-2 bg-dark/80 border border-gray-700 rounded-md text-white focus:ring-1 focus:ring-brand-red focus:border-brand-red transition"
                                >
                                    {users.map(user => (
                                        <option key={user.name} value={user.name}>{user.name}</option>
                                    ))}
                                </select>
                                <Icon name="ChevronLeft" className="w-5 h-5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 transform rotate-[-90deg] pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password-input" className="text-sm font-medium text-gray-400 flex items-center">
                                <span className="text-brand-red mr-2">&gt;</span> Inserir Senha (4 dígitos):
                            </label>
                            <div className="relative mt-2">
                                <input
                                    id="password-input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    maxLength={4}
                                    pattern="[0-9]{4}"
                                    title="A senha deve conter 4 dígitos numéricos."
                                    required
                                    className="w-full p-2 bg-dark/80 border border-gray-700 rounded-md text-center text-2xl tracking-[0.5em] focus:ring-1 focus:ring-brand-red focus:border-brand-red transition font-mono"
                                    placeholder="----"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-1 bg-brand-red animate-blinking-cursor"></span>
                            </div>
                        </div>

                        {error && <p className="text-sm text-center text-red-400 font-mono animate-fast-fade-in">{error}</p>}

                        <button type="submit" className="w-full bg-brand-red/80 hover:bg-brand-red text-white font-bold py-3 px-4 rounded-md transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-brand-red/30 border border-brand-red">
                            [ EXECUTAR LOGIN ]
                        </button>
                    </form>
                    
                    <div className="text-center mt-6">
                        <button onClick={clearSession} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">// Limpar sessão</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;