import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Handle email confirmation
        const handleAuthCallback = async () => {
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
                setMessage(`Authentication error: ${error.message}`);
                return;
            }
            
            if (data.session) {
                // User is confirmed, fetch profile and redirect
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', data.session.user.id)
                    .single();
                
                if (profileError) {
                    console.error('Profile fetch error in callback:', profileError);
                    setMessage('Unable to determine user role. Please try again.');
                    return;
                }
                
                // Handle both boolean and string values for is_admin
                const isAdmin = profile?.is_admin === true || String(profile?.is_admin) === 'true';
                
                if (isAdmin) {
                    navigate('/admin');
                } else {
                    navigate('/citizen');
                }
            }
        };

        // Check if this is a callback from email confirmation
        if (window.location.hash) {
            handleAuthCallback();
        }
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ 
                email, 
                password
            });

            if (error) {
                setMessage(error.message);
                return;
            }

        // Fetch role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            setMessage('Unable to determine user role. Please try again.');
            return;
        }

        console.log('Profile data:', profile);
        
        // Handle both boolean and string values for is_admin
        const isAdmin = profile?.is_admin === true || String(profile?.is_admin) === 'true';
        
        console.log('Is admin:', isAdmin, 'Raw value:', profile?.is_admin);

            if (isAdmin) {
                navigate('/admin');
            } else {
                navigate('/citizen');
            }
        } catch (err) {
            console.error('Login error:', err);
            setMessage('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">🏛️ Gov Subsidy</h1>
                    <p className="text-gray-600">AI-Powered Distribution Platform</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-6">
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

                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                            Remember me
                        </label>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Signing in...
                            </div>
                        ) : (
                            'Login 🚀'
                        )}
                    </button>
                </form>
                
                <div className="mt-6 text-center">
                    <p className="text-gray-600">
                        Don't have an account? 
                        <a href="/signup" className="ml-1 text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors">
                            Sign up here
                        </a>
                    </p>
                </div>
                
                {message && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-center text-sm text-red-600">{message}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
