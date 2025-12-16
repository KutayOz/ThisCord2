import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, Compass } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { serversApi } from '../../api/servers';

export function ServerSidebar() {
  const navigate = useNavigate();
  const { 
    servers, 
    selectedServerId, 
    setServers, 
    selectServer,
    setShowCreateServer,
    setShowJoinServer 
  } = useAppStore();

  useEffect(() => {
    const loadServers = async () => {
      try {
        const data = await serversApi.getMyServers();
        setServers(data);
      } catch (error) {
        console.error('Failed to load servers:', error);
      }
    };
    loadServers();
  }, [setServers]);

  const handleServerClick = (serverId: string) => {
    selectServer(serverId);
    navigate(`/channels/${serverId}`);
  };

  const handleHomeClick = () => {
    selectServer(null);
    navigate('/channels/@me');
  };

  return (
    <div className="w-[72px] bg-discord-bg-tertiary flex flex-col items-center py-3 gap-2 overflow-y-auto scrollbar-hide">
      {/* Home Button */}
      <button
        onClick={handleHomeClick}
        className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center ${
          selectedServerId === null
            ? 'bg-discord-blurple rounded-[16px]'
            : 'bg-discord-bg-primary hover:bg-discord-blurple'
        }`}
      >
        <Home className="w-6 h-6 text-white" />
      </button>

      {/* Separator */}
      <div className="w-8 h-0.5 bg-discord-bg-modifier-active rounded-full" />

      {/* Server List */}
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => handleServerClick(server.id)}
          className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center relative group ${
            selectedServerId === server.id
              ? 'rounded-[16px]'
              : ''
          }`}
          title={server.name}
        >
          {/* Selection Indicator */}
          <span
            className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
              selectedServerId === server.id
                ? 'h-10'
                : 'h-0 group-hover:h-5'
            }`}
            style={{ transform: 'translateX(-8px)' }}
          />
          
          {server.iconUrl ? (
            <img
              src={server.iconUrl}
              alt={server.name}
              className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 object-cover ${
                selectedServerId === server.id ? 'rounded-[16px]' : ''
              }`}
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-discord-bg-primary hover:bg-discord-blurple flex items-center justify-center text-white font-medium ${
                selectedServerId === server.id
                  ? 'bg-discord-blurple rounded-[16px]'
                  : ''
              }`}
            >
              {server.name.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      ))}

      {/* Add Server Button */}
      <button
        onClick={() => setShowCreateServer(true)}
        className="w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-discord-bg-primary hover:bg-discord-green flex items-center justify-center group"
        title="Add a Server"
      >
        <Plus className="w-6 h-6 text-discord-green group-hover:text-white transition-colors" />
      </button>

      {/* Explore Button */}
      <button
        onClick={() => setShowJoinServer(true)}
        className="w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-discord-bg-primary hover:bg-discord-green flex items-center justify-center group"
        title="Join a Server"
      >
        <Compass className="w-6 h-6 text-discord-green group-hover:text-white transition-colors" />
      </button>
    </div>
  );
}
