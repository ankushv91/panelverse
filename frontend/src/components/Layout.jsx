import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex">
      <Navbar />
      <main className="w-full md:pl-64 pb-16 md:pb-0 flex flex-col min-h-screen relative">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
