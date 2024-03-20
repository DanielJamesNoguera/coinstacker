import React from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";

import Home from './pages/home'
import Nav from './components/nav'

function App() {
  const router = createBrowserRouter([
    { path: "/", element: <Home /> },
    { path: "*", element: <Navigate to="/404" replace /> }
  ]);

  return (
    <div>
      <Nav />
      <div className="mt-20">
        <RouterProvider router={router} />
      </div>
    </div>
    
  );
}

export default App;