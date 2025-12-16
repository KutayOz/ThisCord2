import { useState } from 'react';
import { X, User, Shield, Palette, LogOut, Camera } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { PresenceStatus } from '../../types';

type SettingsTab = 'profile' | 'account' | 'appearance';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  
  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState<PresenceStatus>(user?.status || PresenceStatus.Online);
  
  // Account state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Appearance state
  const [messageDisplay, setMessageDisplay] = useState<'cozy' | 'compact'>('cozy');
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      // TODO: Call API to update profile
      // await usersApi.updateProfile({ displayName, bio });
      // await usersApi.updateStatus({ status });
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      // TODO: Call API to change password
      // await authApi.changePassword({ currentPassword, newPassword });
      
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const statusOptions = [
    { value: PresenceStatus.Online, label: 'Online', color: 'bg-discord-green' },
    { value: PresenceStatus.Away, label: 'Away', color: 'bg-discord-yellow' },
    { value: PresenceStatus.DoNotDisturb, label: 'Do Not Disturb', color: 'bg-discord-red' },
    { value: PresenceStatus.Invisible, label: 'Invisible', color: 'bg-gray-500' },
  ];

  const tabs = [
    { id: 'profile' as const, label: 'My Profile', icon: User },
    { id: 'account' as const, label: 'Account', icon: Shield },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-discord-bg-primary rounded-lg w-full max-w-4xl h-[600px] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-discord-bg-secondary flex flex-col">
          <div className="p-4 flex-1">
            <h3 className="text-xs font-bold uppercase text-discord-text-muted px-2 mb-2">
              User Settings
            </h3>
            <nav className="space-y-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 rounded text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-discord-bg-modifier-selected text-white'
                      : 'text-discord-interactive-normal hover:text-discord-interactive-hover hover:bg-discord-bg-modifier-hover'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
              
              <div className="border-t border-discord-bg-modifier-accent my-2" />
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-2 py-1.5 rounded text-sm text-discord-red hover:bg-discord-red/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-discord-bg-modifier-accent">
            <h2 className="text-xl font-bold text-white">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <button
              onClick={onClose}
              className="text-discord-interactive-normal hover:text-discord-interactive-hover p-1 rounded hover:bg-discord-bg-modifier-hover"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {message && (
              <div className={`mb-4 p-3 rounded ${
                message.type === 'success' 
                  ? 'bg-discord-green/10 border border-discord-green text-discord-green' 
                  : 'bg-discord-red/10 border border-discord-red text-discord-red'
              }`}>
                {message.text}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-start gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-discord-blurple flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user?.username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <button className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{user?.username}</h3>
                    <p className="text-discord-text-muted text-sm">#{user?.id?.slice(0, 4)}</p>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How others see you"
                    className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
                    About Me
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself"
                    rows={4}
                    maxLength={190}
                    className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple resize-none"
                  />
                  <p className="text-xs text-discord-text-muted mt-1">{bio.length}/190</p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setStatus(option.value)}
                        className={`flex items-center gap-3 p-3 rounded transition-colors ${
                          status === option.value
                            ? 'bg-discord-bg-modifier-selected'
                            : 'bg-discord-bg-tertiary hover:bg-discord-bg-modifier-hover'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${option.color}`} />
                        <span className="text-discord-text-normal text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-discord-blurple hover:bg-discord-blurple-hover text-white font-medium px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                {/* Email */}
                <div className="bg-discord-bg-secondary rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-discord-text-muted mb-1">Email</h4>
                      <p className="text-discord-text-normal">{user?.email || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div className="bg-discord-bg-secondary rounded-lg p-4">
                  <h4 className="text-sm font-bold text-white mb-4">Change Password</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
                      />
                    </div>
                    <button
                      onClick={handleChangePassword}
                      disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                      className="bg-discord-blurple hover:bg-discord-blurple-hover text-white font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-discord-bg-secondary rounded-lg p-4 border border-discord-red/30">
                  <h4 className="text-sm font-bold text-discord-red mb-2">Danger Zone</h4>
                  <p className="text-discord-text-muted text-sm mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button className="bg-discord-red hover:bg-red-600 text-white font-medium px-4 py-2 rounded transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                {/* Message Display */}
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">Message Display</h4>
                  <p className="text-discord-text-muted text-sm mb-4">
                    Choose how messages are displayed in chat.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setMessageDisplay('cozy')}
                      className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                        messageDisplay === 'cozy'
                          ? 'border-discord-blurple bg-discord-blurple/10'
                          : 'border-discord-bg-modifier-accent bg-discord-bg-secondary hover:border-discord-bg-modifier-hover'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-discord-blurple flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">Username</span>
                            <span className="text-xs text-discord-text-muted">Today at 12:00 PM</span>
                          </div>
                          <p className="text-discord-text-normal text-sm">This is a cozy message with avatar displayed.</p>
                        </div>
                      </div>
                      <p className="text-xs text-discord-text-muted mt-2">Cozy - Shows avatar with each message</p>
                    </button>

                    <button
                      onClick={() => setMessageDisplay('compact')}
                      className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                        messageDisplay === 'compact'
                          ? 'border-discord-blurple bg-discord-blurple/10'
                          : 'border-discord-bg-modifier-accent bg-discord-bg-secondary hover:border-discord-bg-modifier-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-discord-text-muted">12:00 PM</span>
                        <span className="font-semibold text-white">Username</span>
                        <span className="text-discord-text-normal text-sm">This is a compact message.</span>
                      </div>
                      <p className="text-xs text-discord-text-muted mt-2">Compact - Hides avatars for a denser view</p>
                    </button>
                  </div>
                </div>

                {/* Theme Preview */}
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">Theme</h4>
                  <p className="text-discord-text-muted text-sm mb-4">
                    Currently using the dark theme.
                  </p>
                  <div className="flex gap-4">
                    <div className="w-20 h-14 rounded-lg bg-discord-bg-primary border-2 border-discord-blurple flex items-center justify-center">
                      <span className="text-xs text-white">Dark</span>
                    </div>
                    <div className="w-20 h-14 rounded-lg bg-white border-2 border-gray-300 flex items-center justify-center opacity-50 cursor-not-allowed">
                      <span className="text-xs text-gray-500">Light</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
