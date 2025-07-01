import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('Creating account...');
        
        try {
            console.log('Attempting signup with:', { email });
            
            const { data, error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login`
                }
            });
            
            console.log('Signup response:', { data, error });
            
            if (error) {
                console.error('Signup error:', error);
                setMessage(`Error: ${error.message}`);
                return;
            }
            
            if (data.user) {
                setMessage('Account created! Check your email to confirm sign-up.');
            }
        } catch (err) {
            console.error('Catch error:', err);
            setMessage(`Unexpected error: ${err}`);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <form onSubmit={handleSignup} className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl font-bold mb-4 text-center">Sign Up</h2>
                <input
                    className="w-full mb-4 p-2 border rounded"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    className="w-full mb-4 p-2 border rounded"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                    Sign Up
                </button>
                {message && <p className="mt-4 text-center text-sm text-red-600">{message}</p>}
            </form>
        </div>
    );
}
