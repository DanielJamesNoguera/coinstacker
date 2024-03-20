import React from 'react';
import { Link } from 'react-router-dom';

const Nav = () => {
  return (
    <nav className="fixed top-0 w-full flex items-center">
      <div className="flex items-center gap-2 mx-8 mt-5 px-8 py-4 border-2 border-white rounded-xl bg-black w-full">
        <i className="fas fa-coins text-yellow-300 text-3xl"></i>
        <h3 className="text-white font-bold text-2xl">Coinstacker</h3>
      </div>
    </nav>
  );
}

export default Nav;