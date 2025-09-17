import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">🏛️ Gov Subsidy</h1>
                    <p className="text-gray-600">Create Your Account</p>
                </div>
                
                <form onSubmit={handleSignup} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Creating account...
                            </div>
                        ) : (
                            'Sign Up 🚀'
                        )}
                    </button>
                </form>
                
                <div className="mt-6 text-center">
                    <p className="text-gray-600">
                        Already have an account? 
                        <a href="/login" className="ml-1 text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors">
                            Login here
                        </a>
                    </p>
                </div>
                
                {message && (
                    <div className={`mt-4 p-3 rounded-lg ${
                        message.includes('Account created') 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                    }`}>
                        <p className={`text-center text-sm ${
                            message.includes('Account created') 
                                ? 'text-green-600' 
                                : 'text-red-600'
                        }`}>
                            {message}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
