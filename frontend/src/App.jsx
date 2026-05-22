import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Auth from './pages/Auth';
import About from './pages/About';
import ComicDetails from './pages/ComicDetails';
import ComicReader from './pages/ComicReader';
import Dashboard from './pages/Dashboard';
import CreatorDashboard from './pages/CreatorDashboard';
import AuthorRegistration from './pages/AuthorRegistration';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/about" element={<About />} />
          <Route path="/comic/:id" element={<ComicDetails />} />
          <Route path="/comics/:id" element={<ComicDetails />} />
          <Route path="/read/:chapterId" element={<ComicReader />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/creator-dashboard" element={<CreatorDashboard />} />
          <Route path="/author-registration" element={<AuthorRegistration />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
