import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ListTodo,
  Repeat,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import './Layout.css';

const Layout = () => {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
    { to: '/tasks', icon: ListTodo, label: 'タスク一覧' },
    { to: '/routines', icon: Repeat, label: 'ルーティン' },
    { to: '/settings', icon: Settings, label: '設定' },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-button" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <h1 className="app-title">Task Manager</h1>
        {user?.picture && (
          <img src={user.picture} alt={user.name} className="user-avatar-small" />
        )}
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">📋 Task Manager</h1>
          <button className="close-button" onClick={closeSidebar}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              {user.picture && (
                <img src={user.picture} alt={user.name} className="user-avatar" />
              )}
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          )}
          <button className="sign-out-button" onClick={signOut}>
            <LogOut size={18} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav">
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
