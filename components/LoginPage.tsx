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
            setError('Senha incorreta. Tente novamente.');
        }
    };
    
    const clearSession = () => {
        sessionStorage.clear();
        window.location.reload();
    }

    return (
        <div className="min-h-screen bg-darker flex items-center justify-center font-sans p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-dark border border-gray-800 rounded-lg shadow-2xl shadow-brand-red/10 p-8">
                    <div className="text-center mb-8">
                        <Icon name="Lock" className="w-8 h-8 mx-auto mb-4 text-brand-red" />
                        <h1 className="text-3xl font-display tracking-wider text-white">Acesso Restrito</h1>
                        <p className="text-gray-400 mt-2">Entre com seu nome e senha numérica.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="user" className="text-sm font-medium text-gray-400">Usuário</label>
                            <div className="relative mt-2">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Icon name="User" className="w-5 h-5 text-gray-500" />
                                </span>
                                <select
                                    id="user"
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                                >
                                    {users.map(user => (
                                        <option key={user.name} value={user.name}>{user.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password-input" className="text-sm font-medium text-gray-400">Senha (4 dígitos)</label>
                            <input
                                id="password-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                maxLength={4}
                                pattern="\d{4}"
                                title="A senha deve conter 4 dígitos numéricos."
                                required
                                className="w-full mt-2 p-2 bg-gray-900 border border-gray-700 rounded-md text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-brand-red focus:border-brand-red transition"
                                placeholder="----"
                            />
                        </div>

                        {error && <p className="text-sm text-center text-red-400">{error}</p>}

                        <button type="submit" className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105">
                            Entrar
                        </button>
                    </form>
                    
                    <div className="text-center mt-6">
                        <button onClick={clearSession} className="text-xs text-gray-500 hover:text-gray-300">Limpar sessão</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;