import React, { useState, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { useAuth } from '../contexts/AuthContext';
import { 
  HomeIcon, 
  FolderIcon, 
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const NavLink = ({ item, isMobile = false }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        className={`flex items-center gap-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
          isActive 
            ? 'bg-gray-100 text-gray-900' 
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        } ${isMobile ? 'text-base' : ''}`}
        onClick={() => isMobile && setMobileMenuOpen(false)}
      >
        <item.icon className="h-5 w-5" />
        {item.name}
      </Link>
    );
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo and primary navigation */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <SparklesIcon className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">CodeEcho</span>
            </Link>
            
            {isAuthenticated && (
              <nav className="hidden md:ml-8 md:flex md:space-x-1">
                {navigation.map((item) => (
                  <NavLink key={item.name} item={item} />
                ))}
              </nav>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <>
                {/* Desktop user menu */}
                <div className="hidden md:block">
                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center text-sm text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full p-2">
                      <UserCircleIcon className="h-6 w-6" />
                      <span className="ml-2 font-medium">{user?.first_name || 'User'}</span>
                    </Menu.Button>
                    
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                          <p className="text-sm text-gray-500">{user?.email}</p>
                          {user?.role === 'admin' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                              Admin
                            </span>
                          )}
                        </div>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                            >
                              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>

                {/* Mobile menu button */}
                <button
                  type="button"
                  className="md:hidden ml-4 inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={setMobileMenuOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto relative w-screen max-w-sm">
                    <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                      <div className="px-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <SparklesIcon className="h-8 w-8 text-primary-600" />
                            <span className="ml-2 text-xl font-bold text-gray-900">CodeEcho</span>
                          </div>
                          <button
                            type="button"
                            className="rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <XMarkIcon className="h-6 w-6" />
                          </button>
                        </div>
                      </div>
                      
                      {isAuthenticated && (
                        <div className="relative mt-6 flex-1 px-4 sm:px-6">
                          <div className="pb-4 border-b border-gray-200">
                            <div className="flex items-center">
                              <UserCircleIcon className="h-10 w-10 text-gray-400" />
                              <div className="ml-3">
                                <p className="text-base font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                                <p className="text-sm text-gray-500">{user?.email}</p>
                              </div>
                            </div>
                          </div>
                          
                          <nav className="mt-6 space-y-1">
                            {navigation.map((item) => (
                              <NavLink key={item.name} item={item} isMobile />
                            ))}
                          </nav>
                          
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <button
                              onClick={handleLogout}
                              className="flex w-full items-center px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-md"
                            >
                              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                              Sign out
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </header>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
    </div>
  );
};

export default Layout;