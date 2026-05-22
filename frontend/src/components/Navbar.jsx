import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Compass, LayoutDashboard, Info, LogIn, LogOut } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(!!localStorage.getItem('token'));

  // Listen to storage events and a custom event to update token state without a full React context
  useEffect(() => {
    const checkToken = () => setHasToken(!!localStorage.getItem('token'));
    window.addEventListener('storage', checkToken);
    return () => window.removeEventListener('storage', checkToken);
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    setHasToken(false);
    navigate('/');
  };

  const mainNavItems = [
    { to: '/', icon: <Compass size={24} />, label: 'Discover' },
    { to: '/dashboard', icon: <LayoutDashboard size={24} />, label: 'Dashboard' },
    { to: '/about', icon: <Info size={24} />, label: 'About' },
  ];

  const authItem = hasToken 
    ? { to: '#', icon: <LogOut size={24} />, label: 'Logout', onClick: handleLogout }
    : { to: '/auth', icon: <LogIn size={24} />, label: 'Login' };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen bg-zinc-950 text-slate-300 border-r border-zinc-800 fixed left-0 top-0 z-40">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">
            PV
          </div>
          <h1 className="text-xl font-black tracking-wider text-white">PANELVERSE</h1>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 font-semibold shadow-[inset_0px_0px_20px_rgba(79,70,229,0.15)] border border-indigo-500/20'
                    : 'hover:bg-zinc-900 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          {hasToken ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 text-zinc-400"
            >
              <LogOut size={24} />
              <span>Logout</span>
            </button>
          ) : (
            <NavLink
              to="/auth"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 font-semibold shadow-[inset_0px_0px_20px_rgba(79,70,229,0.15)] border border-indigo-500/20'
                    : 'hover:bg-zinc-900 hover:text-white'
                }`
              }
            >
              <LogIn size={24} />
              <span>Login</span>
            </NavLink>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 flex justify-around items-center md:hidden z-50 border-t border-zinc-800 pb-safe">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
              }`
            }
          >
            {React.cloneElement(item.icon, { size: 20 })}
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
        {/* Auth Mobile Item */}
        {hasToken ? (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-zinc-500 hover:text-red-400"
          >
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        ) : (
          <NavLink
            to="/auth"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
              }`
            }
          >
            <LogIn size={20} />
            <span className="text-[10px] font-medium">Login</span>
          </NavLink>
        )}
      </nav>
    </>
  );
};

export default Navbar;
