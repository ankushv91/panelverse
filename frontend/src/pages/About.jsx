import React from 'react';

const About = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-white">About PanelVerse</h1>
      
      <div className="bg-zinc-800/50 p-8 rounded-2xl border border-zinc-700/50 space-y-6">
        <p className="text-zinc-300 text-lg leading-relaxed">
          Welcome to PanelVerse, your ultimate destination for discovering and reading the best comics online.
        </p>
        
        <p className="text-zinc-400 leading-relaxed">
          Our platform is designed to provide a sleek, uninterrupted reading experience whether you are on your desktop or mobile device. 
          Create an account to bookmark your favorite series, track your reading progress, and interact with the community.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-zinc-700">
          <div>
            <h3 className="text-xl font-semibold text-indigo-400 mb-2">For Readers</h3>
            <p className="text-zinc-400 text-sm">Discover new worlds, enjoy high-quality artwork, and stay up to date with your favorite series.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-indigo-400 mb-2">For Creators</h3>
            <p className="text-zinc-400 text-sm">Publish your own comics, reach a global audience, and manage your content with our dedicated author tools.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
